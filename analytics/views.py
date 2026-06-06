from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Avg

from .models import AnomalyDetection, PredictiveInsight, PerformanceTrend
from .serializers import (
    AnomalyDetectionSerializer, PredictiveInsightSerializer, PerformanceTrendSerializer
)


class AnomalyListCreateView(generics.ListCreateAPIView):
    serializer_class   = AnomalyDetectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = AnomalyDetection.objects.all()
        severity  = self.request.query_params.get('severity')
        status_f  = self.request.query_params.get('status')
        server_id = self.request.query_params.get('server')
        if severity:
            queryset = queryset.filter(severity=severity)
        if status_f:
            queryset = queryset.filter(status=status_f)
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        return queryset


class AnomalyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = AnomalyDetection.objects.all()
    serializer_class   = AnomalyDetectionSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReviewAnomalyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            anomaly = AnomalyDetection.objects.get(pk=pk)
        except AnomalyDetection.DoesNotExist:
            return Response({'detail': 'Anomaly not found.'}, status=status.HTTP_404_NOT_FOUND)

        anomaly.status      = request.data.get('status', AnomalyDetection.Status.REVIEWED)
        anomaly.reviewed_by = request.user
        anomaly.reviewed_at = timezone.now()
        anomaly.save()
        return Response(AnomalyDetectionSerializer(anomaly).data)


class PredictiveInsightListCreateView(generics.ListCreateAPIView):
    serializer_class   = PredictiveInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset     = PredictiveInsight.objects.filter(status='active')
        insight_type = self.request.query_params.get('type')
        server_id    = self.request.query_params.get('server')
        if insight_type:
            queryset = queryset.filter(insight_type=insight_type)
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        return queryset


class PredictiveInsightDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = PredictiveInsight.objects.all()
    serializer_class   = PredictiveInsightSerializer
    permission_classes = [permissions.IsAuthenticated]


class PerformanceTrendListCreateView(generics.ListCreateAPIView):
    serializer_class   = PerformanceTrendSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset  = PerformanceTrend.objects.all()
        server_id = self.request.query_params.get('server')
        period    = self.request.query_params.get('period')
        metric    = self.request.query_params.get('metric')
        if server_id:
            queryset = queryset.filter(server_id=server_id)
        if period:
            queryset = queryset.filter(period=period)
        if metric:
            queryset = queryset.filter(metric=metric)
        return queryset


class AnalyticsSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        anomalies = AnomalyDetection.objects.all()
        insights  = PredictiveInsight.objects.all()
        summary   = {
            'total_anomalies'    : anomalies.count(),
            'open_anomalies'     : anomalies.filter(status='open').count(),
            'critical_anomalies' : anomalies.filter(severity='critical', status='open').count(),
            'active_insights'    : insights.filter(status='active').count(),
            'high_risk_insights' : insights.filter(risk_score__gte=75, status='active').count(),
            'avg_risk_score'     : insights.filter(status='active').aggregate(
                                        avg=Avg('risk_score'))['avg'] or 0,
        }
        return Response(summary)