from rest_framework import serializers
from .models import Server, MetricSnapshot, NetworkDevice


class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MetricSnapshot
        fields = '__all__'
        read_only_fields = ['id', 'timestamp', 'server']


class ServerSerializer(serializers.ModelSerializer):
    latest_metric = serializers.SerializerMethodField()

    class Meta:
        model  = Server
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_latest_metric(self, obj):
        metric = obj.metrics.first()
        if metric:
            return MetricSnapshotSerializer(metric).data
        return None


class NetworkDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NetworkDevice
        fields = '__all__'
        read_only_fields = ['id', 'created_at']