#!/usr/bin/env python3
"""
Test script for ITAM Agent API
Run this to simulate an agent reporting to your dashboard
"""

import json
import requests
import socket

# Update this with your actual Replit URL
DASHBOARD_URL = "https://your-replit-url.replit.app/api/device-update"

def test_agent_report():
    """Send a test report to the dashboard"""
    
    # Test data simulating a real device
    test_data = {
        "deviceName": f"{socket.gethostname()}-TEST",
        "operatingSystem": "Windows 11 Pro 22H2",
        "installedSoftware": [
            "Microsoft Office 365",
            "Google Chrome",
            "Mozilla Firefox",
            "Adobe Acrobat Reader",
            "VLC Media Player",
            "Python 3.11",
            "Visual Studio Code",
            "TeamViewer",  # This might be detected as prohibited
            "BitTorrent",  # This might be detected as prohibited
            "Windows Security",
            "Microsoft Edge",
            "Notepad++",
            "7-Zip",
            "Slack",
            "Zoom"
        ],
        "ipAddress": "192.168.1.100",
        "location": "Remote Office"
    }
    
    print("Testing ITAM Agent API...")
    print(f"Dashboard URL: {DASHBOARD_URL}")
    print(f"Device: {test_data['deviceName']}")
    print(f"Software count: {len(test_data['installedSoftware'])}")
    
    try:
        response = requests.post(
            DASHBOARD_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✓ Test successful!")
            print(f"Device ID: {result.get('device', {}).get('id')}")
            print(f"Threats detected: {result.get('detectedThreats', 0)}")
            print(f"Total software: {result.get('totalSoftware', 0)}")
            print("\nCheck your dashboard to see the new device report!")
        else:
            print(f"\n✗ Test failed!")
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Network error: {e}")
        print("Make sure your Replit URL is correct and the server is running")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")

if __name__ == "__main__":
    if "your-replit-url" in DASHBOARD_URL:
        print("⚠️  Please update DASHBOARD_URL with your actual Replit URL")
        print("   Example: https://your-project-name.your-username.replit.app/api/device-update")
    else:
        test_agent_report()