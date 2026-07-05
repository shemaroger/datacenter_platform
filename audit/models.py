from django.conf import settings
from django.db import models


class AuditLog(models.Model):

    class Action(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DELETE = 'delete', 'Delete'
        LOGIN  = 'login',  'Login'
        LOGIN_FAILED = 'login_failed', 'Login Failed'
        LOGOUT = 'logout', 'Logout'

    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    username     = models.CharField(max_length=150, blank=True, help_text='Snapshot in case the user is later deleted')
    action       = models.CharField(max_length=15, choices=Action.choices)
    app_label    = models.CharField(max_length=100, blank=True)
    model_name   = models.CharField(max_length=100, blank=True)
    object_id    = models.CharField(max_length=50, blank=True, null=True)
    object_repr  = models.CharField(max_length=255, blank=True)
    changes      = models.JSONField(default=dict, blank=True, help_text='Changed field -> new value (update), or full snapshot (create/delete)')
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.action}] {self.model_name} #{self.object_id} by {self.username or 'system'}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['model_name']),
            models.Index(fields=['action']),
            models.Index(fields=['user']),
        ]
