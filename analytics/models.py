from django.db import models
from django.conf import settings
from monitoring.models import Server


class AnomalyDetection(models.Model):

    class Severity(models.TextChoices):
        LOW      = 'low',      'Low'
        MEDIUM   = 'medium',   'Medium'
        HIGH     = 'high',     'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN     = 'open',     'Open'
        REVIEWED = 'reviewed', 'Reviewed'
        RESOLVED = 'resolved', 'Resolved'
        FALSE_POSITIVE = 'false_positive', 'False Positive'

    server        = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='anomalies')
    metric        = models.CharField(max_length=50)
    detected_value = models.FloatField()
    expected_value = models.FloatField()
    deviation      = models.FloatField(help_text='Percentage deviation from expected')
    severity      = models.CharField(max_length=10, choices=Severity.choices)
    status        = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    description   = models.TextField(blank=True, null=True)
    recommendation = models.TextField(blank=True, null=True)
    reviewed_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                       null=True, blank=True)
    detected_at   = models.DateTimeField(auto_now_add=True)
    reviewed_at   = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Anomaly on {self.server.name} — {self.metric} ({self.severity})"

    class Meta:
        ordering = ['-detected_at']


class PredictiveInsight(models.Model):

    class InsightType(models.TextChoices):
        CAPACITY    = 'capacity',    'Capacity Warning'
        FAILURE     = 'failure',     'Failure Risk'
        PERFORMANCE = 'performance', 'Performance Degradation'
        SECURITY    = 'security',    'Security Risk'

    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        EXPIRED  = 'expired',  'Expired'
        ACTED_ON = 'acted_on', 'Acted On'

    server          = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='insights')
    insight_type    = models.CharField(max_length=15, choices=InsightType.choices)
    title           = models.CharField(max_length=200)
    description     = models.TextField()
    recommendation  = models.TextField()
    confidence      = models.FloatField(help_text='Confidence score 0-100')
    risk_score      = models.FloatField(help_text='Risk score 0-100')
    status          = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    predicted_date  = models.DateTimeField(null=True, blank=True, help_text='When the issue may occur')
    created_at      = models.DateTimeField(auto_now_add=True)
    expires_at      = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} — {self.server.name}"

    class Meta:
        ordering = ['-created_at']


class PerformanceTrend(models.Model):

    class Period(models.TextChoices):
        HOURLY  = 'hourly',  'Hourly'
        DAILY   = 'daily',   'Daily'
        WEEKLY  = 'weekly',  'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    server       = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='trends')
    metric       = models.CharField(max_length=50)
    period       = models.CharField(max_length=10, choices=Period.choices)
    avg_value    = models.FloatField()
    max_value    = models.FloatField()
    min_value    = models.FloatField()
    trend_direction = models.CharField(max_length=10, choices=[
        ('up', 'Up'), ('down', 'Down'), ('stable', 'Stable')
    ])
    recorded_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.server.name} — {self.metric} ({self.period})"

    class Meta:
        ordering = ['-recorded_at']