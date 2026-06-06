from django.contrib import admin
from .models import CompliancePolicy, ComplianceCheck, PolicyViolation

@admin.register(CompliancePolicy)
class CompliancePolicyAdmin(admin.ModelAdmin):
    list_display  = ['name', 'standard', 'status', 'version', 'created_at']
    list_filter   = ['standard', 'status']

@admin.register(ComplianceCheck)
class ComplianceCheckAdmin(admin.ModelAdmin):
    list_display  = ['title', 'policy', 'result', 'checked_by', 'checked_at']
    list_filter   = ['result']

@admin.register(PolicyViolation)
class PolicyViolationAdmin(admin.ModelAdmin):
    list_display  = ['title', 'policy', 'severity', 'status', 'detected_at']
    list_filter   = ['severity', 'status']