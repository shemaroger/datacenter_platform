from django.urls import path
from . import views

urlpatterns = [
    # Summary
    path('automation/summary/',                         views.AutomationSummaryView.as_view(),       name='automation_summary'),

    # Tasks
    path('automation/tasks/',                           views.AutomationTaskListCreateView.as_view(), name='task_list'),
    path('automation/tasks/<int:pk>/',                  views.AutomationTaskDetailView.as_view(),     name='task_detail'),
    path('automation/tasks/<int:pk>/run/',              views.RunTaskView.as_view(),                  name='task_run'),
    path('automation/tasks/<int:pk>/complete/',         views.CompleteTaskView.as_view(),             name='task_complete'),
    path('automation/tasks/<int:pk>/cancel/',           views.CancelTaskView.as_view(),               name='task_cancel'),
    path('automation/tasks/<int:task_id>/logs/',        views.TaskExecutionLogListView.as_view(),     name='task_logs'),

    # Backups
    path('automation/backups/',                         views.BackupConfigListCreateView.as_view(),   name='backup_list'),
    path('automation/backups/<int:pk>/',                views.BackupConfigDetailView.as_view(),       name='backup_detail'),

    # Workflows
    path('automation/workflows/',                       views.WorkflowListCreateView.as_view(),       name='workflow_list'),
    path('automation/workflows/<int:pk>/',              views.WorkflowDetailView.as_view(),           name='workflow_detail'),
]