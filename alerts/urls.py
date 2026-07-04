from django.urls import path
from . import views

urlpatterns = [
    # Summary
    path('alerts/summary/',                      views.AlertSummaryView.as_view(),              name='alert_summary'),

    # Rules
    path('alerts/rules/',                        views.AlertRuleListCreateView.as_view(),        name='alert_rule_list'),
    path('alerts/rules/<int:pk>/',               views.AlertRuleDetailView.as_view(),            name='alert_rule_detail'),

    # Alerts
    path('alerts/',                              views.AlertListCreateView.as_view(),            name='alert_list'),
    path('alerts/<int:pk>/',                     views.AlertDetailView.as_view(),                name='alert_detail'),
    path('alerts/<int:pk>/acknowledge/',         views.AcknowledgeAlertView.as_view(),           name='alert_acknowledge'),
    path('alerts/<int:pk>/resolve/',             views.ResolveAlertView.as_view(),               name='alert_resolve'),

    # Notification channels
    path('alerts/channels/',                     views.NotificationChannelListCreateView.as_view(), name='channel_list'),
    path('alerts/channels/<int:pk>/',            views.NotificationChannelDetailView.as_view(),     name='channel_detail'),

    # Notifications
    path('alerts/notifications/',                        views.NotificationListView.as_view(),              name='notification_list'),
    path('alerts/notifications/unread-count/',            views.NotificationUnreadCountView.as_view(),       name='notification_unread_count'),
    path('alerts/notifications/<int:pk>/read/',           views.MarkNotificationReadView.as_view(),          name='notification_mark_read'),
    path('alerts/notifications/mark-all-read/',           views.MarkAllNotificationsReadView.as_view(),      name='notification_mark_all_read'),
]