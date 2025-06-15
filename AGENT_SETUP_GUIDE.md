# IT Asset Management Agent Setup Guide

## Overview
This guide explains how to install and run the ITAM agent on another laptop to automatically report device information to your central dashboard.

## What the Agent Does
- Automatically collects system information (hostname, OS, installed software)
- Reports device status every 5 minutes to your dashboard
- Detects prohibited software and sends security alerts
- Shows up as a new device in your ITAM dashboard

## Quick Setup Steps

### Step 1: Download the Agent
1. Copy the `python-scripts/agent.py` file to the target laptop
2. The agent is already configured with your dashboard URL

### Step 2: Install Python Requirements
On the target laptop, run:
```bash
pip install requests
```

### Step 3: Run the Agent
Open a command prompt/terminal and run:
```bash
python agent.py
```

You should see output like:
```
ITAM Agent v1.0.0 starting...
Dashboard URL: https://your-replit-url.replit.dev/api/device-update
[2025-06-15 12:00:00] Collecting system information...
Device: LAPTOP-ABC123
OS: Windows 11 22H2
Software count: 45
Sending report to dashboard...
✓ Report sent successfully
Next report in 300 seconds...
```

### Step 4: Verify in Dashboard
1. Go back to your ITAM dashboard
2. Navigate to the Devices section
3. Look for a new device with the laptop's hostname
4. The device should show status "Active" and current information

## What Information Gets Collected

### System Information
- Device hostname
- Operating system details
- IP address
- System uptime

### Software Inventory
- **Windows**: Reads from Windows Registry (Programs & Features)
- **macOS**: Uses system_profiler for application list
- **Linux**: Queries package managers (apt, yum, pacman)

### Security Monitoring
- Automatically scans for prohibited software
- Reports violations to the dashboard
- Creates security alerts for policy violations

## Running as a Service (Optional)

### Windows
1. Create a batch file `start_agent.bat`:
```batch
@echo off
cd /d "C:\path\to\agent"
python agent.py
pause
```

2. Add to Windows startup folder:
   - Press Win+R, type `shell:startup`
   - Copy the batch file to this folder

### macOS/Linux
1. Create a systemd service or cron job:
```bash
# Add to crontab for startup
@reboot python /path/to/agent.py
```

## Configuration Options

You can modify these settings in `agent.py`:

```python
REPORT_INTERVAL = 300  # Report every 5 minutes (300 seconds)
AGENT_VERSION = "1.0.0"
```

## Troubleshooting

### Agent Won't Start
- Ensure Python is installed and in PATH
- Install the `requests` library: `pip install requests`
- Check that the laptop has internet connectivity

### No Data in Dashboard
- Verify the agent shows "Report sent successfully"
- Check your Replit app is running
- Ensure the dashboard URL is correct

### Permission Errors (Windows)
- Run command prompt as Administrator
- Some registry operations require elevated privileges

### Limited Software Detection (Linux/macOS)
- Agent may need elevated privileges for complete software inventory
- Run with `sudo python agent.py` if needed

## Security Notes

- Agent only sends system information, never personal files
- All communication uses HTTPS encryption
- No sensitive data is stored locally
- Agent can be stopped anytime with Ctrl+C

## Testing the Connection

To test if the agent can reach your dashboard:
```bash
python -c "import requests; print(requests.get('https://your-replit-url.replit.dev').status_code)"
```

Should return `200` if connectivity is working.

## Multiple Devices

To monitor multiple laptops:
1. Copy the agent.py file to each device
2. Follow the same setup steps
3. Each device will appear separately in your dashboard
4. Device names are automatically detected from hostname

## Support

If you encounter issues:
1. Check the agent output for error messages
2. Verify internet connectivity on the target device
3. Ensure your Replit dashboard is running
4. Check for firewall/antivirus blocking the agent