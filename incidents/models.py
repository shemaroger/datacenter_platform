from django.db import models
from django.conf import settings
from monitoring.models import Server
from alerts.models import Alert


class Incident(models.Model):

    class Priority(models.TextChoices):
        LOW      = 'low',      'Low'
        MEDIUM   = 'medium',   'Medium'
        HIGH     = 'high',     'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN        = 'open',        'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED    = 'resolved',    'Resolved'
        CLOSED      = 'closed',      'Closed'

    class Category(models.TextChoices):
        HARDWARE    = 'hardware',    'Hardware'
        SOFTWARE    = 'software',    'Software'
        NETWORK     = 'network',     'Network'
        SECURITY    = 'security',    'Security'
        PERFORMANCE = 'performance', 'Performance'
        OTHER       = 'other',       'Other'

    title          = models.CharField(max_length=200)
    description    = models.TextField()
    priority       = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status         = models.CharField(max_length=15, choices=Status.choices,   default=Status.OPEN)
    category       = models.CharField(max_length=15, choices=Category.choices, default=Category.OTHER)
    server         = models.ForeignKey(Server, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents')
    alert          = models.ForeignKey(Alert,  on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents')
    created_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_incidents')
    assigned_to    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    resolved_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_incidents')
    resolved_at    = models.DateTimeField(null=True, blank=True)
    closed_at      = models.DateTimeField(null=True, blank=True)
    sla_deadline   = models.DateTimeField(null=True, blank=True)
    root_cause     = models.TextField(blank=True, null=True)
    resolution     = models.TextField(blank=True, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"

    class Meta:
        ordering = ['-created_at']


class IncidentComment(models.Model):
    incident   = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='comments')
    author     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    message    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.author} on Incident #{self.incident.id}"

    class Meta:
        ordering = ['created_at']


class IncidentEscalation(models.Model):
    incident     = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='escalations')
    escalated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='escalated_by')
    escalated_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='escalated_to')
    reason       = models.TextField()
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalation for Incident #{self.incident.id}"

    class Meta:
        ordering = ['-created_at']


class IncidentTimeline(models.Model):
    incident   = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='timeline')
    action     = models.CharField(max_length=255)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} — Incident #{self.incident.id}"

    class Meta:
        ordering = ['created_at']