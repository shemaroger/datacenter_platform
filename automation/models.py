from django.db import models
from django.conf import settings
from monitoring.models import Server


class AutomationTask(models.Model):

    class TaskType(models.TextChoices):
        BACKUP           = 'backup',           'Backup'
        SERVICE_RESTART  = 'service_restart',  'Service Restart'
        DISK_CLEANUP     = 'disk_cleanup',     'Disk Cleanup'
        SYSTEM_UPDATE    = 'system_update',    'System Update'
        HEALTH_CHECK     = 'health_check',     'Health Check'
        CUSTOM_SCRIPT    = 'custom_script',    'Custom Script'
        RESOURCE_SCALING = 'resource_scaling', 'Resource Scaling'

    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        RUNNING   = 'running',   'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED    = 'failed',    'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
        SCHEDULED = 'scheduled', 'Scheduled'

    class TriggerType(models.TextChoices):
        MANUAL    = 'manual',    'Manual'
        SCHEDULED = 'scheduled', 'Scheduled'
        TRIGGERED = 'triggered', 'Event Triggered'

    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True, null=True)
    task_type     = models.CharField(max_length=20,  choices=TaskType.choices)
    status        = models.CharField(max_length=15,  choices=Status.choices, default=Status.PENDING)
    trigger_type  = models.CharField(max_length=15,  choices=TriggerType.choices, default=TriggerType.MANUAL)
    server        = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    created_by    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    script        = models.TextField(blank=True, null=True, help_text='Script or command to execute')
    parameters    = models.JSONField(default=dict, blank=True)
    scheduled_at  = models.DateTimeField(null=True, blank=True)
    started_at    = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.task_type})"

    class Meta:
        ordering = ['-created_at']


class TaskExecutionLog(models.Model):

    class LogLevel(models.TextChoices):
        INFO    = 'info',    'Info'
        WARNING = 'warning', 'Warning'
        ERROR   = 'error',   'Error'
        SUCCESS = 'success', 'Success'

    task       = models.ForeignKey(AutomationTask, on_delete=models.CASCADE, related_name='logs')
    level      = models.CharField(max_length=10, choices=LogLevel.choices, default=LogLevel.INFO)
    message    = models.TextField()
    output     = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.level.upper()}] Task #{self.task.id} — {self.message[:50]}"

    class Meta:
        ordering = ['created_at']


class BackupConfig(models.Model):

    class Frequency(models.TextChoices):
        HOURLY  = 'hourly',  'Hourly'
        DAILY   = 'daily',   'Daily'
        WEEKLY  = 'weekly',  'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    class BackupType(models.TextChoices):
        FULL        = 'full',        'Full'
        INCREMENTAL = 'incremental', 'Incremental'
        DIFFERENTIAL = 'differential', 'Differential'

    name            = models.CharField(max_length=200)
    server          = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='backup_configs')
    backup_type     = models.CharField(max_length=15, choices=BackupType.choices, default=BackupType.FULL)
    frequency       = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.DAILY)
    destination     = models.CharField(max_length=500, help_text='Backup destination path or URL')
    retention_days  = models.IntegerField(default=30)
    is_active       = models.BooleanField(default=True)
    last_run        = models.DateTimeField(null=True, blank=True)
    next_run        = models.DateTimeField(null=True, blank=True)
    created_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} — {self.server.name} ({self.frequency})"

    class Meta:
        ordering = ['-created_at']


class Workflow(models.Model):

    class Status(models.TextChoices):
        DRAFT    = 'draft',    'Draft'
        ACTIVE   = 'active',   'Active'
        INACTIVE = 'inactive', 'Inactive'

    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    steps       = models.JSONField(default=list, help_text='Ordered list of task steps')
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']