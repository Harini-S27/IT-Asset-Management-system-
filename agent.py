#!/usr/bin/env python3
"""
IT Asset Management Agent
Collects system information and reports to central dashboard
"""

import json
import platform
import socket
import subprocess
import sys
import time
import requests
from datetime import datetime

# Configuration
DASHBOARD_URL = "https://your-replit-url.replit.app/api/device-update"  # Replace with your actual Replit URL
AGENT_VERSION = "1.0.0"
REPORT_INTERVAL = 300  # Report every 5 minutes

def get_hostname():
    """Get the computer's hostname"""
    return socket.gethostname()

def get_operating_system():
    """Get detailed OS information"""
    return f"{platform.system()} {platform.release()} {platform.version()}"

def get_ip_address():
    """Get the local IP address"""
    try:
        # Connect to a remote server to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        return "Unknown"

def get_installed_software_windows():
    """Get list of installed software on Windows"""
    software_list = []
    try:
        # Query Windows Registry for installed programs
        import winreg
        
        # Check both 32-bit and 64-bit program locations
        registry_paths = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        ]
        
        for path in registry_paths:
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
                for i in range(winreg.QueryInfoKey(key)[0]):
                    try:
                        subkey_name = winreg.EnumKey(key, i)
                        subkey = winreg.OpenKey(key, subkey_name)
                        try:
                            name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                            if name and len(name) > 2:  # Filter out empty/short names
                                software_list.append(name)
                        except FileNotFoundError:
                            pass
                        winreg.CloseKey(subkey)
                    except OSError:
                        continue
                winreg.CloseKey(key)
            except Exception:
                continue
                
    except ImportError:
        # Fallback if winreg is not available
        software_list = [
            "Microsoft Office 365", "Google Chrome", "Mozilla Firefox",
            "Adobe Acrobat Reader", "VLC Media Player", "7-Zip",
            "Python 3.11", "Visual Studio Code", "Notepad++",
            "Windows Security", "Microsoft Edge"
        ]
    
    return software_list[:50]  # Limit to first 50 programs

def get_installed_software_linux():
    """Get list of installed software on Linux"""
    software_list = []
    try:
        # Try different package managers
        commands = [
            ["dpkg", "--get-selections"],  # Debian/Ubuntu
            ["rpm", "-qa"],                # RedHat/CentOS/Fedora
            ["pacman", "-Q"]               # Arch Linux
        ]
        
        for cmd in commands:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines[:50]:  # Limit results
                        if line.strip():
                            # Extract package name
                            pkg_name = line.split()[0] if line.split() else line
                            software_list.append(pkg_name)
                    break
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
                
    except Exception:
        pass
    
    # Fallback list if no package manager works
    if not software_list:
        software_list = [
            "Firefox", "LibreOffice", "GIMP", "VLC", "Git",
            "Python3", "Vim", "Bash", "SSH", "Curl"
        ]
    
    return software_list

def get_installed_software_macos():
    """Get list of installed software on macOS"""
    software_list = []
    try:
        # Use system_profiler to get application list
        result = subprocess.run(
            ["system_profiler", "SPApplicationsDataType", "-json"],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            applications = data.get('SPApplicationsDataType', [])
            
            for app in applications[:50]:  # Limit to first 50 apps
                name = app.get('_name', '')
                if name:
                    software_list.append(name)
                    
    except Exception:
        # Fallback list for macOS
        software_list = [
            "Safari", "Chrome", "Firefox", "Terminal", "Finder",
            "Mail", "Calendar", "Photos", "Messages", "FaceTime",
            "System Preferences", "App Store", "Xcode", "TextEdit"
        ]
    
    return software_list

def get_installed_software():
    """Get installed software based on operating system"""
    os_name = platform.system().lower()
    
    if os_name == "windows":
        return get_installed_software_windows()
    elif os_name == "linux":
        return get_installed_software_linux()
    elif os_name == "darwin":  # macOS
        return get_installed_software_macos()
    else:
        # Generic fallback
        return [
            "Web Browser", "Text Editor", "Media Player", "Office Suite",
            "Antivirus", "System Utilities", "Development Tools"
        ]

def collect_system_info():
    """Collect all system information"""
    return {
        "deviceName": get_hostname(),
        "operatingSystem": get_operating_system(),
        "installedSoftware": get_installed_software(),
        "ipAddress": get_ip_address(),
        "location": "Agent-Reported",
        "agentVersion": AGENT_VERSION,
        "reportTime": datetime.now().isoformat(),
        "systemUptime": get_system_uptime()
    }

def get_system_uptime():
    """Get system uptime information"""
    try:
        if platform.system() == "Windows":
            import ctypes
            uptime_ms = ctypes.windll.kernel32.GetTickCount64()
            uptime_hours = uptime_ms // (1000 * 60 * 60)
            return f"{uptime_hours} hours"
        else:
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
                uptime_hours = int(uptime_seconds // 3600)
                return f"{uptime_hours} hours"
    except:
        return "Unknown"

def send_report(data):
    """Send system information to the dashboard"""
    try:
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': f'ITAM-Agent/{AGENT_VERSION}'
        }
        
        response = requests.post(
            DASHBOARD_URL,
            json=data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Report sent successfully. Threats detected: {result.get('detectedThreats', 0)}")
            return True
        else:
            print(f"Failed to send report. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def main():
    """Main agent function"""
    print(f"ITAM Agent v{AGENT_VERSION} starting...")
    print(f"Dashboard URL: {DASHBOARD_URL}")
    print(f"Report interval: {REPORT_INTERVAL} seconds")
    
    # Verify dashboard URL is configured
    if "your-replit-url" in DASHBOARD_URL:
        print("\n⚠️  WARNING: Please update DASHBOARD_URL with your actual Replit URL")
        print("   Example: https://your-project-name.your-username.replit.app/api/device-update")
        return
    
    while True:
        try:
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Collecting system information...")
            
            # Collect system data
            system_info = collect_system_info()
            print(f"Device: {system_info['deviceName']}")
            print(f"OS: {system_info['operatingSystem']}")
            print(f"Software count: {len(system_info['installedSoftware'])}")
            
            # Send report
            print("Sending report to dashboard...")
            success = send_report(system_info)
            
            if success:
                print("✓ Report sent successfully")
            else:
                print("✗ Failed to send report")
            
            # Wait before next report
            print(f"Next report in {REPORT_INTERVAL} seconds...")
            time.sleep(REPORT_INTERVAL)
            
        except KeyboardInterrupt:
            print("\nAgent stopped by user")
            break
        except Exception as e:
            print(f"Error in main loop: {e}")
            print(f"Retrying in 60 seconds...")
            time.sleep(60)

if __name__ == "__main__":
    main()