from django.contrib import admin
from .models import AutomationTask, TaskExecutionLog, BackupConfig, Workflow

@admin.register(AutomationTask)
class AutomationTaskAdmin(admin.ModelAdmin):
    list_display  = ['name', 'task_type', 'status', 'trigger_type', 'server', 'created_at']
    list_filter   = ['status', 'task_type', 'trigger_type']
    search_fields = ['name', 'description']

@admin.register(TaskExecutionLog)
class TaskExecutionLogAdmin(admin.ModelAdmin):
    list_display  = ['task', 'level', 'message', 'created_at']
    list_filter   = ['level']

@admin.register(BackupConfig)
class BackupConfigAdmin(admin.ModelAdmin):
    list_display  = ['name', 'server', 'backup_type', 'frequency', 'is_active', 'last_run']
    list_filter   = ['backup_type', 'frequency', 'is_active']

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display  = ['name', 'status', 'created_by', 'created_at']
    list_filter   = ['status']