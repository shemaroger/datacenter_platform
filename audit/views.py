from django.utils.dateparse import parse_datetime
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog
from .serializers import AuditLogSerializer
from .permissions import IsAdminOrAuditor


class AuditLogListView(generics.ListAPIView):
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdminOrAuditor]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        params = self.request.query_params

        user_id    = params.get('user')
        action     = params.get('action')
        model_name = params.get('model')
        date_from  = params.get('date_from')
        date_to    = params.get('date_to')
        search     = params.get('search')

        if user_id:
            qs = qs.filter(user_id=user_id)
        if action:
            qs = qs.filter(action=action)
        if model_name:
            qs = qs.filter(model_name=model_name)
        if date_from and parse_datetime(date_from):
            qs = qs.filter(created_at__gte=date_from)
        if date_to and parse_datetime(date_to):
            qs = qs.filter(created_at__lte=date_to)
        if search:
            qs = qs.filter(object_repr__icontains=search)

        return qs


class AuditLogSummaryView(APIView):
    permission_classes = [IsAdminOrAuditor]

    def get(self, request):
        qs = AuditLog.objects.all()
        return Response({
            'total'          : qs.count(),
            'creates'        : qs.filter(action='create').count(),
            'updates'        : qs.filter(action='update').count(),
            'deletes'        : qs.filter(action='delete').count(),
            'logins'         : qs.filter(action='login').count(),
            'failed_logins'  : qs.filter(action='login_failed').count(),
            'models'         : list(qs.exclude(model_name='').order_by().values_list('model_name', flat=True).distinct()),
        })
