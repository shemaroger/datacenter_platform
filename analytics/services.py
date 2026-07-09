import statistics
from datetime import timedelta

from django.utils import timezone

from monitoring.models import MetricSnapshot
from .models import AnomalyDetection, PredictiveInsight, PerformanceTrend

METRICS = ['cpu_usage', 'memory_usage', 'disk_usage']

# Minimum history required before we trust a z-score, and how far back to look.
MIN_HISTORY   = 10
HISTORY_LIMIT = 50
Z_SCORE_WARN     = 2.0
Z_SCORE_HIGH     = 3.0
Z_SCORE_CRITICAL = 4.0

# A metric that barely moves (e.g. stdev of 0.05%) produces enormous z-scores
# for perfectly normal noise. Require a minimum real-world swing too, so a
# flat metric ticking by a fraction of a percent never counts as an anomaly.
MIN_ABS_DEVIATION = 3.0


def _severity_for_zscore(z):
    if z >= Z_SCORE_CRITICAL:
        return AnomalyDetection.Severity.CRITICAL
    if z >= Z_SCORE_HIGH:
        return AnomalyDetection.Severity.HIGH
    if z >= Z_SCORE_WARN:
        return AnomalyDetection.Severity.MEDIUM
    return AnomalyDetection.Severity.LOW


def detect_anomalies(snapshot):
    """Statistical (z-score) anomaly detection: compares the new snapshot's
    metric values against the recent historical distribution for that server.
    Returns the list of AnomalyDetection rows created."""
    server = snapshot.server
    history_qs = MetricSnapshot.objects.filter(server=server).exclude(pk=snapshot.pk).order_by('-timestamp')[:HISTORY_LIMIT]
    history = list(history_qs)

    if len(history) < MIN_HISTORY:
        return []

    created = []
    for metric in METRICS:
        values = [getattr(h, metric) for h in history if getattr(h, metric) is not None]
        if len(values) < MIN_HISTORY:
            continue

        current = getattr(snapshot, metric)
        if current is None:
            continue

        mean = statistics.mean(values)
        try:
            stdev = statistics.stdev(values)
        except statistics.StatisticsError:
            stdev = 0

        if stdev == 0:
            continue

        z = abs(current - mean) / stdev
        if z < Z_SCORE_WARN or abs(current - mean) < MIN_ABS_DEVIATION:
            continue

        # Don't pile up duplicate open anomalies for the same server+metric.
        already_open = AnomalyDetection.objects.filter(
            server=server, metric=metric,
            status__in=[AnomalyDetection.Status.OPEN, AnomalyDetection.Status.REVIEWED],
        ).exists()
        if already_open:
            continue

        deviation = ((current - mean) / mean * 100) if mean else 0
        direction = 'above' if current > mean else 'below'

        anomaly = AnomalyDetection.objects.create(
            server=server,
            metric=metric,
            detected_value=current,
            expected_value=round(mean, 2),
            deviation=round(deviation, 2),
            severity=_severity_for_zscore(z),
            description=(
                f"{metric.replace('_', ' ').title()} on {server.name} is {direction} its recent "
                f"baseline ({current:.1f} vs expected ~{mean:.1f}, z-score {z:.1f})."
            ),
            recommendation=_recommendation_for(metric, direction),
        )
        created.append(anomaly)

    return created


def _recommendation_for(metric, direction):
    if metric == 'cpu_usage' and direction == 'above':
        return "Investigate runaway or unexpected processes consuming CPU."
    if metric == 'memory_usage' and direction == 'above':
        return "Check for memory leaks or processes consuming excess RAM."
    if metric == 'disk_usage' and direction == 'above':
        return "Review disk usage; consider cleanup or capacity expansion."
    return "Review recent changes to this server around the time of this deviation."


# ---------------------------------------------------------------- trends

