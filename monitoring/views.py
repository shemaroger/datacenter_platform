from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg, Max, Min
from django.utils import timezone
from datetime import timedelta

from .models import Server, MetricSnapshot, NetworkDevice
from .serializers import ServerSerializer, MetricSnapshotSerializer, NetworkDeviceSerializer


class ServerListCreateView(generics.ListCreateAPIView):
    queryset           = Server.objects.filter(is_active=True)
    serializer_class   = ServerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        server_type   = self.request.query_params.get('type')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if server_type:
            queryset = queryset.filter(server_type=server_type)
        return queryset


class ServerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Server.objects.all()
    serializer_class   = ServerSerializer
    permission_classes = [permissions.IsAuthenticated]


class MetricSnapshotListCreateView(generics.ListCreateAPIView):
    serializer_class   = MetricSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        server_id = self.kwargs.get('server_id')
        hours     = int(self.request.query_params.get('hours', 1))
        since     = timezone.now() - timedelta(hours=hours)
        return MetricSnapshot.objects.filter(
            server_id=server_id,
            timestamp__gte=since
        )

    def perform_create(self, serializer):
        server_id = self.kwargs.get('server_id')
        serializer.save(server_id=server_id)


class ServerStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, server_id):
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timedelta(hours=hours)

        metrics = MetricSnapshot.objects.filter(
            server_id=server_id,
            timestamp__gte=since
        )

        if not metrics.exists():
            return Response({'detail': 'No metrics found.'}, status=status.HTTP_404_NOT_FOUND)

        stats = metrics.aggregate(
            avg_cpu    = Avg('cpu_usage'),
            max_cpu    = Max('cpu_usage'),
            avg_memory = Avg('memory_usage'),
            max_memory = Max('memory_usage'),
            avg_disk   = Avg('disk_usage'),
            max_disk   = Max('disk_usage'),
        )
        return Response(stats)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        servers  = Server.objects.filter(is_active=True)
        summary  = {
            'total_servers'   : servers.count(),
            'online'          : servers.filter(status='online').count(),
            'offline'         : servers.filter(status='offline').count(),
            'warning'         : servers.filter(status='warning').count(),
            'critical'        : servers.filter(status='critical').count(),
            'maintenance'     : servers.filter(status='maintenance').count(),
            'total_devices'   : NetworkDevice.objects.count(),
            'devices_online'  : NetworkDevice.objects.filter(status='online').count(),
        }
        return Response(summary)


class NetworkDeviceListCreateView(generics.ListCreateAPIView):
    queryset           = NetworkDevice.objects.all()
    serializer_class   = NetworkDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]


class NetworkDeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = NetworkDevice.objects.all()
    serializer_class   = NetworkDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]