from rest_framework import serializers
from .models import AnomalyDetection, PredictiveInsight, PerformanceTrend


class AnomalyDetectionSerializer(serializers.ModelSerializer):
    server_name         = serializers.CharField(source='server.name',          read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model  = AnomalyDetection
        fields = '__all__'
        read_only_fields = ['id', 'detected_at', 'reviewed_by', 'reviewed_at']


class PredictiveInsightSerializer(serializers.ModelSerializer):
    server_name = serializers.CharField(source='server.name', read_only=True)

    class Meta:
        model  = PredictiveInsight
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class PerformanceTrendSerializer(serializers.ModelSerializer):
    server_name = serializers.CharField(source='server.name', read_only=True)

    class Meta:
        model  = PerformanceTrend
        fields = '__all__'
        read_only_fields = ['id', 'recorded_at']