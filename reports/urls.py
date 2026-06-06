from django.urls import path
from . import views

urlpatterns = [
    path('reports/summary/',                    views.ReportSummaryView.as_view(),             name='report_summary'),
    path('reports/',                            views.ReportListCreateView.as_view(),          name='report_list'),
    path('reports/<int:pk>/',                   views.ReportDetailView.as_view(),              name='report_detail'),
    path('reports/<int:pk>/generate/',          views.GenerateReportView.as_view(),            name='report_generate'),
    path('reports/<int:pk>/download/',          views.DownloadReportView.as_view(),            name='report_download'),
    path('reports/scheduled/',                  views.ScheduledReportListCreateView.as_view(), name='scheduled_report_list'),
    path('reports/scheduled/<int:pk>/',         views.ScheduledReportDetailView.as_view(),     name='scheduled_report_detail'),
]