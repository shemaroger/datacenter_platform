from django.apps import apps
from django.db.models.signals import post_save, post_delete
from django.forms.models import model_to_dict

from .middleware import get_current_request

AUDITED_APP_LABELS = [
    'monitoring', 'alerts', 'incidents', 'automation',
    'analytics', 'users', 'reports', 'compliance',
]

# High-frequency telemetry / self-referential logs — auditing them would
# flood the log with noise rather than meaningful account activity.
EXCLUDED_MODELS = {'metricsnapshot', 'incidenttimeline', 'taskexecutionlog'}


def _actor():
    request = get_current_request()
    user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'is_authenticated', False):
        return None, ''
    return user, user.username


def _serialize(instance):
    try:
        data = model_to_dict(instance)
    except Exception:
        return {}
    safe = {}
    for key, value in data.items():
        if key == 'password':
            continue
        safe[key] = str(value) if value is not None else None
    return safe


def _log(instance, action):
    from .models import AuditLog

    user, username = _actor()
    request = get_current_request()
    ip = request.META.get('REMOTE_ADDR') if request else None

    AuditLog.objects.create(
        user=user,
        username=username,
        action=action,
        app_label=instance._meta.app_label,
        model_name=instance._meta.model_name,
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changes=_serialize(instance),
        ip_address=ip,
    )


def make_save_handler():
    def handler(sender, instance, created, **kwargs):
        _log(instance, AuditLogAction.CREATE if created else AuditLogAction.UPDATE)
    return handler


def make_delete_handler():
    def handler(sender, instance, **kwargs):
        _log(instance, AuditLogAction.DELETE)
    return handler


class AuditLogAction:
    CREATE = 'create'
    UPDATE = 'update'
    DELETE = 'delete'


def connect_all():
    save_handler = make_save_handler()
    delete_handler = make_delete_handler()

    for model in apps.get_models():
        if model._meta.app_label not in AUDITED_APP_LABELS:
            continue
        if model._meta.model_name in EXCLUDED_MODELS:
            continue
        if model.__name__ == 'AuditLog':
            continue
        post_save.connect(save_handler, sender=model, dispatch_uid=f'audit_save_{model._meta.label}')
        post_delete.connect(delete_handler, sender=model, dispatch_uid=f'audit_delete_{model._meta.label}')
