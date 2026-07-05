import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import CustomUser
from monitoring.models import Server, MetricSnapshot, NetworkDevice
from alerts.models import AlertRule, Alert, NotificationChannel, Notification
from incidents.models import Incident, IncidentComment, IncidentEscalation, IncidentTimeline
from automation.models import AutomationTask, TaskExecutionLog, BackupConfig, Workflow
from analytics.models import AnomalyDetection, PredictiveInsight, PerformanceTrend
from reports.models import Report, ScheduledReport
from compliance.models import CompliancePolicy, ComplianceCheck, PolicyViolation

TEST_PASSWORD = "TestPass123!"


class Command(BaseCommand):
    help = "Seed the database with test data covering every role and feature for manual/QA testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete previously seeded test data (identified by a 'seed-' prefix) before creating new data.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.flush_seed_data()

        self.stdout.write(self.style.WARNING("Seeding test data..."))

        users = self.seed_users()
        servers = self.seed_servers()
        self.seed_network_devices()
        self.seed_metrics(servers)
        rules = self.seed_alert_rules(servers, users)
        alerts = self.seed_alerts(servers, rules, users)
        self.seed_notifications(users, alerts)
        self.seed_incidents(servers, alerts, users)
        self.seed_automation(servers, users)
        self.seed_analytics(servers, users)
        self.seed_reports(users)
        self.seed_compliance(users)

        self.stdout.write(self.style.SUCCESS("\nSeed complete. Login with any of:"))
        for role, user in users.items():
            self.stdout.write(f"  {user.username:<20} / {TEST_PASSWORD:<15} (role={role})")

    # ------------------------------------------------------------------ users
    def seed_users(self):
        roles = ["admin", "operator", "auditor", "viewer"]
        users = {}
        for role in roles:
            username = f"seed-{role}"
            user, _ = CustomUser.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "first_name": role.capitalize(),
                    "last_name": "Seed",
                    "role": role,
                    "department": "IT Operations",
                    "is_staff": role == "admin",
                    "is_superuser": role == "admin",
                },
            )
            user.set_password(TEST_PASSWORD)
            user.save()
            users[role] = user
        self.stdout.write(self.style.SUCCESS(f"  users: {len(users)} (one per role)"))
        return users

    # ---------------------------------------------------------------- servers
    def seed_servers(self):
        specs = [
            ("seed-web-01", "10.10.1.11", "physical", "online"),
            ("seed-db-01",  "10.10.1.12", "physical", "warning"),
            ("seed-app-01", "10.10.1.13", "virtual",  "online"),
            ("seed-cache-01", "10.10.1.14", "container", "critical"),
        ]
        servers = []
        for name, ip, stype, status in specs:
            server, _ = Server.objects.update_or_create(
                hostname=f"{name}.local",
                defaults={
                    "name": name,
                    "ip_address": ip,
                    "server_type": stype,
                    "status": status,
                    "location": "DC-1 Rack 4",
                    "os": "Ubuntu 22.04",
                    "cpu_cores": 8,
                    "ram_gb": 32,
                    "disk_gb": 500,
                    "is_active": True,
                },
            )
            servers.append(server)
        self.stdout.write(self.style.SUCCESS(f"  servers: {len(servers)}"))
        return servers

    def seed_network_devices(self):
        specs = [
            ("seed-switch-01", "switch", "10.10.0.1", "online"),
            ("seed-fw-01", "firewall", "10.10.0.2", "warning"),
        ]
        count = 0
        for name, dtype, ip, status in specs:
            NetworkDevice.objects.update_or_create(
                name=name,
                defaults={"device_type": dtype, "ip_address": ip, "status": status, "location": "DC-1 Rack 1"},
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  network devices: {count}"))

    def seed_metrics(self, servers):
        now = timezone.now()
        count = 0
        for server in servers:
            for i in range(24):
                MetricSnapshot.objects.create(
                    server=server,
                    cpu_usage=random.uniform(20, 95),
                    memory_usage=random.uniform(30, 90),
                    disk_usage=random.uniform(40, 85),
                    network_in=random.uniform(1, 100),
                    network_out=random.uniform(1, 100),
                    cpu_temp=random.uniform(35, 75),
                    uptime_seconds=random.randint(3600, 8_000_000),
                    timestamp=now - timedelta(hours=i),
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  metric snapshots: {count}"))

    # ----------------------------------------------------------------- alerts
    def seed_alert_rules(self, servers, users):
        rules = []
        specs = [
            ("High CPU", "cpu_usage", "gt", 85, "critical"),
            ("High Memory", "memory_usage", "gt", 80, "warning"),
            ("Disk Space Low", "disk_usage", "gt", 90, "critical"),
        ]
        for name, metric, op, threshold, severity in specs:
            rule, _ = AlertRule.objects.update_or_create(
                name=f"seed-{name}",
                defaults={
                    "server": servers[0],
                    "metric": metric,
                    "operator": op,
                    "threshold": threshold,
                    "severity": severity,
                    "is_active": True,
                    "created_by": users["admin"],
                },
            )
            rules.append(rule)
        self.stdout.write(self.style.SUCCESS(f"  alert rules: {len(rules)}"))
        return rules

    def seed_alerts(self, servers, rules, users):
        alerts = []
        for i, server in enumerate(servers):
            rule = rules[i % len(rules)]
            alert = Alert.objects.create(
                rule=rule,
                server=server,
                severity=rule.severity,
                status="active" if i % 2 == 0 else "acknowledged",
                message=f"{rule.metric} exceeded threshold on {server.name}",
                metric_value=rule.threshold + random.uniform(1, 10),
                acknowledged_by=users["operator"] if i % 2 else None,
                acknowledged_at=timezone.now() if i % 2 else None,
            )
            alerts.append(alert)
        self.stdout.write(self.style.SUCCESS(f"  alerts: {len(alerts)}"))
        return alerts

    def seed_notifications(self, users, alerts):
        count = 0
        for role, user in users.items():
            channel, _ = NotificationChannel.objects.update_or_create(
                user=user, channel_type="in_app", defaults={"target": "in_app", "is_active": True}
            )
            for alert in alerts[:2]:
                Notification.objects.create(
                    alert=alert,
                    channel=channel,
                    status="sent",
                    is_read=False,
                    sent_at=timezone.now(),
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  notifications: {count} (2 unread per user)"))

    # -------------------------------------------------------------- incidents
    def seed_incidents(self, servers, alerts, users):
        specs = [
            ("Web server intermittent 500s", "high", "open", "software"),
            ("Database replication lag", "critical", "in_progress", "performance"),
            ("Cache node unresponsive", "medium", "resolved", "hardware"),
        ]
        count = 0
        for i, (title, priority, status, category) in enumerate(specs):
            incident, created = Incident.objects.update_or_create(
                title=f"seed-{title}",
                defaults={
                    "description": f"Seeded test incident: {title}",
                    "priority": priority,
                    "status": status,
                    "category": category,
                    "server": servers[i % len(servers)],
                    "alert": alerts[i % len(alerts)],
                    "created_by": users["operator"],
                    "assigned_to": users["operator"] if status != "open" else None,
                    "resolved_by": users["operator"] if status == "resolved" else None,
                    "resolved_at": timezone.now() if status == "resolved" else None,
                },
            )
            IncidentTimeline.objects.get_or_create(
                incident=incident, action="Incident created", performed_by=users["operator"]
            )
            IncidentComment.objects.get_or_create(
                incident=incident,
                author=users["operator"],
                defaults={"message": "Initial triage in progress."},
            )
            if status in ("in_progress", "resolved"):
                IncidentEscalation.objects.get_or_create(
                    incident=incident,
                    escalated_by=users["operator"],
                    escalated_to=users["admin"],
                    defaults={"reason": "Needs senior review."},
                )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  incidents: {count} (with comments/timeline/escalation)"))

    # ------------------------------------------------------------- automation
    def seed_automation(self, servers, users):
        task, _ = AutomationTask.objects.update_or_create(
            name="seed-nightly-backup",
            defaults={
                "description": "Seeded nightly backup task",
                "task_type": "backup",
                "status": "completed",
                "trigger_type": "scheduled",
                "server": servers[0],
                "created_by": users["operator"],
                "script": "backup.sh --full",
                "started_at": timezone.now() - timedelta(hours=1),
                "completed_at": timezone.now(),
            },
        )
        TaskExecutionLog.objects.get_or_create(
            task=task, level="success", defaults={"message": "Backup completed successfully", "output": "OK"}
        )
        BackupConfig.objects.update_or_create(
            name="seed-db-backup-config",
            server=servers[1],
            defaults={
                "backup_type": "full",
                "frequency": "daily",
                "destination": "/backups/db",
                "retention_days": 14,
                "created_by": users["admin"],
                "last_run": timezone.now() - timedelta(days=1),
                "next_run": timezone.now() + timedelta(hours=23),
            },
        )
        Workflow.objects.update_or_create(
            name="seed-incident-response-workflow",
            defaults={
                "description": "Seeded workflow for testing",
                "status": "active",
                "steps": [{"step": "notify"}, {"step": "diagnose"}, {"step": "remediate"}],
                "created_by": users["admin"],
            },
        )
        self.stdout.write(self.style.SUCCESS("  automation: 1 task + log, 1 backup config, 1 workflow"))

    # -------------------------------------------------------------- analytics
    def seed_analytics(self, servers, users):
        AnomalyDetection.objects.update_or_create(
            server=servers[0],
            metric="cpu_usage",
            defaults={
                "detected_value": 97.5,
                "expected_value": 60.0,
                "deviation": 62.5,
                "severity": "critical",
                "status": "open",
                "description": "Seeded anomaly: sustained CPU spike",
                "recommendation": "Investigate runaway process.",
            },
        )
        PredictiveInsight.objects.update_or_create(
            server=servers[1],
            insight_type="capacity",
            title="seed-Disk capacity warning",
            defaults={
                "description": "Disk usage trending toward capacity limit.",
                "recommendation": "Add storage or archive old data.",
                "confidence": 82.0,
                "risk_score": 68.0,
                "status": "active",
                "predicted_date": timezone.now() + timedelta(days=14),
            },
        )
        for i in range(5):
            PerformanceTrend.objects.create(
                server=servers[0],
                metric="cpu_usage",
                period="daily",
                avg_value=random.uniform(40, 70),
                max_value=random.uniform(70, 99),
                min_value=random.uniform(10, 40),
                trend_direction=random.choice(["up", "down", "stable"]),
            )
        self.stdout.write(self.style.SUCCESS("  analytics: 1 anomaly, 1 insight, 5 trend points"))

    # ---------------------------------------------------------------- reports
    def seed_reports(self, users):
        Report.objects.update_or_create(
            title="seed-Monthly Performance Report",
            defaults={
                "report_type": "performance",
                "status": "completed",
                "format": "pdf",
                "date_from": timezone.now() - timedelta(days=30),
                "date_to": timezone.now(),
                "generated_by": users["auditor"],
                "generated_at": timezone.now(),
            },
        )
        ScheduledReport.objects.update_or_create(
            name="seed-Weekly Compliance Digest",
            defaults={
                "report_type": "compliance",
                "format": "pdf",
                "frequency": "weekly",
                "recipients": ["seed-auditor@example.com"],
                "is_active": True,
                "created_by": users["auditor"],
                "next_run": timezone.now() + timedelta(days=7),
            },
        )
        self.stdout.write(self.style.SUCCESS("  reports: 1 report, 1 scheduled report"))

    # ------------------------------------------------------------- compliance
    def seed_compliance(self, users):
        policy, _ = CompliancePolicy.objects.update_or_create(
            name="seed-Data Retention Policy",
            defaults={
                "description": "Seeded policy for testing compliance module.",
                "standard": "iso27001",
                "status": "active",
                "version": "1.0",
                "created_by": users["admin"],
            },
        )
        ComplianceCheck.objects.update_or_create(
            policy=policy,
            title="seed-Backup retention verified",
            defaults={
                "description": "Verify backups are retained per policy.",
                "result": "passed",
                "checked_by": users["auditor"],
                "checked_at": timezone.now(),
            },
        )
        PolicyViolation.objects.update_or_create(
            policy=policy,
            title="seed-Unencrypted backup found",
            defaults={
                "description": "A backup archive was found unencrypted.",
                "severity": "high",
                "status": "open",
            },
        )
        self.stdout.write(self.style.SUCCESS("  compliance: 1 policy, 1 check, 1 violation"))

    # ------------------------------------------------------------------ flush
    def flush_seed_data(self):
        self.stdout.write(self.style.WARNING("Flushing previously seeded data..."))
        Incident.objects.filter(title__startswith="seed-").delete()
        Alert.objects.filter(message__icontains="seed").delete()
        AlertRule.objects.filter(name__startswith="seed-").delete()
        Notification.objects.filter(channel__user__username__startswith="seed-").delete()
        AutomationTask.objects.filter(name__startswith="seed-").delete()
        BackupConfig.objects.filter(name__startswith="seed-").delete()
        Workflow.objects.filter(name__startswith="seed-").delete()
        AnomalyDetection.objects.filter(description__startswith="Seeded anomaly").delete()
        PredictiveInsight.objects.filter(title__startswith="seed-").delete()
        Report.objects.filter(title__startswith="seed-").delete()
        ScheduledReport.objects.filter(name__startswith="seed-").delete()
        CompliancePolicy.objects.filter(name__startswith="seed-").delete()
        Server.objects.filter(name__startswith="seed-").delete()
        NetworkDevice.objects.filter(name__startswith="seed-").delete()
        CustomUser.objects.filter(username__startswith="seed-").delete()
