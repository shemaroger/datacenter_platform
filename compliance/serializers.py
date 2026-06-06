from rest_framework import serializers
from .models import CompliancePolicy, ComplianceCheck, PolicyViolation


class ComplianceCheckSerializer(serializers.ModelSerializer):
    checked_by_username = serializers.CharField(source='checked_by.username', read_only=True)

    class Meta:
        model  = ComplianceCheck
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'checked_by', 'checked_at']


class CompliancePolicySerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    checks              = ComplianceCheckSerializer(many=True, read_only=True)
    total_checks        = serializers.SerializerMethodField()
    passed_checks       = serializers.SerializerMethodField()

    class Meta:
        model  = CompliancePolicy
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_total_checks(self, obj):
        return obj.checks.count()

    def get_passed_checks(self, obj):
        return obj.checks.filter(result='passed').count()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class PolicyViolationSerializer(serializers.ModelSerializer):
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)

    class Meta:
        model  = PolicyViolation
        fields = '__all__'
        read_only_fields = ['id', 'detected_at', 'resolved_by', 'resolved_at']