from django.db import models
from django.conf import settings


class Report(models.Model):

    class ReportType(models.TextChoices):
        PERFORMANCE  = 'performance',  'Performance'
        HEALTH       = 'health',       'Health'
        COMPLIANCE   = 'compliance',   'Compliance'
        INCIDENT     = 'incident',     'Incident'
        AVAILABILITY = 'availability', 'Availability'
        CUSTOM       = 'custom',       'Custom'

    class Status(models.TextChoices):
        PENDING    = 'pending',    'Pending'
        GENERATING = 'generating', 'Generating'
        COMPLETED  = 'completed',  'Completed'
        FAILED     = 'failed',     'Failed'

    class Format(models.TextChoices):
        PDF  = 'pdf',  'PDF'
        CSV  = 'csv',  'CSV'
        JSON = 'json', 'JSON'

    title        = models.CharField(max_length=200)
    report_type  = models.CharField(max_length=15, choices=ReportType.choices)
    status       = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    format       = models.CharField(max_length=5,  choices=Format.choices, default=Format.PDF)
    parameters   = models.JSONField(default=dict, blank=True)
    date_from    = models.DateTimeField(null=True, blank=True)
    date_to      = models.DateTimeField(null=True, blank=True)
    file_path    = models.CharField(max_length=500, blank=True, null=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, related_name='reports')
    generated_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.report_type})"

    class Meta:
        ordering = ['-created_at']


class ScheduledReport(models.Model):

    class Frequency(models.TextChoices):
        DAILY   = 'daily',   'Daily'
        WEEKLY  = 'weekly',  'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    name         = models.CharField(max_length=200)
    report_type  = models.CharField(max_length=15, choices=Report.ReportType.choices)
    format       = models.CharField(max_length=5,  choices=Report.Format.choices, default=Report.Format.PDF)
    frequency    = models.CharField(max_length=10, choices=Frequency.choices)
    parameters   = models.JSONField(default=dict, blank=True)
    recipients   = models.JSONField(default=list,  help_text='List of email addresses')
    is_active    = models.BooleanField(default=True)
    last_run     = models.DateTimeField(null=True, blank=True)
    next_run     = models.DateTimeField(null=True, blank=True)
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.frequency})"

    class Meta:
        ordering = ['-created_at']