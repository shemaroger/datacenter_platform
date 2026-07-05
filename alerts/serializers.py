from rest_framework import serializers
from .models import AlertRule, Alert, NotificationChannel, Notification


class AlertRuleSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model  = AlertRule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AlertSerializer(serializers.ModelSerializer):
    server_name         = serializers.CharField(source='server.name',             read_only=True)
    rule_name           = serializers.CharField(source='rule.name',               read_only=True)
    acknowledged_by_username = serializers.CharField(source='acknowledged_by.username', read_only=True)

    class Meta:
        model  = Alert
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'acknowledged_by', 'acknowledged_at', 'resolved_at']


class NotificationChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationChannel
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    alert_message = serializers.CharField(source='alert.message', read_only=True)
    alert_severity = serializers.CharField(source='alert.severity', read_only=True)
    server_name    = serializers.CharField(source='alert.server.name', read_only=True)
    channel_type   = serializers.CharField(source='channel.channel_type', read_only=True)

    class Meta:
        model  = Notification
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'alert', 'channel', 'status', 'sent_at', 'error_msg']