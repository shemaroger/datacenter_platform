from django.contrib import admin
from .models import Server, MetricSnapshot, NetworkDevice

@admin.register(Server)
class ServerAdmin(admin.ModelAdmin):
    list_display  = ['name', 'hostname', 'ip_address', 'server_type', 'status', 'location']
    list_filter   = ['status', 'server_type', 'is_active']
    search_fields = ['name', 'hostname', 'ip_address']

@admin.register(MetricSnapshot)
class MetricSnapshotAdmin(admin.ModelAdmin):
    list_display  = ['server', 'cpu_usage', 'memory_usage', 'disk_usage', 'timestamp']
    list_filter   = ['server']

@admin.register(NetworkDevice)
class NetworkDeviceAdmin(admin.ModelAdmin):
    list_display  = ['name', 'device_type', 'ip_address', 'status', 'location']
    list_filter   = ['device_type', 'status']