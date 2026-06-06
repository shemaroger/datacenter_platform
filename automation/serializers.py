from rest_framework import serializers
from .models import AutomationTask, TaskExecutionLog, BackupConfig, Workflow


class TaskExecutionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TaskExecutionLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class AutomationTaskSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    server_name         = serializers.CharField(source='server.name',         read_only=True)
    logs                = TaskExecutionLogSerializer(many=True, read_only=True)

    class Meta:
        model  = AutomationTask
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by',
                            'started_at', 'completed_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BackupConfigSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    server_name         = serializers.CharField(source='server.name',         read_only=True)

    class Meta:
        model  = BackupConfig
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'last_run', 'next_run']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WorkflowSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model  = Workflow
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)