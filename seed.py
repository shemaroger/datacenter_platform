from users.models import CustomUser
from monitoring.models import Server
from alerts.models import Alert, AlertRule
from incidents.models import Incident
from automation.models import AutomationTask, BackupConfig, Workflow
from compliance.models import CompliancePolicy, ComplianceCheck, PolicyViolation
from analytics.models import AnomalyDetection, PredictiveInsight, PerformanceTrend
from django.utils import timezone
from datetime import timedelta

admin = CustomUser.objects.filter(is_superuser=True).first()
servers = list(Server.objects.filter(is_active=True))
print(f"Admin: {admin}, Servers: {len(servers)}")

r1,_ = AlertRule.objects.get_or_create(name="CPU Critical",   defaults={"metric_type":"cpu_usage",    "threshold":90,   "severity":"critical","is_active":True,"created_by":admin})
r2,_ = AlertRule.objects.get_or_create(name="Memory Warning", defaults={"metric_type":"memory_usage", "threshold":80,   "severity":"warning", "is_active":True,"created_by":admin})
r3,_ = AlertRule.objects.get_or_create(name="Disk Critical",  defaults={"metric_type":"disk_usage",   "threshold":85,   "severity":"critical","is_active":True,"created_by":admin})
r4,_ = AlertRule.objects.get_or_create(name="Network Spike",  defaults={"metric_type":"network_in",   "threshold":1000, "severity":"warning", "is_active":True,"created_by":admin})
print(f"Alert rules: {AlertRule.objects.count()}")

for msg, severity, st, idx, rule in [
    ("High CPU on server-01",    "critical", "active",       0, r1),
    ("Memory warning server-02", "warning",  "active",       1, r2),
    ("Disk space critical",      "critical", "acknowledged", 2, r3),
    ("Network latency spike",    "warning",  "active",       0, r4),
    ("CPU threshold exceeded",   "info",     "resolved",     1, r1),
    ("Memory usage high",        "critical", "active",       2, r2),
    ("Disk almost full",         "warning",  "resolved",     0, r3),
    ("Service unreachable",      "critical", "active",       1, r1),
]:
    server = servers[idx] if idx < len(servers) else None
    Alert.objects.get_or_create(message=msg, defaults={"severity":severity,"status":st,"server":server,"metric_value":95.0,"rule":rule})
print(f"Alerts: {Alert.objects.count()}")

for title, desc, priority, category, st, idx in [
    ("CPU spike on server-01",        "CPU above 90% for 30 minutes",  "critical", "performance", "open",        0),
    ("Memory leak on server-02",      "Memory at 87% and climbing",    "high",     "performance", "in_progress", 1),
    ("Disk space warning",            "Disk usage exceeded 80%",       "medium",   "hardware",    "open",        2),
    ("Network connectivity issues",   "Packet loss between servers",   "high",     "network",     "open",        -1),
    ("Backup job failed",             "Backup at 02 AM failed",        "medium",   "software",    "resolved",    0),
    ("Unauthorized login attempt",    "Multiple failed SSH attempts",  "critical", "security",    "open",        1),
    ("Service restart after update",  "nginx requires manual restart", "low",      "software",    "closed",      0),
    ("Database connection pool full", "PostgreSQL at max connections", "critical", "software",    "in_progress", 2),
]:
    server = servers[idx] if 0 <= idx < len(servers) else None
    Incident.objects.get_or_create(title=title, defaults={"description":desc,"priority":priority,"category":category,"status":st,"server":server,"created_by":admin})
print(f"Incidents: {Incident.objects.count()}")

for name, ttype, st, idx in [
    ("Daily backup server-01",   "backup",        "completed", 0),
    ("System update server-02",  "system_update", "pending",   1),
    ("Log cleanup server-03",    "cleanup",       "completed", 2),
    ("Health check all servers", "health_check",  "running",   0),
    ("SSL cert renewal",         "other",         "failed",    1),
    ("Database optimization",    "other",         "completed", 2),
    ("Security scan",            "health_check",  "pending",   0),
    ("Performance tuning",       "other",         "completed", 1),
]:
    server = servers[idx] if idx < len(servers) else None
    AutomationTask.objects.get_or_create(name=name, defaults={"task_type":ttype,"status":st,"server":server,"description":name+" automated task","is_active":True,"created_by":admin})
print(f"Tasks: {AutomationTask.objects.count()}")

for name, btype, freq, idx in [
    ("Daily Full Backup",  "full",        "daily",   0),
    ("Weekly Incremental", "incremental", "weekly",  1),
    ("Monthly Archive",    "full",        "monthly", 2),
]:
    server = servers[idx] if idx < len(servers) else None
    BackupConfig.objects.get_or_create(name=name, defaults={"backup_type":btype,"frequency":freq,"server":server,"destination":"/backup/"+name.lower().replace(" ","_"),"is_active":True,"created_by":admin})
