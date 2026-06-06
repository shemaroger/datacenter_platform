from django.db import models
from django.utils import timezone


class Server(models.Model):

    class Status(models.TextChoices):
        ONLINE      = 'online',      'Online'
        OFFLINE     = 'offline',     'Offline'
        MAINTENANCE = 'maintenance', 'Maintenance'
        WARNING     = 'warning',     'Warning'
        CRITICAL    = 'critical',    'Critical'

    class ServerType(models.TextChoices):
        PHYSICAL  = 'physical',  'Physical'
        VIRTUAL   = 'virtual',   'Virtual'
        CONTAINER = 'container', 'Container'
        CLOUD     = 'cloud',     'Cloud'

    name         = models.CharField(max_length=100)
    hostname     = models.CharField(max_length=255, unique=True)
    ip_address   = models.GenericIPAddressField()
    server_type  = models.CharField(max_length=20, choices=ServerType.choices, default=ServerType.PHYSICAL)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.ONLINE)
    location     = models.CharField(max_length=100, blank=True, null=True)
    os           = models.CharField(max_length=100, blank=True, null=True)
    cpu_cores    = models.IntegerField(default=1)
    ram_gb       = models.FloatField(default=1.0)
    disk_gb      = models.FloatField(default=50.0)
    description  = models.TextField(blank=True, null=True)
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.ip_address})"

    class Meta:
        ordering = ['-created_at']


class MetricSnapshot(models.Model):
    server          = models.ForeignKey(Server, on_delete=models.CASCADE, related_name='metrics')
    cpu_usage       = models.FloatField(help_text='Percentage 0-100')
    memory_usage    = models.FloatField(help_text='Percentage 0-100')
    disk_usage      = models.FloatField(help_text='Percentage 0-100')
    network_in      = models.FloatField(default=0.0, help_text='MB/s inbound')
    network_out     = models.FloatField(default=0.0, help_text='MB/s outbound')
    cpu_temp        = models.FloatField(blank=True, null=True, help_text='Celsius')
    uptime_seconds  = models.BigIntegerField(default=0)
    timestamp       = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.server.name} @ {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']


class NetworkDevice(models.Model):

    class DeviceType(models.TextChoices):
        SWITCH   = 'switch',   'Switch'
        ROUTER   = 'router',   'Router'
        FIREWALL = 'firewall', 'Firewall'
        LOAD_BALANCER = 'load_balancer', 'Load Balancer'

    class Status(models.TextChoices):
        ONLINE  = 'online',  'Online'
        OFFLINE = 'offline', 'Offline'
        WARNING = 'warning', 'Warning'

    name        = models.CharField(max_length=100)
    device_type = models.CharField(max_length=20, choices=DeviceType.choices)
    ip_address  = models.GenericIPAddressField()
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.ONLINE)
    location    = models.CharField(max_length=100, blank=True, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.device_type})"

    class Meta:
        ordering = ['-created_at']