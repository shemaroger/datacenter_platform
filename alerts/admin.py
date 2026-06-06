from django.contrib import admin
from .models import AlertRule, Alert, NotificationChannel, Notification

@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display  = ['name', 'metric', 'operator', 'threshold', 'severity', 'is_active']
    list_filter   = ['severity', 'metric', 'is_active']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display  = ['server', 'severity', 'status', 'message', 'created_at']
    list_filter   = ['severity', 'status']

@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    list_display  = ['user', 'channel_type', 'target', 'is_active']
    list_filter   = ['channel_type', 'is_active']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['alert', 'channel', 'status', 'sent_at']
    list_filter   = ['status']