print(f"Backups: {BackupConfig.objects.count()}")

for name, wtype, active in [
    ("Incident Response",   "auto_remediation", True),
    ("Backup Verification", "scheduled",        True),
    ("Alert Escalation",    "alert_response",   False),
]:
    Workflow.objects.get_or_create(name=name, defaults={"workflow_type":wtype,"is_active":active,"description":name+" workflow","created_by":admin,"steps":[{"step":1,"action":"notify"},{"step":2,"action":"execute"}]})
print(f"Workflows: {Workflow.objects.count()}")

for name, cat, desc in [
    ("Password Policy",       "security",    "Enforce strong passwords"),
    ("Data Backup Policy",    "operational", "Daily backups required"),
    ("Access Control Policy", "security",    "Least privilege access"),
    ("Patch Management",      "operational", "Monthly security patches"),
    ("Audit Logging",         "regulatory",  "All actions must be logged"),
    ("Encryption Standard",   "security",    "AES-256 encryption required"),
]:
    CompliancePolicy.objects.get_or_create(name=name, defaults={"category":cat,"description":desc,"is_active":True,"created_by":admin,"requirements":desc})
print(f"Policies: {CompliancePolicy.objects.count()}")

plist = list(CompliancePolicy.objects.all()[:4])
for st, pi, si in [("passed",0,0),("failed",1,1),("passed",2,2),("warning",3,0),("passed",0,1),("failed",1,2)]:
    policy = plist[pi] if pi < len(plist) else None
    server = servers[si] if si < len(servers) else None
    if policy:
        ComplianceCheck.objects.get_or_create(policy=policy, server=server, defaults={"status":st,"checked_by":admin,"notes":"Check: "+st,"checked_at":timezone.now()})
print(f"Checks: {ComplianceCheck.objects.count()}")

for desc, sev, st, pi, si in [
    ("Weak password detected",      "high",     "open",     0, 0),
    ("Backup missed",               "medium",   "resolved", 1, 1),
    ("Unauthorized access attempt", "critical", "open",     2, 2),
    ("Patch not applied",           "high",     "open",     3, 0),
]:
    policy = plist[pi] if pi < len(plist) else None
    server = servers[si] if si < len(servers) else None
    if policy:
        PolicyViolation.objects.get_or_create(description=desc, defaults={"severity":sev,"status":st,"policy":policy,"server":server,"detected_by":admin})
print(f"Violations: {PolicyViolation.objects.count()}")

for metric, val, baseline, severity, idx in [
    ("cpu_usage",    95.5,   75.0,  "critical", 0),
    ("memory_usage", 88.0,   70.0,  "warning",  1),
    ("disk_usage",   92.0,   80.0,  "critical", 2),
    ("network_in",   1200.0, 500.0, "warning",  0),
    ("cpu_usage",    85.0,   60.0,  "warning",  1),
]:
    server = servers[idx] if idx < len(servers) else None
    AnomalyDetection.objects.get_or_create(metric_type=metric, server=server, severity=severity, defaults={"detected_value":val,"baseline_value":baseline,"is_resolved":False,"detected_at":timezone.now()})
print(f"Anomalies: {AnomalyDetection.objects.count()}")

for metric, insight, confidence, predicted, idx in [
    ("cpu_usage",    "CPU will exceed 90% in 2 hours",             "high",     87.5, 0),
    ("memory_usage", "Memory leak will exhaust memory in 4 hours", "critical", 95.0, 1),
    ("disk_usage",   "Disk will be full in 3 days",                "medium",   88.0, 2),
    ("network_in",   "Network traffic spike expected tonight",      "low",      75.0, 0),
]:
    server = servers[idx] if idx < len(servers) else None
    PredictiveInsight.objects.get_or_create(metric_type=metric, server=server, defaults={"insight":insight,"confidence_level":confidence,"predicted_value":predicted,"is_active":True,"predicted_at":timezone.now()+timedelta(hours=2)})
print(f"Insights: {PredictiveInsight.objects.count()}")

for metric, trend, start_val, end_val, idx in [
    ("cpu_usage",    "increasing", 45.2,  67.8,  0),
    ("memory_usage", "stable",     62.1,  63.5,  1),
    ("disk_usage",   "increasing", 38.0,  55.0,  2),
    ("network_in",   "decreasing", 800.0, 450.0, 0),
    ("cpu_usage",    "stable",     30.0,  32.0,  1),
]:
    server = servers[idx] if idx < len(servers) else None
    PerformanceTrend.objects.get_or_create(metric_type=metric, server=server, trend_direction=trend, defaults={"start_value":start_val,"end_value":end_val,"period_start":timezone.now()-timedelta(days=7),"period_end":timezone.now()})
print(f"Trends: {PerformanceTrend.objects.count()}")

print("All done!")
