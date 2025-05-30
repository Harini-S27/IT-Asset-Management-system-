#!/usr/bin/env python3
"""
Automated Network Discovery System
Scans local network, identifies devices, and updates ITAM dashboard
"""

import json
import subprocess
import socket
import re
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import requests
import sqlite3
import os

# Network scanning libraries
try:
    import nmap
    NMAP_AVAILABLE = True
except ImportError:
    NMAP_AVAILABLE = False
    print("Warning: python-nmap not available. Install with: pip install python-nmap")

try:
    from scapy.all import ARP, Ether, srp, get_if_addr, get_if_list
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    print("Warning: scapy not available. Install with: pip install scapy")

class NetworkDiscovery:
    def __init__(self, dashboard_url: str = None, local_db_path: str = "network_devices.db"):
        self.dashboard_url = dashboard_url or "http://localhost:5000"
        self.local_db_path = local_db_path
        self.running = False
        self.scan_interval = 30  # seconds
        
        # MAC vendor database (partial)
        self.mac_vendors = {
            "00:1B:44": "Dell Inc.",
            "A4:C3:F0": "Raspberry Pi Foundation",
            "B8:27:EB": "Raspberry Pi Foundation", 
            "DC:A6:32": "Raspberry Pi Foundation",
            "00:50:56": "VMware, Inc.",
            "08:00:27": "Oracle VirtualBox",
            "00:0C:29": "VMware, Inc.",
            "00:1C:42": "Parallels, Inc.",
            "00:15:5D": "Microsoft Corporation",
            "52:54:00": "QEMU/KVM",
            "AC:DE:48": "Universal Global Scientific Industrial Co., Ltd.",
            "00:E0:4C": "Realtek Semiconductor Corp.",
            "00:90:F5": "Ambit Microsystems Corporation",
            "20:4E:7F": "ProMax Systems, Inc.",
            "E8:DE:27": "ASUSTek Computer Inc.",
            "F4:8E:38": "ASUSTek Computer Inc.",
            "70:85:C2": "Realtek Semiconductor Corp.",
            "00:26:B9": "Seiko Epson Corporation",
            "B0:6E:BF": "Dell Inc.",
            "18:03:73": "Dell Inc.",
            "D0:67:E5": "Dell Inc."
        }
        
        # Device type patterns
        self.device_patterns = {
            "printer": ["printer", "canon", "hp", "epson", "brother", "xerox", "lexmark"],
            "router": ["router", "gateway", "linksys", "netgear", "asus", "tp-link", "dlink"],
            "camera": ["camera", "cam", "hikvision", "dahua", "axis", "foscam"],
            "iot": ["sensor", "thermostat", "smart", "alexa", "google", "nest"],
            "server": ["server", "nas", "synology", "qnap", "freenas"],
            "mobile": ["android", "iphone", "samsung", "pixel", "oneplus"],
            "laptop": ["laptop", "macbook", "thinkpad", "latitude", "inspiron"],
            "desktop": ["desktop", "optiplex", "precision", "workstation"]
        }
        
        self.init_local_db()

    def init_local_db(self):
        """Initialize local SQLite database for device tracking"""
        conn = sqlite3.connect(self.local_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS discovered_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mac_address TEXT UNIQUE NOT NULL,
                ip_address TEXT,
                hostname TEXT,
                vendor TEXT,
                device_type TEXT,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ports_open TEXT,
                os_guess TEXT,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                devices_found INTEGER,
                scan_duration REAL,
                scan_method TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def get_local_network_range(self) -> str:
        """Detect local network range automatically"""
        try:
            # Get default interface IP
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.connect(("8.8.8.8", 80))
            local_ip = sock.getsockname()[0]
            sock.close()
            
            # Convert to network range (assuming /24)
            ip_parts = local_ip.split('.')
            network_range = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.0/24"
            return network_range
        except Exception as e:
            print(f"Could not detect network range: {e}")
            return "192.168.1.0/24"  # fallback

    def scan_with_nmap(self, network_range: str) -> List[Dict]:
        """Scan network using nmap"""
        if not NMAP_AVAILABLE:
            return []
            
        devices = []
        try:
            nm = nmap.PortScanner()
            print(f"Scanning {network_range} with nmap...")
            
            # Host discovery scan
            nm.scan(hosts=network_range, arguments='-sn')
            
            for host in nm.all_hosts():
                if nm[host].state() == 'up':
                    device_info = {
                        'ip': host,
                        'mac': None,
                        'hostname': None,
                        'vendor': None,
                        'os': None,
                        'ports': []
                    }
                    
                    # Get MAC address and vendor
                    if 'mac' in nm[host]['addresses']:
                        device_info['mac'] = nm[host]['addresses']['mac']
                        device_info['vendor'] = nm[host]['vendor'].get(device_info['mac'], 'Unknown')
                    
                    # Get hostname
                    for hostname in nm[host]['hostnames']:
                        if hostname['name']:
                            device_info['hostname'] = hostname['name']
                            break
                    
                    # Detailed scan for open ports and OS detection
                    try:
                        detailed = nmap.PortScanner()
                        detailed.scan(host, arguments='-O -sV --top-ports 100')
                        
                        if host in detailed.all_hosts():
                            # Get open ports
                            for protocol in detailed[host].all_protocols():
                                ports = detailed[host][protocol].keys()
                                for port in ports:
                                    if detailed[host][protocol][port]['state'] == 'open':
                                        service = detailed[host][protocol][port].get('name', 'unknown')
                                        device_info['ports'].append(f"{port}/{protocol} ({service})")
                            
                            # OS detection
                            if 'osclass' in detailed[host]:
                                os_matches = detailed[host]['osclass']
                                if os_matches:
                                    device_info['os'] = os_matches[0].get('osfamily', 'Unknown')
                    except Exception as e:
                        print(f"Detailed scan failed for {host}: {e}")
                    
                    devices.append(device_info)
                    
        except Exception as e:
            print(f"Nmap scan failed: {e}")
            
        return devices

    def scan_with_scapy(self, network_range: str) -> List[Dict]:
        """Scan network using scapy ARP requests"""
        if not SCAPY_AVAILABLE:
            return []
            
        devices = []
        try:
            print(f"Scanning {network_range} with scapy...")
            
            # Create ARP request
            arp_request = ARP(pdst=network_range)
            broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
            arp_request_broadcast = broadcast / arp_request
            
            # Send request and receive response
            answered_list = srp(arp_request_broadcast, timeout=2, verbose=False)[0]
            
            for element in answered_list:
                device_info = {
                    'ip': element[1].psrc,
                    'mac': element[1].hwsrc,
                    'hostname': None,
                    'vendor': self.get_vendor_from_mac(element[1].hwsrc),
                    'os': None,
                    'ports': []
                }
                
                # Try to get hostname
                try:
                    hostname = socket.gethostbyaddr(element[1].psrc)[0]
                    device_info['hostname'] = hostname
                except:
                    pass
                
                devices.append(device_info)
                
        except Exception as e:
            print(f"Scapy scan failed: {e}")
            
        return devices

    def scan_with_ping_sweep(self, network_range: str) -> List[Dict]:
        """Fallback method using ping sweep and ARP table"""
        devices = []
        try:
            # Extract network base (assuming /24)
            network_base = '.'.join(network_range.split('.')[:-1])
            
            print(f"Scanning {network_range} with ping sweep...")
            
            # Ping sweep
            active_ips = []
            for i in range(1, 255):
                ip = f"{network_base}.{i}"
                try:
                    # Quick ping
                    result = subprocess.run(
                        ['ping', '-c', '1', '-W', '1', ip],
                        capture_output=True,
                        timeout=2
                    )
                    if result.returncode == 0:
                        active_ips.append(ip)
                except:
                    continue
            
            # Get ARP table for MAC addresses
            arp_table = self.get_arp_table()
            
            for ip in active_ips:
                device_info = {
                    'ip': ip,
                    'mac': arp_table.get(ip),
                    'hostname': None,
                    'vendor': None,
                    'os': None,
                    'ports': []
                }
                
                # Get hostname
                try:
                    hostname = socket.gethostbyaddr(ip)[0]
                    device_info['hostname'] = hostname
                except:
                    pass
                
                # Get vendor from MAC
                if device_info['mac']:
                    device_info['vendor'] = self.get_vendor_from_mac(device_info['mac'])
                
                devices.append(device_info)
                
        except Exception as e:
            print(f"Ping sweep failed: {e}")
            
        return devices

    def get_arp_table(self) -> Dict[str, str]:
        """Get ARP table mapping IPs to MAC addresses"""
        arp_table = {}
        try:
            if os.name == 'nt':  # Windows
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    match = re.search(r'(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})', line)
                    if match:
                        ip, mac = match.groups()
                        arp_table[ip] = mac.replace('-', ':').upper()
            else:  # Linux/Mac
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    match = re.search(r'\((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-fA-F:]{17})', line)
                    if match:
                        ip, mac = match.groups()
                        arp_table[ip] = mac.upper()
        except Exception as e:
            print(f"Failed to get ARP table: {e}")
            
        return arp_table

    def get_vendor_from_mac(self, mac: str) -> str:
        """Get vendor from MAC address prefix"""
        if not mac:
            return "Unknown"
            
        mac_prefix = mac[:8].upper()
        return self.mac_vendors.get(mac_prefix, "Unknown")

    def classify_device(self, device_info: Dict) -> str:
        """Classify device type based on hostname, ports, and other info"""
        hostname = (device_info.get('hostname') or '').lower()
        ports = ' '.join(device_info.get('ports', [])).lower()
        vendor = (device_info.get('vendor') or '').lower()
        
        text_to_analyze = f"{hostname} {ports} {vendor}"
        
        # Check device patterns
        for device_type, patterns in self.device_patterns.items():
            for pattern in patterns:
                if pattern in text_to_analyze:
                    return device_type.title()
        
        # Port-based classification
        port_numbers = []
        for port_info in device_info.get('ports', []):
            try:
                port_num = int(port_info.split('/')[0])
                port_numbers.append(port_num)
            except:
                continue
        
        if 80 in port_numbers or 443 in port_numbers:
            if 22 in port_numbers:
                return "Server"
            elif 631 in port_numbers:
                return "Printer"
            else:
                return "Web Device"
        elif 22 in port_numbers:
            return "Linux Server"
        elif 3389 in port_numbers:
            return "Windows Server"
        elif 139 in port_numbers or 445 in port_numbers:
            return "Windows Device"
        elif 1883 in port_numbers or 8883 in port_numbers:
            return "IoT Device"
        
        return "Unknown Device"

    def save_to_local_db(self, devices: List[Dict]):
        """Save discovered devices to local database"""
        conn = sqlite3.connect(self.local_db_path)
        cursor = conn.cursor()
        
        for device in devices:
            if not device.get('mac'):
                continue
                
            device_type = self.classify_device(device)
            ports_str = ','.join(device.get('ports', []))
            
            # Check if device exists
            cursor.execute('SELECT id FROM discovered_devices WHERE mac_address = ?', (device['mac'],))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing device
                cursor.execute('''
                    UPDATE discovered_devices 
                    SET ip_address = ?, hostname = ?, vendor = ?, device_type = ?,
                        last_seen = CURRENT_TIMESTAMP, ports_open = ?, os_guess = ?
                    WHERE mac_address = ?
                ''', (device['ip'], device['hostname'], device['vendor'], 
                     device_type, ports_str, device['os'], device['mac']))
            else:
                # Insert new device
                cursor.execute('''
                    INSERT INTO discovered_devices 
                    (mac_address, ip_address, hostname, vendor, device_type, ports_open, os_guess)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (device['mac'], device['ip'], device['hostname'], device['vendor'],
                     device_type, ports_str, device['os']))
        
        # Record scan history
        cursor.execute('''
            INSERT INTO scan_history (devices_found, scan_method)
            VALUES (?, ?)
        ''', (len(devices), "automated"))
        
        conn.commit()
        conn.close()

    def sync_with_dashboard(self, devices: List[Dict]):
        """Sync discovered devices with the dashboard API"""
        for device in devices:
            if not device.get('mac'):
                continue
                
            device_type = self.classify_device(device)
            
            # Format device data for dashboard API
            dashboard_device = {
                "macAddress": device['mac'],
                "deviceName": device['hostname'] or f"Device-{device['mac'][-5:]}",
                "currentIp": device['ip'],
                "vendor": device['vendor'] or "Unknown",
                "deviceType": device_type,
                "behaviorTag": self.get_behavior_tag(device),
                "status": "Active"
            }
            
            try:
                # Send to dashboard DHCP update endpoint
                response = requests.post(
                    f"{self.dashboard_url}/api/dhcp-update",
                    json={
                        "macAddress": device['mac'],
                        "newIp": device['ip'],
                        "deviceName": device['hostname'],
                        "vendor": device['vendor']
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    print(f"✓ Synced {device['mac']} with dashboard")
                else:
                    print(f"✗ Failed to sync {device['mac']}: {response.status_code}")
                    
            except Exception as e:
                print(f"✗ Dashboard sync error for {device['mac']}: {e}")

    def get_behavior_tag(self, device_info: Dict) -> str:
        """Generate behavior tag based on device characteristics"""
        ports = device_info.get('ports', [])
        hostname = (device_info.get('hostname') or '').lower()
        
        if any('22' in p for p in ports):
            return "Linux Admin Device"
        elif any('3389' in p for p in ports):
            return "Windows Remote Access"
        elif any('1883' in p or '8883' in p for p in ports):
            return "IoT MQTT Device"
        elif 'printer' in hostname:
            return "Network Printer"
        elif 'camera' in hostname or 'cam' in hostname:
            return "Security Camera"
        elif any('80' in p or '443' in p for p in ports):
            return "Web Client"
        else:
            return "Standard Device"

    def perform_network_scan(self) -> List[Dict]:
        """Perform network scan using available methods"""
        network_range = self.get_local_network_range()
        print(f"\n=== Network Discovery Scan ===")
        print(f"Scanning range: {network_range}")
        print(f"Timestamp: {datetime.now()}")
        
        devices = []
        
        # Try nmap first (most comprehensive)
        if NMAP_AVAILABLE:
            print("Using nmap for scanning...")
            devices = self.scan_with_nmap(network_range)
        
        # Fallback to scapy
        elif SCAPY_AVAILABLE:
            print("Using scapy for scanning...")
            devices = self.scan_with_scapy(network_range)
        
        # Final fallback to ping sweep
        else:
            print("Using ping sweep for scanning...")
            devices = self.scan_with_ping_sweep(network_range)
        
        print(f"Found {len(devices)} devices")
        
        # Filter out devices without MAC addresses for consistency
        devices_with_mac = [d for d in devices if d.get('mac')]
        print(f"Devices with MAC addresses: {len(devices_with_mac)}")
        
        return devices_with_mac

    def start_continuous_scanning(self):
        """Start continuous network scanning in background"""
        self.running = True
        
        def scan_loop():
            while self.running:
                try:
                    start_time = time.time()
                    devices = self.perform_network_scan()
                    
                    if devices:
                        # Save to local database
                        self.save_to_local_db(devices)
                        
                        # Sync with dashboard
                        self.sync_with_dashboard(devices)
                        
                        scan_duration = time.time() - start_time
                        print(f"Scan completed in {scan_duration:.2f} seconds")
                        
                        # Print summary
                        for device in devices:
                            print(f"  {device['mac']} | {device['ip']} | {device.get('hostname', 'Unknown')} | {self.classify_device(device)}")
                    
                    print(f"Next scan in {self.scan_interval} seconds...")
                    time.sleep(self.scan_interval)
                    
                except Exception as e:
                    print(f"Scan error: {e}")
                    time.sleep(5)  # Short delay before retry
        
        # Start scanning in background thread
        self.scan_thread = threading.Thread(target=scan_loop, daemon=True)
        self.scan_thread.start()
        print(f"Network discovery started (interval: {self.scan_interval}s)")

    def stop_scanning(self):
        """Stop continuous scanning"""
        self.running = False
        print("Network discovery stopped")

    def get_discovered_devices(self) -> List[Dict]:
        """Get all discovered devices from local database"""
        conn = sqlite3.connect(self.local_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT mac_address, ip_address, hostname, vendor, device_type,
                   first_seen, last_seen, ports_open, os_guess, status
            FROM discovered_devices
            ORDER BY last_seen DESC
        ''')
        
        devices = []
        for row in cursor.fetchall():
            devices.append({
                'mac': row[0],
                'ip': row[1],
                'hostname': row[2],
                'vendor': row[3],
                'device_type': row[4],
                'first_seen': row[5],
                'last_seen': row[6],
                'ports': row[7].split(',') if row[7] else [],
                'os': row[8],
                'status': row[9]
            })
        
        conn.close()
        return devices

def main():
    """Main function for testing"""
    # Configuration
    dashboard_url = "http://localhost:5000"  # Update with your dashboard URL
    
    # Create network discovery instance
    discovery = NetworkDiscovery(dashboard_url)
    
    try:
        # Perform single scan
        print("Performing initial network scan...")
        devices = discovery.perform_network_scan()
        
        if devices:
            discovery.save_to_local_db(devices)
            discovery.sync_with_dashboard(devices)
        
        # Start continuous scanning
        discovery.start_continuous_scanning()
        
        # Keep running until interrupted
        print("\nPress Ctrl+C to stop...")
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping network discovery...")
        discovery.stop_scanning()

if __name__ == "__main__":
    main()