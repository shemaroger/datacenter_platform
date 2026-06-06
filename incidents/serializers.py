from rest_framework import serializers
from .models import Incident, IncidentComment, IncidentEscalation, IncidentTimeline


class IncidentTimelineSerializer(serializers.ModelSerializer):
    performed_by_username = serializers.CharField(source='performed_by.username', read_only=True)

    class Meta:
        model  = IncidentTimeline
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class IncidentCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model  = IncidentComment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'author']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class IncidentEscalationSerializer(serializers.ModelSerializer):
    escalated_by_username = serializers.CharField(source='escalated_by.username', read_only=True)
    escalated_to_username = serializers.CharField(source='escalated_to.username', read_only=True)

    class Meta:
        model  = IncidentEscalation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'escalated_by']

    def create(self, validated_data):
        validated_data['escalated_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentSerializer(serializers.ModelSerializer):
    created_by_username  = serializers.CharField(source='created_by.username',  read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    server_name          = serializers.CharField(source='server.name',          read_only=True)
    comments             = IncidentCommentSerializer(many=True, read_only=True)
    timeline             = IncidentTimelineSerializer(many=True, read_only=True)

    class Meta:
        model  = Incident
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'resolved_at', 'closed_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)