from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    
    class Role(models.TextChoices):
        ADMIN       = 'admin',       'Admin'
        OPERATOR    = 'operator',    'Operator'
        VIEWER      = 'viewer',      'Viewer'
        AUDITOR     = 'auditor',     'Auditor'

    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    phone           = models.CharField(max_length=20, blank=True, null=True)
    department      = models.CharField(max_length=100, blank=True, null=True)
    is_mfa_enabled  = models.BooleanField(default=False)
    last_activity   = models.DateTimeField(blank=True, null=True)
    avatar          = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"