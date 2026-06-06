from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import AutomationTask, TaskExecutionLog, BackupConfig, Workflow
from .serializers import (
    AutomationTaskSerializer, TaskExecutionLogSerializer,
    BackupConfigSerializer, WorkflowSerializer
)


class AutomationTaskListCreateView(generics.ListCreateAPIView):
    serializer_class   = AutomationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset    = AutomationTask.objects.filter(is_active=True)
        status_f    = self.request.query_params.get('status')
        task_type   = self.request.query_params.get('task_type')
        server_id   = self.request.query_params.get('server')
        if status_f:
            queryset = queryset.filter(status=status_f)
        if task_type:
            queryset = queryset.filter(task_type=task_type)
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        return queryset


class AutomationTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = AutomationTask.objects.all()
    serializer_class   = AutomationTaskSerializer
    permission_classes = [permissions.IsAuthenticated]


class RunTaskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            task = AutomationTask.objects.get(pk=pk)
        except AutomationTask.DoesNotExist:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if task.status == AutomationTask.Status.RUNNING:
            return Response({'detail': 'Task is already running.'}, status=status.HTTP_400_BAD_REQUEST)

        task.status     = AutomationTask.Status.RUNNING
        task.started_at = timezone.now()
        task.save()

        TaskExecutionLog.objects.create(
            task    = task,
            level   = TaskExecutionLog.LogLevel.INFO,
            message = f'Task started by {request.user.username}',
        )
        return Response(AutomationTaskSerializer(task, context={'request': request}).data)


class CompleteTaskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            task = AutomationTask.objects.get(pk=pk)
        except AutomationTask.DoesNotExist:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        result  = request.data.get('result', 'completed')
        output  = request.data.get('output', '')
        success = result == 'completed'

        task.status       = AutomationTask.Status.COMPLETED if success else AutomationTask.Status.FAILED
        task.completed_at = timezone.now()
        task.save()

        TaskExecutionLog.objects.create(
            task    = task,
            level   = TaskExecutionLog.LogLevel.SUCCESS if success else TaskExecutionLog.LogLevel.ERROR,
            message = f'Task {task.status} by {request.user.username}',
            output  = output,
        )
        return Response(AutomationTaskSerializer(task, context={'request': request}).data)


class CancelTaskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            task = AutomationTask.objects.get(pk=pk)
        except AutomationTask.DoesNotExist:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        task.status       = AutomationTask.Status.CANCELLED
        task.completed_at = timezone.now()
        task.save()

        TaskExecutionLog.objects.create(
            task    = task,
            level   = TaskExecutionLog.LogLevel.WARNING,
            message = f'Task cancelled by {request.user.username}',
        )
        return Response(AutomationTaskSerializer(task, context={'request': request}).data)


class TaskExecutionLogListView(generics.ListAPIView):
    serializer_class   = TaskExecutionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TaskExecutionLog.objects.filter(task_id=self.kwargs['task_id'])


class BackupConfigListCreateView(generics.ListCreateAPIView):
    serializer_class   = BackupConfigSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = BackupConfig.objects.filter(is_active=True)
        server_id = self.request.query_params.get('server')
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        return queryset


class BackupConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = BackupConfig.objects.all()
    serializer_class   = BackupConfigSerializer
    permission_classes = [permissions.IsAuthenticated]


class WorkflowListCreateView(generics.ListCreateAPIView):
    serializer_class   = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Workflow.objects.all()
        status_f = self.request.query_params.get('status')
        if status_f:
            queryset = queryset.filter(status=status_f)
        return queryset


class WorkflowDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Workflow.objects.all()
    serializer_class   = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]


class AutomationSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tasks   = AutomationTask.objects.filter(is_active=True)
        summary = {
            'total_tasks'     : tasks.count(),
            'pending'         : tasks.filter(status='pending').count(),
            'running'         : tasks.filter(status='running').count(),
            'completed'       : tasks.filter(status='completed').count(),
            'failed'          : tasks.filter(status='failed').count(),
            'scheduled'       : tasks.filter(status='scheduled').count(),
            'total_backups'   : BackupConfig.objects.filter(is_active=True).count(),
            'total_workflows' : Workflow.objects.filter(status='active').count(),
        }
        return Response(summary)