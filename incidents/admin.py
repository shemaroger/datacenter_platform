from django.contrib import admin
from .models import Incident, IncidentComment, IncidentEscalation, IncidentTimeline

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display  = ['title', 'priority', 'status', 'category', 'assigned_to', 'created_at']
    list_filter   = ['priority', 'status', 'category']
    search_fields = ['title', 'description']

@admin.register(IncidentComment)
class IncidentCommentAdmin(admin.ModelAdmin):
    list_display  = ['incident', 'author', 'created_at']

@admin.register(IncidentEscalation)
class IncidentEscalationAdmin(admin.ModelAdmin):
    list_display  = ['incident', 'escalated_by', 'escalated_to', 'created_at']

@admin.register(IncidentTimeline)
class IncidentTimelineAdmin(admin.ModelAdmin):
    list_display  = ['incident', 'action', 'performed_by', 'created_at']