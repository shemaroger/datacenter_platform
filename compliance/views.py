from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import CompliancePolicy, ComplianceCheck, PolicyViolation
from .serializers import (
    CompliancePolicySerializer, ComplianceCheckSerializer, PolicyViolationSerializer
)


class CompliancePolicyListCreateView(generics.ListCreateAPIView):
    serializer_class   = CompliancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = CompliancePolicy.objects.all()
        standard = self.request.query_params.get('standard')
        status_f = self.request.query_params.get('status')
        if standard:
            queryset = queryset.filter(standard=standard)
        if status_f:
            queryset = queryset.filter(status=status_f)
        return queryset


class CompliancePolicyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = CompliancePolicy.objects.all()
    serializer_class   = CompliancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]


class ComplianceCheckListCreateView(generics.ListCreateAPIView):
    serializer_class   = ComplianceCheckSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ComplianceCheck.objects.filter(policy_id=self.kwargs['policy_id'])

    def perform_create(self, serializer):
        serializer.save(
            policy_id  = self.kwargs['policy_id'],
            checked_by = self.request.user,
            checked_at = timezone.now()
        )


class PolicyViolationListCreateView(generics.ListCreateAPIView):
    serializer_class   = PolicyViolationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = PolicyViolation.objects.all()
        severity = self.request.query_params.get('severity')
        status_f = self.request.query_params.get('status')
        if severity:
            queryset = queryset.filter(severity=severity)
        if status_f:
            queryset = queryset.filter(status=status_f)
        return queryset


class PolicyViolationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = PolicyViolation.objects.all()
    serializer_class   = PolicyViolationSerializer
    permission_classes = [permissions.IsAuthenticated]


class ResolveViolationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            violation = PolicyViolation.objects.get(pk=pk)
        except PolicyViolation.DoesNotExist:
            return Response({'detail': 'Violation not found.'}, status=status.HTTP_404_NOT_FOUND)

        violation.status      = PolicyViolation.Status.RESOLVED
        violation.resolved_by = request.user
        violation.resolved_at = timezone.now()
        violation.save()
        return Response(PolicyViolationSerializer(violation).data)


class ComplianceSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        policies   = CompliancePolicy.objects.all()
        checks     = ComplianceCheck.objects.all()
        violations = PolicyViolation.objects.all()
        total      = checks.count()
        passed     = checks.filter(result='passed').count()
        summary    = {
            'total_policies'     : policies.count(),
            'active_policies'    : policies.filter(status='active').count(),
            'total_checks'       : total,
            'passed_checks'      : passed,
            'failed_checks'      : checks.filter(result='failed').count(),
            'compliance_rate'    : round((passed / total * 100), 1) if total > 0 else 0,
            'open_violations'    : violations.filter(status='open').count(),
            'critical_violations': violations.filter(severity='critical', status='open').count(),
        }
        return Response(summary)