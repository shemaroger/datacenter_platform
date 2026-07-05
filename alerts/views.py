from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import AlertRule, Alert, NotificationChannel, Notification
from .serializers import (
    AlertRuleSerializer, AlertSerializer,
    NotificationChannelSerializer, NotificationSerializer
)


class AlertRuleListCreateView(generics.ListCreateAPIView):
    serializer_class   = AlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = AlertRule.objects.filter(is_active=True)
        server_id = self.request.query_params.get('server')
        severity  = self.request.query_params.get('severity')
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        if severity:
            queryset = queryset.filter(severity=severity)
        return queryset


class AlertRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = AlertRule.objects.all()
    serializer_class   = AlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class AlertListCreateView(generics.ListCreateAPIView):
    serializer_class   = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = Alert.objects.all()
        status_f  = self.request.query_params.get('status')
        severity  = self.request.query_params.get('severity')
        server_id = self.request.query_params.get('server')
        if status_f:
            queryset = queryset.filter(status=status_f)
        if severity:
            queryset = queryset.filter(severity=severity)
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        return queryset


class AlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Alert.objects.all()
    serializer_class   = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]


class AcknowledgeAlertView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            alert = Alert.objects.get(pk=pk)
        except Alert.DoesNotExist:
            return Response({'detail': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert.status          = Alert.Status.ACKNOWLEDGED
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)


class ResolveAlertView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            alert = Alert.objects.get(pk=pk)
        except Alert.DoesNotExist:
            return Response({'detail': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert.status      = Alert.Status.RESOLVED
        alert.resolved_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)


class AlertSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        alerts  = Alert.objects.all()
        summary = {
            'total'        : alerts.count(),
            'active'       : alerts.filter(status='active').count(),
            'acknowledged' : alerts.filter(status='acknowledged').count(),
            'resolved'     : alerts.filter(status='resolved').count(),
            'critical'     : alerts.filter(severity='critical', status='active').count(),
            'warning'      : alerts.filter(severity='warning',  status='active').count(),
            'info'         : alerts.filter(severity='info',     status='active').count(),
        }
        return Response(summary)


class NotificationChannelListCreateView(generics.ListCreateAPIView):
    serializer_class   = NotificationChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationChannel.objects.filter(user=self.request.user)


class NotificationChannelDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = NotificationChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationChannel.objects.filter(user=self.request.user)


class NotificationListView(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = Notification.objects.filter(channel__user=self.request.user)
        is_read   = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        return queryset[:50]


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(channel__user=request.user, is_read=False).count()
        return Response({'unread': count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, channel__user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(channel__user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})