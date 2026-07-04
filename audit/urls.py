from django.urls import path
from . import views

urlpatterns = [
    path('audit/logs/',    views.AuditLogListView.as_view(),    name='audit_log_list'),
    path('audit/summary/', views.AuditLogSummaryView.as_view(), name='audit_log_summary'),
]
