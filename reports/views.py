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
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image

from .models import Report, ScheduledReport
from .serializers import ReportSerializer, ScheduledReportSerializer
from monitoring.models import Server, MetricSnapshot
from alerts.models import Alert
from incidents.models import Incident
from automation.models import AutomationTask

logger = logging.getLogger(__name__)

LOGO_PATH = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'images', 'logo-dark-1.png')


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


BRAND_RED  = colors.HexColor('#C0272D')
GRAY_TEXT  = colors.HexColor('#9B9B9B')
GRAY_BG    = colors.HexColor('#F5F5F5')
DARK_TEXT  = colors.HexColor('#1A1A1A')
BORDER     = colors.HexColor('#E0E0E0')


def _fmt_date(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value) if isinstance(value, str) else value
        return dt.strftime('%d %b %Y')
    except (ValueError, TypeError):
        return str(value)


def _red_bar(width, height=0.2*cm):
    bar = Table([['']], colWidths=[width], rowHeights=[height])
    bar.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), BRAND_RED)]))
    return bar


def _build_pdf(report, report_data):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=1*cm, bottomMargin=1*cm, leftMargin=2*cm, rightMargin=2*cm,
    )
    styles = getSampleStyleSheet()
    content_width = A4[0] - 4*cm

    brand_name_style = ParagraphStyle('BrandName', parent=styles['Normal'], fontSize=14, textColor=BRAND_RED, fontName='Helvetica-Bold', leading=16)
    brand_tag_style  = ParagraphStyle('BrandTag', parent=styles['Normal'], fontSize=8, textColor=GRAY_TEXT)
    title_style      = ParagraphStyle('ReportTitle', parent=styles['Normal'], fontSize=15, leading=18, spaceAfter=4, textColor=DARK_TEXT, fontName='Helvetica-Bold', alignment=2)
    type_style       = ParagraphStyle('ReportTypeLabel', parent=styles['Normal'], fontSize=9, leading=11, textColor=GRAY_TEXT, alignment=2)
    label_style      = ParagraphStyle('FieldLabel', parent=styles['Normal'], fontSize=7, textColor=GRAY_TEXT, fontName='Helvetica-Bold')
    value_style      = ParagraphStyle('FieldValue', parent=styles['Normal'], fontSize=10, textColor=DARK_TEXT, fontName='Helvetica-Bold')
    heading_style    = ParagraphStyle('SectionHeading', parent=styles['Normal'], fontSize=10, textColor=BRAND_RED, fontName='Helvetica-Bold', spaceBefore=14, spaceAfter=6)
    footer_style     = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=GRAY_TEXT)

    report_no = f"RPT-{report.id:04d}"
    approved_by = "System Admin"
    date_from = _fmt_date(report_data.get('date_from'))
    date_to   = _fmt_date(report_data.get('date_to'))
    period = f"{date_from} — {date_to}" if date_from and date_to else (date_from or "All time")

    elements = [_red_bar(content_width)]

    # --- brand header row ---
    brand_block = [Paragraph('RSwitch', brand_name_style), Paragraph('money 24/7 &nbsp;&middot;&nbsp; DataCenter Platform', brand_tag_style)]
    title_block = [Paragraph(report.title, title_style), Paragraph(f"Type: {report_data.get('report_type', '').title()}", type_style)]

    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=1.4*cm, height=1.04*cm)
        left_cell = Table([[logo, brand_block]], colWidths=[1.7*cm, 5*cm])
        left_cell.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    else:
        left_cell = brand_block

    header = Table([[left_cell, title_block]], colWidths=[content_width - 8*cm, 8*cm])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 14), ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, BRAND_RED),
    ]))
    elements.append(header)

    # --- info strip ---
    info_fields = [
        ('REPORT NO.', report_no),
        ('CREATED BY', report_data.get('generated_by', 'system')),
        ('APPROVED BY', approved_by),
        ('DATE', _fmt_date(report_data.get('generated_at')) or '—'),
        ('PERIOD', period),
    ]
    info_row = [[Paragraph(label, label_style) for label, _ in info_fields]]
    info_row.append([Paragraph(value, value_style) for _, value in info_fields])
    info_table = Table(info_row, colWidths=[content_width/5]*5)
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_BG),
        ('LINEAFTER', (0, 0), (-2, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10), ('BOTTOMPADDING', (1, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 2), ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.6*cm))

    # --- summary ---
    summary = report_data.get('summary', {})
    if summary:
        elements.append(Paragraph('SUMMARY', heading_style))
        summary_rows = [[key.replace('_', ' ').title(), str(value)] for key, value in summary.items()]
        table = Table(summary_rows, colWidths=[content_width/2]*2)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), GRAY_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)

    # --- details ---
    details = report_data.get('details', [])
    if details:
        elements.append(Paragraph(f'DETAILS ({len(details)} records)', heading_style))
        headers = list(details[0].keys())
        cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=7.5, leading=9)
        header_style = ParagraphStyle('CellHeader', parent=cell_style, textColor=colors.white, fontName='Helvetica-Bold')

        rows = [[Paragraph(h.replace('_', ' ').title(), header_style) for h in headers]]
        for row in details:
            rows.append([Paragraph(str(row.get(h, '—')), cell_style) for h in headers])

        col_width = content_width / len(headers)
        table = Table(rows, colWidths=[col_width] * len(headers), repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_RED),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRAY_BG]),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

    # --- signatures ---
    elements.append(Paragraph('SIGNATURES', heading_style))
    prepared_by = report_data.get('generated_by', 'system')
    prepared_date = _fmt_date(report_data.get('generated_at')) or '—'
    sig_cells = [
        [Paragraph('PREPARED BY', label_style), Paragraph('REVIEWED BY', label_style), Paragraph('APPROVED BY', label_style)],
        [Paragraph(prepared_by, value_style), Paragraph('_' * 24, styles['Normal']), Paragraph('_' * 24, styles['Normal'])],
        [Paragraph(prepared_date, footer_style), Paragraph('Date: _______________', footer_style), Paragraph('Date: _______________', footer_style)],
    ]
    sig_table = Table(sig_cells, colWidths=[content_width/3]*3)
    sig_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_BG),
        ('LINEAFTER', (0, 0), (-2, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 12), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 0.8*cm))

    # --- footer ---
    footer = Table([[
        Paragraph(f"RSwitch DataCenter Platform &nbsp;&middot;&nbsp; money 24/7 &nbsp;&middot;&nbsp; {report_no} &nbsp;&middot;&nbsp; Confidential", footer_style),
        Paragraph(_fmt_date(report_data.get('generated_at')) or '—', ParagraphStyle('FooterRight', parent=footer_style, alignment=2)),
    ]], colWidths=[content_width/2]*2)
    footer.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(footer)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(_red_bar(content_width))

    doc.build(elements)
    buffer.seek(0)
    return buffer


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

            elif report.format == 'pdf':
                pdf_buffer = _build_pdf(report, report_data)
                response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}.pdf"'
                return response

            else:  # json format
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