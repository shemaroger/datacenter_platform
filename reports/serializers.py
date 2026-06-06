from rest_framework import serializers
from .models import Report, ScheduledReport


class ReportSerializer(serializers.ModelSerializer):
    generated_by_username = serializers.CharField(source='generated_by.username', read_only=True)

    class Meta:
        model  = Report
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'generated_by', 'generated_at', 'file_path']

    def create(self, validated_data):
        validated_data['generated_by'] = self.context['request'].user
        return super().create(validated_data)


class ScheduledReportSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model  = ScheduledReport
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by', 'last_run', 'next_run']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)