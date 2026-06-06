from django.urls import path
from . import views

urlpatterns = [
    path('compliance/summary/',                             views.ComplianceSummaryView.as_view(),          name='compliance_summary'),
    path('compliance/policies/',                            views.CompliancePolicyListCreateView.as_view(), name='policy_list'),
    path('compliance/policies/<int:pk>/',                   views.CompliancePolicyDetailView.as_view(),     name='policy_detail'),
    path('compliance/policies/<int:policy_id>/checks/',     views.ComplianceCheckListCreateView.as_view(),  name='policy_checks'),
    path('compliance/violations/',                          views.PolicyViolationListCreateView.as_view(),  name='violation_list'),
    path('compliance/violations/<int:pk>/',                 views.PolicyViolationDetailView.as_view(),      name='violation_detail'),
    path('compliance/violations/<int:pk>/resolve/',         views.ResolveViolationView.as_view(),           name='violation_resolve'),
]