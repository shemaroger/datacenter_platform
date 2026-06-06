from django.urls import path
from . import views

urlpatterns = [
    path('analytics/summary/',                  views.AnalyticsSummaryView.as_view(),          name='analytics_summary'),
    path('analytics/anomalies/',                views.AnomalyListCreateView.as_view(),         name='anomaly_list'),
    path('analytics/anomalies/<int:pk>/',       views.AnomalyDetailView.as_view(),             name='anomaly_detail'),
    path('analytics/anomalies/<int:pk>/review/', views.ReviewAnomalyView.as_view(),            name='anomaly_review'),
    path('analytics/insights/',                 views.PredictiveInsightListCreateView.as_view(), name='insight_list'),
    path('analytics/insights/<int:pk>/',        views.PredictiveInsightDetailView.as_view(),   name='insight_detail'),
    path('analytics/trends/',                   views.PerformanceTrendListCreateView.as_view(), name='trend_list'),
]