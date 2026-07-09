import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone

from .models import AlertRule, Alert, Notification, NotificationChannel
from users.models import CustomUser

logger = logging.getLogger(__name__)

# AlertRule.metric values map directly to MetricSnapshot field names.
METRIC_FIELDS = {
    AlertRule.Metric.CPU_USAGE   : 'cpu_usage',
    AlertRule.Metric.MEMORY_USAGE: 'memory_usage',
    AlertRule.Metric.DISK_USAGE  : 'disk_usage',
    AlertRule.Metric.NETWORK_IN  : 'network_in',
    AlertRule.Metric.NETWORK_OUT : 'network_out',
    AlertRule.Metric.CPU_TEMP    : 'cpu_temp',
}


def _breaches(value, operator, threshold):
    if value is None:
        return False
    if operator == AlertRule.Operator.GREATER_THAN:
        return value > threshold
    if operator == AlertRule.Operator.LESS_THAN:
        return value < threshold
    if operator == AlertRule.Operator.EQUAL:
        return value == threshold
    return False


def evaluate_snapshot(snapshot):
    """Check a newly-created MetricSnapshot against active AlertRules for its
    server (plus server-agnostic rules) and create Alert + Notification rows
    for any breached threshold. Returns the list of Alerts created."""
    rules = AlertRule.objects.filter(
        Q(server=snapshot.server) | Q(server__isnull=True),
        is_active=True,
    )

    created = []
    for rule in rules:
        field = METRIC_FIELDS.get(rule.metric)
        if not field:
            continue
        value = getattr(snapshot, field, None)
        if not _breaches(value, rule.operator, rule.threshold):
            continue

        # Avoid re-alerting every snapshot while the condition stays breached —
        # only fire again once the previous alert for this rule+server was resolved.
        already_active = Alert.objects.filter(
            rule=rule, server=snapshot.server,
            status__in=[Alert.Status.ACTIVE, Alert.Status.ACKNOWLEDGED],
        ).exists()
        if already_active:
            continue

        alert = Alert.objects.create(
            rule=rule,
            server=snapshot.server,
            severity=rule.severity,
            message=f"{rule.get_metric_display()} {rule.get_operator_display().lower()} "
                    f"{rule.threshold} on {snapshot.server.name} (current: {value:.1f})",
            metric_value=value,
        )
        created.append(alert)
        notify_alert(alert, event='created')

    return created


def _ensure_email_channels():
    """Every user with an email on file gets an email NotificationChannel
    automatically, so alert emails work without a separate setup step."""
    existing = set(
        NotificationChannel.objects.filter(channel_type='email').values_list('user_id', flat=True)
    )
    for user in CustomUser.objects.exclude(email='').exclude(id__in=existing):
        NotificationChannel.objects.create(user=user, channel_type='email', target=user.email)


EVENT_LABELS = {
    'created'     : 'New alert',
    'acknowledged': 'Alert acknowledged',
    'resolved'    : 'Alert resolved',
}


def _send_alert_email(notification, event):
    alert   = notification.alert
    channel = notification.channel
    label   = EVENT_LABELS.get(event, 'Alert update')
    subject = f"[{alert.severity.upper()}] {label} — {alert.server.name}"
    body    = (
        f"{label}: {alert.message}\n\n"
        f"Server: {alert.server.name}\n"
        f"Severity: {alert.severity}\n"
        f"Status: {alert.get_status_display()}\n"
        f"Triggered at: {alert.created_at}\n"
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [channel.target], fail_silently=False)
        notification.status  = Notification.Status.SENT
        notification.sent_at = timezone.now()
    except Exception as exc:
        logger.exception("Failed to send alert email to %s", channel.target)
        notification.status    = Notification.Status.FAILED
        notification.error_msg = str(exc)
    notification.save()


def notify_alert(alert, event='created'):
    """Broadcasts an alert event (created/acknowledged/resolved) to every
    user's in-app and email notification channels."""
    _ensure_email_channels()

    for channel in NotificationChannel.objects.filter(channel_type='in_app', is_active=True):
        Notification.objects.create(alert=alert, channel=channel, status=Notification.Status.SENT)

    for channel in NotificationChannel.objects.filter(channel_type='email', is_active=True):
        notification = Notification.objects.create(alert=alert, channel=channel, status=Notification.Status.PENDING)
        _send_alert_email(notification, event)
