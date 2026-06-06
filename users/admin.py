from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display  = ['username', 'email', 'role', 'department', 'is_active']
    list_filter   = ['role', 'is_active', 'is_mfa_enabled']
    fieldsets     = UserAdmin.fieldsets + (
        ('Platform Info', {'fields': ('role', 'phone', 'department', 'is_mfa_enabled', 'last_activity')}),
    )