# ITAM Agent - Cross-Platform Deployment Guide

## Overview

The ITAM Agent is a cross-platform network monitoring and asset management agent that can run on Windows, Linux, and macOS systems. It performs comprehensive network discovery, system monitoring, and reports data to the centralized ITAM dashboard.

## Features

### Cross-Platform Compatibility
- **Windows**: Full support for Windows 10/11 and Windows Server
- **Linux**: Supports all major distributions (Ubuntu, CentOS, Red Hat, Debian, Arch, Alpine)
- **macOS**: Compatible with macOS 10.14+ (Mojave and later)

### Network Discovery
- **ARP Scanning**: Discovers all devices on the local network
- **Ping Sweep**: Populates ARP tables for comprehensive device detection
- **Multiple Detection Methods**: Uses platform-specific tools for optimal results
- **Hostname Resolution**: Attempts to resolve device names from IP addresses

### System Monitoring
- **Hardware Information**: Collects system details, uptime, and specifications
- **Software Inventory**: Detects installed applications and packages
- **Network Interfaces**: Monitors network configuration and connectivity
- **Real-time Reporting**: Sends data to dashboard every 60 seconds

## Building the Agent

### Prerequisites
- Python 3.7 or higher
- pip package manager
- Internet connection for dependency installation

### Build Process

1. **Prepare the environment**:
   ```bash
   # Update the dashboard URL in itam_agent_enhanced.py
   DASHBOARD_URL = "https://your-dashboard-url.replit.dev/api/device-update"
   ```

2. **Build the executable**:
   ```bash
   python build_agent.py
   ```

3. **Output files**:
   - `dist/itam-agent-windows.exe` (Windows)
   - `dist/itam-agent-linux` (Linux)
   - `dist/itam-agent-darwin` (macOS)

### Build Features
- **Single File**: Creates a standalone executable with all dependencies
- **No Installation Required**: Runs on target systems without Python
- **Platform-Specific**: Optimized for each operating system
- **Deployment Scripts**: Automatic generation of deployment helpers

## Deployment

### Windows Deployment

1. **Copy files to target machine**:
   - `itam-agent-windows.exe`
   - `deploy_agent.bat`

2. **Run deployment script**:
   ```cmd
   deploy_agent.bat
   ```

3. **Manual deployment**:
   - Copy `itam-agent-windows.exe` to `C:\ITAM-Agent\`
   - Run the executable or add to startup

### Linux Deployment

1. **Copy files to target machine**:
   - `itam-agent-linux`
   - `deploy_agent.sh`

2. **Run deployment script**:
   ```bash
   chmod +x deploy_agent.sh
   sudo ./deploy_agent.sh
   ```

3. **Manual deployment**:
   - Copy executable to `/opt/itam-agent/`
   - Make executable: `chmod +x itam-agent-linux`
   - Run: `./itam-agent-linux`

### macOS Deployment

1. **Copy files to target machine**:
   - `itam-agent-darwin`
   - `deploy_agent.sh`

2. **Run deployment script**:
   ```bash
   chmod +x deploy_agent.sh
   sudo ./deploy_agent.sh
   ```

3. **Manual deployment**:
   - Copy executable to `/opt/itam-agent/`
   - Make executable: `chmod +x itam-agent-darwin`
   - Run: `./itam-agent-darwin`

## Network Discovery Details

### Windows Discovery
- Uses `arp -a` to read ARP table
- Performs `ping` sweep to populate ARP entries
- Reads registry for installed software
- Uses `ipconfig` for network interface information

### Linux Discovery
- Uses `arp -a` and `/proc/net/arp` for ARP table
- Uses `ip neighbor` for neighbor discovery
- Supports multiple package managers (dpkg, rpm, pacman, apk)
- Uses `ip` and `ifconfig` for network interfaces

### macOS Discovery
- Uses `arp -a` for ARP table
- Uses `ndp -a` for IPv6 neighbor discovery
- Scans `/Applications` for installed software
- Uses `ifconfig` and `route` for network information

## Configuration

### Environment Variables
- `DASHBOARD_URL`: Override default dashboard URL
- `REPORT_INTERVAL`: Change reporting interval (default: 60 seconds)
- `AGENT_VERSION`: Set custom agent version

### Runtime Configuration
The agent automatically detects:
- Operating system and version
- Network interfaces and IP addresses
- Available network scanning tools
- Package managers and software detection methods

## Troubleshooting

### Common Issues

1. **Permission Errors**:
   - Windows: Run as Administrator
   - Linux/macOS: Use `sudo` for network operations

2. **Network Discovery Issues**:
   - Check firewall settings
   - Ensure ping is allowed on network
   - Verify ARP table access permissions

3. **Dashboard Connection Issues**:
   - Verify dashboard URL is correct
   - Check network connectivity
   - Ensure firewall allows outbound HTTPS

### Debug Mode
Run with verbose output:
```bash
# The agent automatically prints status messages
./itam-agent-linux  # Will show discovery progress
```

### Log Files
- Windows: Check Windows Event Viewer
- Linux/macOS: Check system logs (`journalctl` or `/var/log/`)

## Security Considerations

### Network Security
- Agent only makes outbound HTTPS connections
- No inbound network services or ports
- ARP scanning is passive and safe
- Ping sweep uses minimal network resources

### Data Security
- All data transmission uses HTTPS
- No sensitive credentials stored locally
- System information is collected safely
- Network discovery respects local permissions

### System Security
- Agent runs with standard user privileges (elevated only for network operations)
- No system modifications or installations
- Read-only access to system information
- Clean exit on termination

## Performance

### Resource Usage
- **CPU**: Minimal usage during scanning, idle between reports
- **Memory**: Typically 10-50MB depending on platform
- **Network**: Minimal bandwidth usage (few KB per minute)
- **Storage**: Single executable file, no additional files

### Scanning Performance
- **ARP Scan**: Completes in 2-5 seconds
- **Ping Sweep**: Completes in 10-30 seconds
- **Software Detection**: Completes in 1-10 seconds
- **Total Cycle**: Usually completes in under 60 seconds

## Advanced Configuration

### Custom Dashboard URL
Edit `itam_agent_enhanced.py` before building:
```python
DASHBOARD_URL = "https://your-custom-dashboard.com/api/device-update"
```

### Custom Reporting Interval
```python
REPORT_INTERVAL = 300  # 5 minutes
```

### Custom Agent Version
```python
AGENT_VERSION = "2.1.0-custom"
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify dashboard connectivity
3. Review agent logs for error messages
4. Ensure proper permissions for network operations

## Version History

- **v2.1.0**: Cross-platform support, enhanced ARP scanning
- **v2.0.0**: Original Windows-compatible version
- **v1.0.0**: Basic ITAM agent functionality