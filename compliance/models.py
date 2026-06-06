from django.db import models
from django.conf import settings


class CompliancePolicy(models.Model):

    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        INACTIVE = 'inactive', 'Inactive'
        DRAFT    = 'draft',    'Draft'

    class Standard(models.TextChoices):
        ISO27001 = 'iso27001', 'ISO 27001'
        SOC2     = 'soc2',     'SOC 2'
        GDPR     = 'gdpr',     'GDPR'
        HIPAA    = 'hipaa',    'HIPAA'
        PCI_DSS  = 'pci_dss',  'PCI DSS'
        CUSTOM   = 'custom',   'Custom'

    name        = models.CharField(max_length=200)
    description = models.TextField()
    standard    = models.CharField(max_length=10, choices=Standard.choices, default=Standard.CUSTOM)
    status      = models.CharField(max_length=10, choices=Status.choices,   default=Status.DRAFT)
    version     = models.CharField(max_length=20, default='1.0')
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.standard})"

    class Meta:
        ordering = ['-created_at']


class ComplianceCheck(models.Model):

    class Result(models.TextChoices):
        PASSED  = 'passed',  'Passed'
        FAILED  = 'failed',  'Failed'
        WARNING = 'warning', 'Warning'
        SKIPPED = 'skipped', 'Skipped'

    policy      = models.ForeignKey(CompliancePolicy, on_delete=models.CASCADE, related_name='checks')
    title       = models.CharField(max_length=200)
    description = models.TextField()
    result      = models.CharField(max_length=10, choices=Result.choices, default=Result.SKIPPED)
    evidence    = models.TextField(blank=True, null=True)
    notes       = models.TextField(blank=True, null=True)
    checked_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True)
    checked_at  = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.result}"

    class Meta:
        ordering = ['-created_at']


class PolicyViolation(models.Model):

    class Severity(models.TextChoices):
        LOW      = 'low',      'Low'
        MEDIUM   = 'medium',   'Medium'
        HIGH     = 'high',     'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN     = 'open',     'Open'
        RESOLVED = 'resolved', 'Resolved'
        ACCEPTED = 'accepted', 'Accepted Risk'

    policy      = models.ForeignKey(CompliancePolicy, on_delete=models.CASCADE, related_name='violations')
    title       = models.CharField(max_length=200)
    description = models.TextField()
    severity    = models.CharField(max_length=10, choices=Severity.choices)
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.severity})"

    class Meta:
        ordering = ['-detected_at']