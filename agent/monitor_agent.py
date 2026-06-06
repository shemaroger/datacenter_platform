import psutil
import requests
import time
import socket
import platform
from datetime import datetime

API_URL   = "http://192.168.252.1:8000/api"
USERNAME  = "admin"
PASSWORD  = "Test@123"
INTERVAL  = 30


def get_token():
    r = requests.post(f"{API_URL}/auth/login/", json={
        "username": USERNAME,
        "password": PASSWORD,
    }, timeout=10)
    r.raise_for_status()
    return r.json()["access"]


def get_real_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.168.252.1', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


def get_or_create_server(token):
    hostname   = socket.gethostname()
    ip_address = get_real_ip()

    headers = {"Authorization": f"Bearer {token}"}

    r = requests.get(f"{API_URL}/monitoring/servers/", headers=headers, timeout=10)
    servers = r.json()
    if isinstance(servers, dict):
        servers = servers.get("results", [])

    for s in servers:
        if s["hostname"] == hostname:
            print(f"Found existing server: {s['name']} (ID {s['id']})")
            # Update IP in case it changed
            requests.patch(
                f"{API_URL}/monitoring/servers/{s['id']}/",
                json={"ip_address": ip_address},
                headers=headers,
                timeout=10,
            )
            return s["id"]

    cpu_cores = psutil.cpu_count(logical=False) or 1
    ram_gb    = round(psutil.virtual_memory().total / (1024 ** 3), 1)
    disk_gb   = round(psutil.disk_usage("/").total  / (1024 ** 3), 1)

    payload = {
        "name"        : hostname,
        "hostname"    : hostname,
        "ip_address"  : ip_address,
        "server_type" : "virtual",
        "status"      : "online",
        "os"          : f"{platform.system()} {platform.release()}",
        "cpu_cores"   : cpu_cores,
        "ram_gb"      : ram_gb,
        "disk_gb"     : disk_gb,
        "location"    : "Multipass - Local",
        "description" : "Auto-registered by monitor agent",
    }

    r = requests.post(
        f"{API_URL}/monitoring/servers/",
        json=payload,
        headers=headers,
        timeout=10,
    )
    r.raise_for_status()
    server_id = r.json()["id"]
    print(f"Registered new server: {hostname} — {ip_address} (ID {server_id})")
    return server_id


def update_server_status(token, server_id, status):
    try:
        requests.patch(
            f"{API_URL}/monitoring/servers/{server_id}/",
            json={"status": status},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except Exception:
        pass


def collect_metrics():
    net_before = psutil.net_io_counters()
    time.sleep(1)
    net_after  = psutil.net_io_counters()

    net_in  = round((net_after.bytes_recv - net_before.bytes_recv) / 1024 / 1024, 3)
    net_out = round((net_after.bytes_sent - net_before.bytes_sent) / 1024 / 1024, 3)

    cpu_temp = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for key in temps:
                entries = temps[key]
                if entries:
                    cpu_temp = round(entries[0].current, 1)
                    break
    except Exception:
        pass

    # Determine status based on usage
    cpu    = round(psutil.cpu_percent(interval=1), 1)
    memory = round(psutil.virtual_memory().percent, 1)
    disk   = round(psutil.disk_usage("/").percent, 1)

    if cpu > 90 or memory > 90 or disk > 90:
        live_status = "critical"
    elif cpu > 75 or memory > 75 or disk > 80:
        live_status = "warning"
    else:
        live_status = "online"

    return {
        "cpu_usage"      : cpu,
        "memory_usage"   : memory,
        "disk_usage"     : disk,
        "network_in"     : net_in,
        "network_out"    : net_out,
        "cpu_temp"       : cpu_temp,
        "uptime_seconds" : int(time.time() - psutil.boot_time()),
        "_live_status"   : live_status,
    }


def push_metrics(token, server_id, metrics):
    payload = {k: v for k, v in metrics.items() if not k.startswith('_')}
    r = requests.post(
        f"{API_URL}/monitoring/servers/{server_id}/metrics/",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    return r.status_code


def main():
    print("=" * 40)
    print("  DataCenter Monitor Agent")
    print(f"  Host     : {socket.gethostname()}")
    print(f"  IP       : {get_real_ip()}")
    print(f"  API      : {API_URL}")
    print(f"  Interval : {INTERVAL}s")
    print("=" * 40)

    token     = get_token()
    server_id = get_or_create_server(token)
    failures  = 0

    # Mark server as online on startup
    update_server_status(token, server_id, "online")
    print(f"\nStarting metric collection every {INTERVAL}s...\n")

    while True:
        try:
            metrics     = collect_metrics()
            live_status = metrics.get("_live_status", "online")
            http_status = push_metrics(token, server_id, metrics)

            # Update server status dynamically
            update_server_status(token, server_id, live_status)

            now = datetime.now().strftime("%H:%M:%S")
            status_icon = "✓" if http_status == 201 else "✗"
            print(
                f"[{now}] {status_icon} "
                f"CPU: {metrics['cpu_usage']}%  "
                f"MEM: {metrics['memory_usage']}%  "
                f"DISK: {metrics['disk_usage']}%  "
                f"NET↓{metrics['network_in']} ↑{metrics['network_out']} MB/s  "
                f"STATUS: {live_status}  "
                f"→ HTTP {http_status}"
            )
            failures = 0

        except requests.exceptions.ConnectionError:
            failures += 1
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ Connection failed (attempt {failures}). Retrying...")
            if failures >= 3:
                try:
                    update_server_status(token, server_id, "offline")
                except Exception:
                    pass

        except Exception as e:
            err = str(e)
            if "401" in err or "token" in err.lower():
                print("Token expired — refreshing...")
                try:
                    token = get_token()
                except Exception:
                    print("Re-auth failed. Retrying in 30s...")
            else:
                print(f"Error: {e}")

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()