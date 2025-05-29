# ITAM Agent Deployment Guide

This guide walks you through deploying the IT Asset Management agent on company devices for real-time monitoring.

## Overview

The ITAM agent is a lightweight Python application that:
- Collects system information (hostname, OS, installed software)
- Reports to your central dashboard via API
- Triggers automatic prohibited software scanning
- Runs silently in the background

## Prerequisites

- Python 3.7 or higher
- PyInstaller (for creating executable)
- Network access to your Replit dashboard

## Step 1: Configure the Agent

1. Open `agent.py` in a text editor
2. Update the `DASHBOARD_URL` variable with your Replit URL:
   ```python
   DASHBOARD_URL = "https://your-project-name.your-username.replit.app/api/device-update"
   ```
3. Optionally adjust `REPORT_INTERVAL` (default: 300 seconds = 5 minutes)

## Step 2: Test the Agent

Before building the executable, test the agent:

1. Install required dependencies:
   ```bash
   pip install requests
   ```

2. Run the test script:
   ```bash
   python test_agent.py
   ```

3. Check your dashboard's "Live Devices" tab to verify the test data appears

## Step 3: Build the Executable

### Windows:

1. Install PyInstaller:
   ```bash
   pip install pyinstaller
   ```

2. Run the build script:
   ```bash
   build_agent.bat
   ```

3. The executable will be created at: `dist/itam-agent.exe`

### Manual Build (All Platforms):

```bash
pyinstaller --onefile --noconsole --name "itam-agent" agent.py
```

## Step 4: Deploy on Company Devices

### Silent Installation:

1. Copy `itam-agent.exe` to target devices
2. Place in a permanent location (e.g., `C:\Program Files\ITAM\`)

### Auto-Start Configuration:

**Option 1: Startup Folder**
1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `itam-agent.exe` in the startup folder

**Option 2: Task Scheduler**
1. Open Task Scheduler
2. Create Basic Task: "ITAM Agent"
3. Trigger: "When the computer starts"
4. Action: Start the program `itam-agent.exe`
5. Check "Run whether user is logged on or not"

**Option 3: Service Installation**
For enterprise deployment, convert to a Windows service using tools like NSSM.

## Step 5: Monitor Dashboard

1. Open your Replit dashboard
2. Navigate to Devices → Live Devices
3. View real-time reports from deployed agents
4. Monitor threat detection and compliance metrics

## Agent Features

### Data Collected:
- Device hostname
- Operating system details
- Installed software list
- IP address
- System uptime
- Report timestamp

### Security Features:
- Automatic prohibited software detection
- Real-time threat reporting
- Compliance monitoring
- Dashboard integration

### Performance:
- Minimal resource usage
- Configurable reporting intervals
- Silent operation
- Network timeout handling

## Troubleshooting

### Agent Not Reporting:
1. Check network connectivity
2. Verify dashboard URL is correct
3. Ensure firewall allows outbound HTTPS
4. Check agent logs (if running in console mode)

### Dashboard Not Updating:
1. Verify API endpoint is working
2. Check server logs for errors
3. Confirm data format is correct

### Build Issues:
1. Ensure Python and PyInstaller are installed
2. Check for missing dependencies
3. Run with `--debug` flag for detailed logs

## Security Considerations

- Agent runs with user privileges (not admin)
- Only collects software inventory data
- Uses HTTPS for secure transmission
- No sensitive data stored locally
- Configurable reporting frequency

## Deployment at Scale

For large deployments:
1. Use Group Policy for automated installation
2. Deploy via SCCM or similar tools
3. Configure centralized logging
4. Implement update management
5. Monitor agent health metrics

## Support

For issues or questions:
1. Check the dashboard "Live Devices" tab for status
2. Review agent logs for error messages
3. Test connectivity with `test_agent.py`
4. Verify dashboard API is responding