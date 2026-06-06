from django.contrib import admin
from .models import AnomalyDetection, PredictiveInsight, PerformanceTrend

@admin.register(AnomalyDetection)
class AnomalyDetectionAdmin(admin.ModelAdmin):
    list_display  = ['server', 'metric', 'severity', 'status', 'detected_at']
    list_filter   = ['severity', 'status']

@admin.register(PredictiveInsight)
class PredictiveInsightAdmin(admin.ModelAdmin):
    list_display  = ['title', 'server', 'insight_type', 'risk_score', 'status', 'created_at']
    list_filter   = ['insight_type', 'status']

@admin.register(PerformanceTrend)
class PerformanceTrendAdmin(admin.ModelAdmin):
    list_display  = ['server', 'metric', 'period', 'avg_value', 'trend_direction', 'recorded_at']
    list_filter   = ['period', 'metric']