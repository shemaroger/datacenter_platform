from django.contrib import admin
from .models import Report, ScheduledReport

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display  = ['title', 'report_type', 'status', 'format', 'generated_by', 'created_at']
    list_filter   = ['report_type', 'status', 'format']

@admin.register(ScheduledReport)
class ScheduledReportAdmin(admin.ModelAdmin):
    list_display  = ['name', 'report_type', 'frequency', 'is_active', 'last_run', 'next_run']
    list_filter   = ['frequency', 'is_active']