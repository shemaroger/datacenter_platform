from django.db import models
from django.conf import settings
from monitoring.models import Server


class AlertRule(models.Model):

    class Metric(models.TextChoices):
        CPU_USAGE    = 'cpu_usage',    'CPU Usage'
        MEMORY_USAGE = 'memory_usage', 'Memory Usage'
        DISK_USAGE   = 'disk_usage',   'Disk Usage'
        NETWORK_IN   = 'network_in',   'Network In'
        NETWORK_OUT  = 'network_out',  'Network Out'
        CPU_TEMP     = 'cpu_temp',     'CPU Temperature'

    class Operator(models.TextChoices):
        GREATER_THAN = 'gt', 'Greater Than'
        LESS_THAN    = 'lt', 'Less Than'
        EQUAL        = 'eq', 'Equal To'

    class Severity(models.TextChoices):
        INFO     = 'info',     'Info'
        WARNING  = 'warning',  'Warning'
        CRITICAL = 'critical', 'Critical'

    name       = models.CharField(max_length=100)
    server     = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='alert_rules', null=True, blank=True)
    metric     = models.CharField(max_length=30, choices=Metric.choices)
    operator   = models.CharField(max_length=5,  choices=Operator.choices)
    threshold  = models.FloatField()
    severity   = models.CharField(max_length=10, choices=Severity.choices, default=Severity.WARNING)
    is_active  = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.metric} {self.operator} {self.threshold}"

    class Meta:
        ordering = ['-created_at']


class Alert(models.Model):

    class Status(models.TextChoices):
        ACTIVE       = 'active',       'Active'
        ACKNOWLEDGED = 'acknowledged', 'Acknowledged'
        RESOLVED     = 'resolved',     'Resolved'
        MUTED        = 'muted',        'Muted'

    rule            = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name='alerts')
    server          = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='alerts')
    severity        = models.CharField(max_length=10, choices=AlertRule.Severity.choices)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    message         = models.TextField()
    metric_value    = models.FloatField()
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.severity.upper()}] {self.server.name} — {self.message[:50]}"

    class Meta:
        ordering = ['-created_at']


class NotificationChannel(models.Model):

    class ChannelType(models.TextChoices):
        EMAIL   = 'email',   'Email'
        SMS     = 'sms',     'SMS'
        IN_APP  = 'in_app',  'In-App'
        WEBHOOK = 'webhook', 'Webhook'

    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_channels')
    channel_type = models.CharField(max_length=10, choices=ChannelType.choices)
    target       = models.CharField(max_length=255, help_text='Email address, phone number, or webhook URL')
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.channel_type} — {self.target}"

    class Meta:
        ordering = ['-created_at']


class Notification(models.Model):

    class Status(models.TextChoices):
        PENDING  = 'pending',  'Pending'
        SENT     = 'sent',     'Sent'
        FAILED   = 'failed',   'Failed'

    alert      = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='notifications')
    channel    = models.ForeignKey(NotificationChannel, on_delete=models.CASCADE, related_name='notifications')
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    is_read    = models.BooleanField(default=False)
    sent_at    = models.DateTimeField(null=True, blank=True)
    error_msg  = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for Alert #{self.alert.id} via {self.channel.channel_type}"

    class Meta:
        ordering = ['-created_at']