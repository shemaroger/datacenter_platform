from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Incident, IncidentComment, IncidentEscalation, IncidentTimeline
from .serializers import (
    IncidentSerializer, IncidentCommentSerializer,
    IncidentEscalationSerializer, IncidentTimelineSerializer
)


def log_timeline(incident, action, user):
    IncidentTimeline.objects.create(
        incident=incident,
        action=action,
        performed_by=user
    )


class IncidentListCreateView(generics.ListCreateAPIView):
    serializer_class   = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Incident.objects.all()
        status_f  = self.request.query_params.get('status')
        priority  = self.request.query_params.get('priority')
        category  = self.request.query_params.get('category')
        assigned  = self.request.query_params.get('assigned_to_me')
        if status_f:
            queryset = queryset.filter(status=status_f)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)
        if assigned:
            queryset = queryset.filter(assigned_to=self.request.user)
        return queryset

    def perform_create(self, serializer):
        incident = serializer.save(created_by=self.request.user)
        log_timeline(incident, 'Incident created', self.request.user)


class IncidentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Incident.objects.all()
    serializer_class   = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        incident = serializer.save()
        log_timeline(incident, 'Incident updated', self.request.user)


class AssignIncidentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            incident = Incident.objects.get(pk=pk)
        except Incident.DoesNotExist:
            return Response({'detail': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)

        assigned_to_id = request.data.get('assigned_to')
        if not assigned_to_id:
            return Response({'detail': 'assigned_to is required.'}, status=status.HTTP_400_BAD_REQUEST)

        incident.assigned_to = request.user.__class__.objects.get(pk=assigned_to_id)
        incident.status      = Incident.Status.IN_PROGRESS
        incident.save()
        log_timeline(incident, f'Assigned to user #{assigned_to_id}', request.user)
        return Response(IncidentSerializer(incident, context={'request': request}).data)


class ResolveIncidentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            incident = Incident.objects.get(pk=pk)
        except Incident.DoesNotExist:
            return Response({'detail': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)

        incident.status      = Incident.Status.RESOLVED
        incident.resolved_by = request.user
        incident.resolved_at = timezone.now()
        incident.resolution  = request.data.get('resolution', '')
        incident.root_cause  = request.data.get('root_cause', '')
        incident.save()
        log_timeline(incident, 'Incident resolved', request.user)
        return Response(IncidentSerializer(incident, context={'request': request}).data)


class CloseIncidentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            incident = Incident.objects.get(pk=pk)
        except Incident.DoesNotExist:
            return Response({'detail': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)

        incident.status    = Incident.Status.CLOSED
        incident.closed_at = timezone.now()
        incident.save()
        log_timeline(incident, 'Incident closed', request.user)
        return Response(IncidentSerializer(incident, context={'request': request}).data)


class IncidentCommentListCreateView(generics.ListCreateAPIView):
    serializer_class   = IncidentCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return IncidentComment.objects.filter(incident_id=self.kwargs['incident_id'])

    def perform_create(self, serializer):
        incident = Incident.objects.get(pk=self.kwargs['incident_id'])
        serializer.save(author=self.request.user, incident=incident)
        log_timeline(incident, 'Comment added', self.request.user)


class IncidentEscalationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            incident = Incident.objects.get(pk=pk)
        except Incident.DoesNotExist:
            return Response({'detail': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = IncidentEscalationSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(incident=incident, escalated_by=request.user)
            log_timeline(incident, 'Incident escalated', request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IncidentSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        incidents = Incident.objects.all()
        summary   = {
            'total'       : incidents.count(),
            'open'        : incidents.filter(status='open').count(),
            'in_progress' : incidents.filter(status='in_progress').count(),
            'resolved'    : incidents.filter(status='resolved').count(),
            'closed'      : incidents.filter(status='closed').count(),
            'critical'    : incidents.filter(priority='critical', status='open').count(),
            'high'        : incidents.filter(priority='high',     status='open').count(),
            'assigned_to_me' : incidents.filter(assigned_to=request.user).count(),
        }
        return Response(summary)