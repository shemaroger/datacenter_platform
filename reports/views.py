from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
import json
import csv
import io
import os
import logging

from .models import Report, ScheduledReport
from .serializers import ReportSerializer, ScheduledReportSerializer
from monitoring.models import Server, MetricSnapshot
from alerts.models import Alert
from incidents.models import Incident
from automation.models import AutomationTask

logger = logging.getLogger(__name__)


def generate_report_data(report):
    """Generate report data based on report type"""
    data = {
        'report_id': report.id,
        'title': report.title,
        'report_type': report.report_type,
        'generated_at': timezone.now().isoformat(),
        'generated_by': report.generated_by.username if report.generated_by else 'system',
        'date_from': report.date_from.isoformat() if report.date_from else None,
        'date_to': report.date_to.isoformat() if report.date_to else None,
        'summary': {},
        'details': [],
    }

    if report.report_type == 'performance':
        servers = Server.objects.filter(is_active=True)
        details = []
        total_cpu = 0
        total_memory = 0
        total_disk = 0
        servers_with_metrics = 0
        
        for server in servers:
            metrics = MetricSnapshot.objects.filter(server=server).order_by('-timestamp')[:100]
            if metrics.exists():
                servers_with_metrics += 1
                avg_cpu = sum(m.cpu_usage for m in metrics) / len(metrics)
                avg_memory = sum(m.memory_usage for m in metrics) / len(metrics)
                avg_disk = sum(m.disk_usage for m in metrics) / len(metrics)
                total_cpu += avg_cpu
                total_memory += avg_memory
                total_disk += avg_disk
                details.append({
                    'server': server.name,
                    'ip_address': server.ip_address,
                    'status': server.status,
                    'avg_cpu': round(avg_cpu, 2),
                    'avg_memory': round(avg_memory, 2),
                    'avg_disk': round(avg_disk, 2),
                    'samples': metrics.count(),
                })
        
        data['summary'] = {
            'total_servers': servers.count(),
            'online_servers': servers.filter(status='online').count(),
            'servers_with_metrics': servers_with_metrics,
            'avg_cpu_all': round(total_cpu / servers_with_metrics, 2) if servers_with_metrics > 0 else 0,
            'avg_memory_all': round(total_memory / servers_with_metrics, 2) if servers_with_metrics > 0 else 0,
            'avg_disk_all': round(total_disk / servers_with_metrics, 2) if servers_with_metrics > 0 else 0,
        }
        data['details'] = details

    elif report.report_type == 'health':
        servers = Server.objects.filter(is_active=True)
        data['summary'] = {
            'total': servers.count(),
            'online': servers.filter(status='online').count(),
            'offline': servers.filter(status='offline').count(),
            'warning': servers.filter(status='warning').count(),
            'critical': servers.filter(status='critical').count(),
            'maintenance': servers.filter(status='maintenance').count(),
        }
        data['details'] = [
            {
                'name': s.name,
                'hostname': s.hostname,
                'ip_address': s.ip_address,
                'status': s.status,
                'server_type': s.server_type,
                'os': s.os,
                'location': s.location,
                'cpu_cores': s.cpu_cores,
                'ram_gb': s.ram_gb,
                'disk_gb': s.disk_gb,
            }
            for s in servers
        ]

    elif report.report_type == 'incident':
        incidents = Incident.objects.all().order_by('-created_at')
        data['summary'] = {
            'total': incidents.count(),
            'open': incidents.filter(status='open').count(),
            'in_progress': incidents.filter(status='in_progress').count(),
            'resolved': incidents.filter(status='resolved').count(),
            'closed': incidents.filter(status='closed').count(),
            'critical': incidents.filter(priority='critical').count(),
            'high': incidents.filter(priority='high').count(),
        }
        data['details'] = [
            {
                'id': i.id,
                'title': i.title,
                'priority': i.priority,
                'status': i.status,
                'category': i.category,
                'created_by': i.created_by.username if i.created_by else '—',
                'assigned_to': i.assigned_to.username if i.assigned_to else 'Unassigned',
                'server': i.server.name if i.server else '—',
                'created_at': i.created_at.isoformat(),
                'resolved_at': i.resolved_at.isoformat() if i.resolved_at else '—',
            }
            for i in incidents[:100]
        ]

    elif report.report_type == 'availability':
        servers = Server.objects.filter(is_active=True)
        online = servers.filter(status='online').count()
        total = servers.count()
        rate = round((online / total * 100), 2) if total > 0 else 0
        data['summary'] = {
            'availability_rate': rate,
            'total_servers': total,
            'online': online,
            'offline': servers.filter(status='offline').count(),
            'warning': servers.filter(status='warning').count(),
            'critical': servers.filter(status='critical').count(),
        }
        data['details'] = [
            {
                'name': s.name,
                'status': s.status,
                'location': s.location,
                'available': s.status in ['online', 'warning'],
            }
            for s in servers
        ]

    elif report.report_type in ['compliance', 'custom']:
        alerts = Alert.objects.all()
        tasks = AutomationTask.objects.filter(is_active=True)
        data['summary'] = {
            'total_alerts': alerts.count(),
            'active_alerts': alerts.filter(status='active').count(),
            'resolved_alerts': alerts.filter(status='resolved').count(),
            'total_tasks': tasks.count(),
            'completed_tasks': tasks.filter(status='completed').count(),
            'failed_tasks': tasks.filter(status='failed').count(),
            'pending_tasks': tasks.filter(status='pending').count(),
        }
        data['details'] = [
            {
                'server': a.server.name if a.server else 'N/A',
                'message': a.message,
                'severity': a.severity,
                'status': a.status,
                'created_at': a.created_at.isoformat(),
            }
            for a in alerts.order_by('-created_at')[:50]
        ]

    return data


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Report.objects.all().order_by('-created_at')
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)


class ReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]


class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response(
                {'detail': 'Report not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user has permission
        if report.generated_by and report.generated_by != request.user:
            return Response(
                {'detail': 'You do not have permission to generate this report.'},
                status=status.HTTP_403_FORBIDDEN
            )

        report.status = Report.Status.GENERATING
        report.generated_by = request.user
        report.generated_at = timezone.now()
        report.save()

        try:
            report_data = generate_report_data(report)
            
            # Store the data
            report.status = Report.Status.COMPLETED
            report.file_path = json.dumps(report_data)
            report.save()
            
            return Response({
                'detail': 'Report generated successfully.',
                'report': ReportSerializer(report).data,
                'report_data': report_data,
            })
        except Exception as e:
            logger.error(f"Report generation failed: {str(e)}")
            report.status = Report.Status.FAILED
            report.save()
            return Response(
                {'detail': f'Generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DownloadReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response(
                {'detail': 'Report not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if report.status != Report.Status.COMPLETED:
            return Response(
                {'detail': f'Report not generated yet. Current status: {report.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not report.file_path:
            return Response(
                {'detail': 'Report data not available.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report_data = json.loads(report.file_path)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse report data: {e}")
            return Response(
                {'detail': 'Report data corrupted.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Handle different formats
        try:
            if report.format == 'csv':
                output = io.StringIO()
                writer = csv.writer(output)
                details = report_data.get('details', [])
                
                # Write header information
                writer.writerow(['Report Title', report.title])
                writer.writerow(['Generated At', report_data.get('generated_at', '')])
                writer.writerow(['Report Type', report_data.get('report_type', '')])
                writer.writerow(['Generated By', report_data.get('generated_by', '')])
                writer.writerow([])
                writer.writerow(['SUMMARY'])
                for key, value in report_data.get('summary', {}).items():
                    writer.writerow([key.replace('_', ' ').title(), value])
                writer.writerow([])
                writer.writerow(['DETAILS'])
                writer.writerow([])
                
                if details and len(details) > 0:
                    # Write headers
                    headers = details[0].keys()
                    writer.writerow(headers)
                    # Write data rows
                    for row in details:
                        writer.writerow(row.values())
                else:
                    writer.writerow(['No detailed data available'])
                
                response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
                response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}.csv"'
                return response

            else:  # json format (including PDF fallback)
                response = HttpResponse(
                    json.dumps(report_data, indent=2),
                    content_type='application/json'
                )
                response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}.json"'
                return response
                
        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
            return Response(
                {'detail': f'Download failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduledReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScheduledReport.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ScheduledReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ScheduledReport.objects.all()
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsAuthenticated]


class ReportSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = Report.objects.all()
        summary = {
            'total': reports.count(),
            'pending': reports.filter(status='pending').count(),
            'completed': reports.filter(status='completed').count(),
            'failed': reports.filter(status='failed').count(),
            'scheduled': ScheduledReport.objects.filter(is_active=True).count(),
        }
        return Response(summary)