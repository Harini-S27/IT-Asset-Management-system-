#!/usr/bin/env python3
"""
Mock Network Discovery for Replit/Demo Environment
Generates realistic network device data when raw network scanning isn't possible
"""

import json
import random
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List
import requests

class MockNetworkDiscovery:
    def __init__(self, dashboard_url: str = "http://localhost:5000"):
        self.dashboard_url = dashboard_url
        self.running = False
        self.scan_interval = 45  # seconds
        self.discovered_devices = {}
        
        # Realistic device templates
        self.device_templates = [
            {
                "name_pattern": "LAPTOP-{id}",
                "mac_prefix": "00:1B:44",
                "vendor": "Dell Inc.",
                "device_type": "Laptop",
                "behavior_tag": "Linux Admin Device",
                "ports": ["22/tcp (ssh)", "80/tcp (http)", "443/tcp (https)"],
                "os": "Ubuntu"
            },
            {
                "name_pattern": "DESKTOP-{id}",
                "mac_prefix": "E8:DE:27",
                "vendor": "ASUSTek Computer Inc.",
                "device_type": "Desktop",
                "behavior_tag": "Windows Remote Access",
                "ports": ["3389/tcp (ms-wbt-server)", "135/tcp (msrpc)", "445/tcp (microsoft-ds)"],
                "os": "Windows"
            },
            {
                "name_pattern": "IOT-SENSOR-{id}",
                "mac_prefix": "A4:C3:F0",
                "vendor": "Raspberry Pi Foundation",
                "device_type": "IoT Device",
                "behavior_tag": "IoT MQTT Device",
                "ports": ["1883/tcp (mqtt)", "8883/tcp (secure-mqtt)"],
                "os": "Linux"
            },
            {
                "name_pattern": "PRINTER-{id}",
                "mac_prefix": "00:26:B9",
                "vendor": "Seiko Epson Corporation",
                "device_type": "Printer",
                "behavior_tag": "Network Printer",
                "ports": ["80/tcp (http)", "631/tcp (ipp)", "9100/tcp (jetdirect)"],
                "os": "Embedded"
            },
            {
                "name_pattern": "CAMERA-{id}",
                "mac_prefix": "DC:A6:32",
                "vendor": "Hikvision",
                "device_type": "Security Camera",
                "behavior_tag": "IoT Sensor",
                "ports": ["80/tcp (http)", "554/tcp (rtsp)", "8000/tcp (http-alt)"],
                "os": "Embedded"
            },
            {
                "name_pattern": "PHONE-{id}",
                "mac_prefix": "F4:8E:38",
                "vendor": "Samsung Electronics",
                "device_type": "Mobile",
                "behavior_tag": "Mobile Client",
                "ports": ["80/tcp (http)", "443/tcp (https)"],
                "os": "Android"
            },
            {
                "name_pattern": "SERVER-{id}",
                "mac_prefix": "B0:6E:BF",
                "vendor": "Dell Inc.",
                "device_type": "Server",
                "behavior_tag": "Server Device",
                "ports": ["22/tcp (ssh)", "80/tcp (http)", "443/tcp (https)", "3306/tcp (mysql)"],
                "os": "Linux"
            },
            {
                "name_pattern": "TABLET-{id}",
                "mac_prefix": "70:85:C2",
                "vendor": "Apple Inc.",
                "device_type": "Tablet",
                "behavior_tag": "Web Client",
                "ports": ["80/tcp (http)", "443/tcp (https)"],
                "os": "iOS"
            },
            {
                "name_pattern": "SWITCH-{id}",
                "mac_prefix": "20:4E:7F",
                "vendor": "Cisco Systems",
                "device_type": "Network",
                "behavior_tag": "Network Infrastructure",
                "ports": ["23/tcp (telnet)", "80/tcp (http)", "443/tcp (https)"],
                "os": "IOS"
            },
            {
                "name_pattern": "AP-{id}",
                "mac_prefix": "AC:DE:48",
                "vendor": "Ubiquiti Networks",
                "device_type": "Access Point",
                "behavior_tag": "Network Infrastructure",
                "ports": ["22/tcp (ssh)", "80/tcp (http)", "443/tcp (https)"],
                "os": "Linux"
            }
        ]

    def generate_mac_address(self, prefix: str) -> str:
        """Generate a realistic MAC address with given prefix"""
        suffix = ':'.join([f"{random.randint(0, 255):02X}" for _ in range(3)])
        return f"{prefix}:{suffix}"

    def generate_ip_address(self) -> str:
        """Generate a realistic IP address in common ranges"""
        networks = ["192.168.1", "192.168.0", "10.0.0", "172.16.0"]
        network = random.choice(networks)
        host = random.randint(20, 250)
        return f"{network}.{host}"

    def create_mock_device(self, template: Dict, device_id: int) -> Dict:
        """Create a mock device based on template"""
        mac_address = self.generate_mac_address(template["mac_prefix"])
        ip_address = self.generate_ip_address()
        device_name = template["name_pattern"].format(id=f"{device_id:03d}")
        
        device = {
            "mac": mac_address,
            "ip": ip_address,
            "hostname": device_name,
            "vendor": template["vendor"],
            "device_type": template["device_type"],
            "behavior_tag": template["behavior_tag"],
            "ports": template["ports"].copy(),
            "os": template["os"],
            "first_seen": datetime.now().isoformat(),
            "last_seen": datetime.now().isoformat(),
            "status": "Active"
        }
        
        # Add some randomness to ports (device might have additional services)
        if random.random() < 0.3:  # 30% chance of additional port
            extra_ports = ["53/tcp (dns)", "123/udp (ntp)", "161/udp (snmp)", "8080/tcp (http-alt)"]
            device["ports"].append(random.choice(extra_ports))
        
        return device

    def simulate_device_changes(self):
        """Simulate realistic device behavior (IP changes, coming online/offline)"""
        changes = []
        
        for mac, device in self.discovered_devices.items():
            # Simulate IP change (DHCP renewal)
            if random.random() < 0.15:  # 15% chance of IP change
                old_ip = device["ip"]
                device["ip"] = self.generate_ip_address()
                device["last_seen"] = datetime.now().isoformat()
                changes.append(f"IP change: {device['hostname']} {old_ip} -> {device['ip']}")
            
            # Simulate device going offline temporarily
            elif random.random() < 0.05:  # 5% chance of going offline
                device["status"] = "Offline"
                changes.append(f"Offline: {device['hostname']}")
            
            # Bring offline devices back online
            elif device["status"] == "Offline" and random.random() < 0.8:  # 80% chance to come back
                device["status"] = "Active"
                device["last_seen"] = datetime.now().isoformat()
                changes.append(f"Online: {device['hostname']}")
        
        return changes

    def add_new_devices(self):
        """Occasionally add new devices to simulate dynamic environment"""
        if random.random() < 0.1 and len(self.discovered_devices) < 25:  # 10% chance, max 25 devices
            template = random.choice(self.device_templates)
            device_id = len(self.discovered_devices) + 1
            new_device = self.create_mock_device(template, device_id)
            self.discovered_devices[new_device["mac"]] = new_device
            return f"New device: {new_device['hostname']} ({new_device['mac']})"
        return None

    def perform_mock_scan(self) -> List[Dict]:
        """Perform a mock network scan"""
        print(f"\n=== Mock Network Discovery Scan ===")
        print(f"Timestamp: {datetime.now()}")
        
        # Initialize with some devices if empty
        if not self.discovered_devices:
            print("Initializing network with discovered devices...")
            for i, template in enumerate(self.device_templates[:8]):  # Start with 8 devices
                device = self.create_mock_device(template, i + 1)
                self.discovered_devices[device["mac"]] = device
        
        # Simulate device changes
        changes = self.simulate_device_changes()
        
        # Occasionally add new devices
        new_device = self.add_new_devices()
        if new_device:
            changes.append(new_device)
        
        # Print changes
        if changes:
            print("Network changes detected:")
            for change in changes:
                print(f"  {change}")
        else:
            print("No network changes detected")
        
        # Return active devices
        active_devices = [device for device in self.discovered_devices.values() 
                         if device["status"] == "Active"]
        print(f"Active devices: {len(active_devices)}")
        
        return active_devices

    def sync_with_dashboard(self, devices: List[Dict]):
        """Sync discovered devices with dashboard"""
        for device in devices:
            try:
                # Send to dashboard via DHCP update endpoint
                response = requests.post(
                    f"{self.dashboard_url}/api/dhcp-update",
                    json={
                        "macAddress": device["mac"],
                        "newIp": device["ip"],
                        "deviceName": device["hostname"],
                        "vendor": device["vendor"]
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    print(f"  Synced {device['hostname']} ({device['mac']})")
                
            except requests.exceptions.RequestException as e:
                print(f"  Dashboard sync failed: {e}")

    def start_continuous_discovery(self):
        """Start continuous mock discovery"""
        self.running = True
        
        def discovery_loop():
            while self.running:
                try:
                    devices = self.perform_mock_scan()
                    
                    if devices:
                        self.sync_with_dashboard(devices)
                    
                    print(f"Next scan in {self.scan_interval} seconds...")
                    time.sleep(self.scan_interval)
                    
                except Exception as e:
                    print(f"Discovery error: {e}")
                    time.sleep(10)
        
        self.discovery_thread = threading.Thread(target=discovery_loop, daemon=True)
        self.discovery_thread.start()
        print(f"Mock network discovery started (interval: {self.scan_interval}s)")

    def stop_discovery(self):
        """Stop continuous discovery"""
        self.running = False
        print("Mock network discovery stopped")

    def get_device_summary(self) -> Dict:
        """Get summary of discovered devices"""
        total = len(self.discovered_devices)
        active = len([d for d in self.discovered_devices.values() if d["status"] == "Active"])
        offline = total - active
        
        device_types = {}
        for device in self.discovered_devices.values():
            dtype = device["device_type"]
            device_types[dtype] = device_types.get(dtype, 0) + 1
        
        return {
            "total_devices": total,
            "active_devices": active,
            "offline_devices": offline,
            "device_types": device_types
        }

def main():
    """Main function for testing mock discovery"""
    dashboard_url = "http://localhost:5000"
    
    discovery = MockNetworkDiscovery(dashboard_url)
    
    try:
        print("Starting mock network discovery for demonstration...")
        
        # Perform initial scan
        devices = discovery.perform_mock_scan()
        if devices:
            discovery.sync_with_dashboard(devices)
        
        # Start continuous discovery
        discovery.start_continuous_discovery()
        
        # Print periodic summaries
        while True:
            time.sleep(60)  # Print summary every minute
            summary = discovery.get_device_summary()
            print(f"\n=== Device Summary ===")
            print(f"Total: {summary['total_devices']}, Active: {summary['active_devices']}, Offline: {summary['offline_devices']}")
            print("Device types:", summary['device_types'])
            
    except KeyboardInterrupt:
        print("\nStopping mock discovery...")
        discovery.stop_discovery()

if __name__ == "__main__":
    main()