def update_trends(snapshot):
    """Rolls up the last hour of snapshots into an hourly PerformanceTrend
    row per metric, at most once per hour per server+metric."""
    server = snapshot.server
    now    = timezone.now()
    window_start = now - timedelta(hours=1)

    created = []
    for metric in METRICS:
        recent_trend = PerformanceTrend.objects.filter(
            server=server, metric=metric, period=PerformanceTrend.Period.HOURLY,
        ).order_by('-recorded_at').first()

        if recent_trend and recent_trend.recorded_at > now - timedelta(hours=1):
            continue

        values = list(
            MetricSnapshot.objects.filter(server=server, timestamp__gte=window_start)
            .values_list(metric, flat=True)
        )
        values = [v for v in values if v is not None]
        if not values:
            continue

        avg_value = statistics.mean(values)
        direction = 'stable'
        if recent_trend:
            if avg_value > recent_trend.avg_value * 1.05:
                direction = 'up'
            elif avg_value < recent_trend.avg_value * 0.95:
                direction = 'down'

        trend = PerformanceTrend.objects.create(
            server=server,
            metric=metric,
            period=PerformanceTrend.Period.HOURLY,
            avg_value=round(avg_value, 2),
            max_value=round(max(values), 2),
            min_value=round(min(values), 2),
            trend_direction=direction,
        )
        created.append(trend)

    return created


# ------------------------------------------------------------- insights

CAPACITY_METRICS = {
    'disk_usage'  : PredictiveInsight.InsightType.CAPACITY,
    'memory_usage': PredictiveInsight.InsightType.PERFORMANCE,
    'cpu_usage'   : PredictiveInsight.InsightType.PERFORMANCE,
}
CAPACITY_CEILING = 95.0
MIN_TREND_POINTS = 3


def _linear_forecast(points):
    """Simple least-squares slope/intercept over (x, y) points."""
    n = len(points)
    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    sum_xy = sum(p[0] * p[1] for p in points)
    sum_xx = sum(p[0] * p[0] for p in points)

    denom = n * sum_xx - sum_x * sum_x
    if denom == 0:
        return 0, sum_y / n

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept


def generate_insights(server):
    """Looks at recent hourly trends per metric and, if a sustained upward
    trend projects toward a risk ceiling, creates/refreshes a PredictiveInsight."""
    created = []
    for metric, insight_type in CAPACITY_METRICS.items():
        trends = list(
            PerformanceTrend.objects.filter(server=server, metric=metric, period=PerformanceTrend.Period.HOURLY)
            .order_by('recorded_at')[:HISTORY_LIMIT]
        )
        if len(trends) < MIN_TREND_POINTS:
            continue

        points = [(i, t.avg_value) for i, t in enumerate(trends)]
        slope, intercept = _linear_forecast(points)

        if slope <= 0:
            continue

        current_value = trends[-1].avg_value
        hours_to_ceiling = (CAPACITY_CEILING - current_value) / slope if slope > 0 else None
        if hours_to_ceiling is None or hours_to_ceiling > 24 * 30 or hours_to_ceiling < 0:
            continue

        already_active = PredictiveInsight.objects.filter(
            server=server, insight_type=insight_type, status=PredictiveInsight.Status.ACTIVE,
            title__icontains=metric.replace('_', ' '),
        ).exists()
        if already_active:
            continue

        risk_score = min(100, max(0, 100 - hours_to_ceiling))
        confidence = min(95, 50 + len(trends))

        insight = PredictiveInsight.objects.create(
            server=server,
            insight_type=insight_type,
            title=f"{metric.replace('_', ' ').title()} trending toward capacity",
            description=(
                f"{metric.replace('_', ' ').title()} on {server.name} has risen at ~{slope:.2f}%/hour "
                f"over the last {len(trends)} hourly samples, currently at {current_value:.1f}%."
            ),
            recommendation=_recommendation_for(metric, 'above'),
            confidence=confidence,
            risk_score=round(risk_score, 1),
            predicted_date=timezone.now() + timedelta(hours=hours_to_ceiling),
            expires_at=timezone.now() + timedelta(days=7),
        )
        created.append(insight)

    return created


def process_snapshot(snapshot):
    """Single entry point wired into metric ingestion: runs anomaly detection,
    rolls up trends, and (opportunistically) refreshes predictive insights."""
    anomalies = detect_anomalies(snapshot)
    trends    = update_trends(snapshot)
    insights  = generate_insights(snapshot.server) if trends else []
    return anomalies, trends, insights
