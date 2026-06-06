from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('monitoring/summary/',                             views.DashboardSummaryView.as_view(),        name='dashboard_summary'),

    # Servers
    path('monitoring/servers/',                             views.ServerListCreateView.as_view(),         name='server_list'),
    path('monitoring/servers/<int:pk>/',                    views.ServerDetailView.as_view(),             name='server_detail'),
    path('monitoring/servers/<int:server_id>/metrics/',     views.MetricSnapshotListCreateView.as_view(), name='server_metrics'),
    path('monitoring/servers/<int:server_id>/stats/',       views.ServerStatsView.as_view(),              name='server_stats'),

    # Network devices
    path('monitoring/devices/',                             views.NetworkDeviceListCreateView.as_view(),  name='device_list'),
    path('monitoring/devices/<int:pk>/',                    views.NetworkDeviceDetailView.as_view(),      name='device_detail'),
]