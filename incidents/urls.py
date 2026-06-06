from django.urls import path
from . import views

urlpatterns = [
    # Summary
    path('incidents/summary/',                          views.IncidentSummaryView.as_view(),          name='incident_summary'),

    # Incidents
    path('incidents/',                                  views.IncidentListCreateView.as_view(),        name='incident_list'),
    path('incidents/<int:pk>/',                         views.IncidentDetailView.as_view(),            name='incident_detail'),
    path('incidents/<int:pk>/assign/',                  views.AssignIncidentView.as_view(),            name='incident_assign'),
    path('incidents/<int:pk>/resolve/',                 views.ResolveIncidentView.as_view(),           name='incident_resolve'),
    path('incidents/<int:pk>/close/',                   views.CloseIncidentView.as_view(),             name='incident_close'),
    path('incidents/<int:pk>/escalate/',                views.IncidentEscalationView.as_view(),        name='incident_escalate'),

    # Comments
    path('incidents/<int:incident_id>/comments/',       views.IncidentCommentListCreateView.as_view(), name='incident_comments'),
]