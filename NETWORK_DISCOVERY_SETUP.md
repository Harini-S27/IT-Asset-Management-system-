# Automated Network Discovery Setup Guide

This guide will help you set up automated network discovery for your ITAM dashboard, replacing manual device addition with real-time network scanning.

## Prerequisites

Install required packages:
```bash
pip install flask requests python-nmap scapy
```

For Windows users, you may also need:
```bash
pip install wmi psutil
```

For network scanning capabilities, install nmap:
- **Windows**: Download from https://nmap.org/download.html
- **Linux**: `sudo apt-get install nmap` (Ubuntu/Debian) or `sudo yum install nmap` (CentOS/RHEL)
- **macOS**: `brew install nmap`

## Quick Start

### 1. Integration with Your Existing Dashboard

Update your existing ITAM dashboard to receive automated device discoveries:

```python
# Add this to your existing server/routes.ts
app.post("/api/network-discovery", async (req: Request, res: Response) => {
  try {
    const { devices } = req.body;
    
    for (const device of devices) {
      // Check if device exists by MAC address
      let networkDevice = await storage.getNetworkDeviceByMac(device.macAddress);
      
      if (networkDevice) {
        // Update existing device
        await storage.updateNetworkDeviceByMac(device.macAddress, {
          currentIp: device.ipAddress,
          deviceName: device.hostname,
          vendor: device.vendor,
          deviceType: device.deviceType,
          behaviorTag: device.behaviorTag
        });
      } else {
        // Create new device
        await storage.createNetworkDevice({
          macAddress: device.macAddress,
          deviceName: device.hostname,
          currentIp: device.ipAddress,
          vendor: device.vendor,
          deviceType: device.deviceType,
          behaviorTag: device.behaviorTag,
          status: "Active"
        });
      }
    }
    
    res.json({ message: "Devices updated successfully", count: devices.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to update devices" });
  }
});
```

### 2. Run Network Discovery

Choose your scanning method based on environment:

#### Option A: Real Network Scanning (Local Environment)
```bash
python network_discovery.py
```

#### Option B: Demo Mode (Replit/Cloud Environment)
```bash
python mock_network_discovery.py
```

#### Option C: Web Dashboard
```bash
python discovery_dashboard.py
# Access at http://localhost:8080
```

## Network Discovery Features

### Automatic Device Detection
- Scans local network (192.168.x.x, 10.x.x.x, 172.16.x.x)
- Identifies IP addresses, MAC addresses, hostnames
- Detects vendor information from MAC prefixes
- Performs port scanning for service identification

### Device Classification
The system automatically categorizes devices based on:
- **Hostname patterns**: printer, server, camera, etc.
- **Open ports**: SSH (22), HTTP (80), HTTPS (443), RDP (3389), etc.
- **Vendor information**: Dell, HP, Raspberry Pi, etc.
- **Network behavior**: Traffic patterns and protocols

### Device Types Detected
- Workstations/Laptops
- Servers (Linux/Windows)
- Printers
- IoT Devices/Sensors
- Security Cameras
- Network Equipment (Routers, Switches)
- Mobile Devices

## Configuration

### Update Dashboard URL
In your discovery scripts, update the dashboard URL:
```python
dashboard_url = "https://your-replit-project.replit.app"
discovery = NetworkDiscovery(dashboard_url)
```

### Scanning Intervals
Adjust scanning frequency:
```python
discovery.scan_interval = 60  # Scan every 60 seconds
```

### Network Range
Customize network range to scan:
```python
network_range = "192.168.1.0/24"  # Scan specific subnet
```

## Integration with Existing Dashboard

### Replace Manual Device Addition
Instead of manually adding devices, the system will:

1. **Continuously scan** your network
2. **Automatically detect** new devices
3. **Update existing** device information
4. **Classify device types** based on behavior
5. **Track IP changes** with MAC-based identification
6. **Sync with dashboard** via API calls

### Dashboard Updates
Your existing dashboard will receive:
- New devices automatically added to inventory
- Real-time IP address updates
- Device classification and behavior tags
- Vendor identification
- Network activity status

## Security Considerations

### Network Permissions
- Scanning requires network access permissions
- Some networks may block scanning traffic
- Corporate firewalls may restrict discovery
- Administrator privileges may be needed for detailed scans

### Data Privacy
- Only collects network metadata (IP, MAC, hostname)
- No personal data or file contents accessed
- Scanning limited to local network segments
- Vendor information from public MAC databases

## Troubleshooting

### Scanning Issues
```bash
# Test network connectivity
ping 8.8.8.8

# Check if nmap is installed
nmap --version

# Test manual scan
nmap -sn 192.168.1.0/24
```

### Permission Errors
```bash
# Linux: Run with sudo if needed
sudo python network_discovery.py

# Windows: Run as Administrator
```

### API Integration
```bash
# Test dashboard connection
curl -X POST http://localhost:5000/api/dhcp-update \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"00:11:22:33:44:55","newIp":"192.168.1.100"}'
```

## Advanced Configuration

### Custom Device Classification
Add your own device patterns:
```python
discovery.device_patterns.update({
    "custom_device": ["pattern1", "pattern2", "pattern3"]
})
```

### Vendor Database Updates
Add MAC vendor mappings:
```python
discovery.mac_vendors.update({
    "AA:BB:CC": "Your Custom Vendor"
})
```

### Behavior Analysis
Customize traffic analysis rules:
```python
def custom_behavior_analysis(ports, hostname):
    if "special-device" in hostname:
        return "Special Device Type"
    return "Standard Device"
```

## Production Deployment

### Systemd Service (Linux)
Create `/etc/systemd/system/network-discovery.service`:
```ini
[Unit]
Description=Network Discovery Service
After=network.target

[Service]
Type=simple
User=itam
WorkingDirectory=/opt/network-discovery
ExecStart=/usr/bin/python3 network_discovery.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### Windows Service
Use `python-windows-service` or Task Scheduler for automatic startup.

### Docker Container
```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "network_discovery.py"]
```

## Monitoring and Logging

### Log Files
Discovery events are logged to:
- Console output
- Local SQLite database
- Dashboard API responses

### Health Monitoring
Check discovery status:
```bash
# Check running processes
ps aux | grep network_discovery

# Check database
sqlite3 network_devices.db "SELECT COUNT(*) FROM discovered_devices;"
```

This automated system transforms your manual device management into a dynamic, real-time network discovery platform that maintains accurate device inventories without manual intervention.