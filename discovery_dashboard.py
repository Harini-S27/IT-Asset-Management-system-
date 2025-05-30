#!/usr/bin/env python3
"""
Flask Dashboard for Network Discovery Integration
Provides web interface and API endpoints for automated device discovery
"""

from flask import Flask, render_template, jsonify, request, redirect, url_for
import json
import sqlite3
from datetime import datetime, timedelta
from network_discovery import NetworkDiscovery
from mock_network_discovery import MockNetworkDiscovery
import threading
import os

app = Flask(__name__)

class DiscoveryManager:
    def __init__(self):
        self.real_discovery = None
        self.mock_discovery = None
        self.current_mode = "mock"  # Start with mock for demo
        self.dashboard_url = "http://localhost:5000"
        
    def switch_to_real_discovery(self):
        """Switch to real network scanning"""
        if self.mock_discovery:
            self.mock_discovery.stop_discovery()
        
        self.real_discovery = NetworkDiscovery(self.dashboard_url)
        self.real_discovery.start_continuous_scanning()
        self.current_mode = "real"
        print("Switched to real network discovery")
    
    def switch_to_mock_discovery(self):
        """Switch to mock discovery for demo"""
        if self.real_discovery:
            self.real_discovery.stop_scanning()
        
        self.mock_discovery = MockNetworkDiscovery(self.dashboard_url)
        self.mock_discovery.start_continuous_discovery()
        self.current_mode = "mock"
        print("Switched to mock network discovery")
    
    def get_discovered_devices(self):
        """Get devices from current discovery mode"""
        if self.current_mode == "real" and self.real_discovery:
            return self.real_discovery.get_discovered_devices()
        elif self.current_mode == "mock" and self.mock_discovery:
            return list(self.mock_discovery.discovered_devices.values())
        return []
    
    def get_discovery_stats(self):
        """Get discovery statistics"""
        devices = self.get_discovered_devices()
        
        stats = {
            "total_devices": len(devices),
            "active_devices": len([d for d in devices if d.get("status") == "Active"]),
            "device_types": {},
            "vendors": {},
            "scan_mode": self.current_mode
        }
        
        for device in devices:
            # Count device types
            dtype = device.get("device_type", "Unknown")
            stats["device_types"][dtype] = stats["device_types"].get(dtype, 0) + 1
            
            # Count vendors
            vendor = device.get("vendor", "Unknown")
            stats["vendors"][vendor] = stats["vendors"].get(vendor, 0) + 1
        
        return stats

# Global discovery manager
discovery_manager = DiscoveryManager()

@app.route('/')
def dashboard():
    """Main dashboard page"""
    devices = discovery_manager.get_discovered_devices()
    stats = discovery_manager.get_discovery_stats()
    
    return render_template('dashboard.html', 
                         devices=devices, 
                         stats=stats,
                         current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

@app.route('/api/devices')
def api_devices():
    """API endpoint for devices"""
    devices = discovery_manager.get_discovered_devices()
    return jsonify(devices)

@app.route('/api/stats')
def api_stats():
    """API endpoint for statistics"""
    stats = discovery_manager.get_discovery_stats()
    return jsonify(stats)

@app.route('/api/scan-now', methods=['POST'])
def api_scan_now():
    """Trigger immediate scan"""
    try:
        if discovery_manager.current_mode == "real" and discovery_manager.real_discovery:
            devices = discovery_manager.real_discovery.perform_network_scan()
            discovery_manager.real_discovery.save_to_local_db(devices)
            discovery_manager.real_discovery.sync_with_dashboard(devices)
            return jsonify({"status": "success", "devices_found": len(devices)})
        elif discovery_manager.current_mode == "mock" and discovery_manager.mock_discovery:
            devices = discovery_manager.mock_discovery.perform_mock_scan()
            discovery_manager.mock_discovery.sync_with_dashboard(devices)
            return jsonify({"status": "success", "devices_found": len(devices)})
        else:
            return jsonify({"status": "error", "message": "No discovery service running"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/switch-mode', methods=['POST'])
def api_switch_mode():
    """Switch between real and mock discovery"""
    mode = request.json.get('mode', 'mock')
    
    try:
        if mode == "real":
            discovery_manager.switch_to_real_discovery()
        else:
            discovery_manager.switch_to_mock_discovery()
        
        return jsonify({"status": "success", "mode": discovery_manager.current_mode})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/device/<mac_address>/history')
def api_device_history(mac_address):
    """Get IP history for a specific device"""
    # This would connect to your main dashboard's API
    try:
        import requests
        response = requests.get(f"{discovery_manager.dashboard_url}/api/network-devices")
        if response.status_code == 200:
            devices = response.json()
            device = next((d for d in devices if d['macAddress'] == mac_address), None)
            if device:
                # Get IP history from main dashboard
                history_response = requests.get(f"{discovery_manager.dashboard_url}/api/network-devices/{device['id']}/history")
                if history_response.status_code == 200:
                    return jsonify(history_response.json())
        
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)})

# HTML Templates (embedded for simplicity)
@app.route('/templates/dashboard.html')
def dashboard_template():
    return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Discovery Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8" x-data="discoveryDashboard()">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Automated Network Discovery</h1>
            <p class="text-gray-600 mt-2">Real-time device detection and classification</p>
            <div class="flex items-center mt-4 space-x-4">
                <div class="flex items-center">
                    <div class="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-sm text-gray-600">Live Scanning Active</span>
                </div>
                <div class="text-sm text-gray-500">Last updated: <span x-text="currentTime"></span></div>
            </div>
        </header>

        <!-- Control Panel -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">Discovery Controls</h2>
                <div class="flex space-x-2">
                    <button @click="switchMode('real')" 
                            :class="stats.scan_mode === 'real' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                            class="px-4 py-2 rounded-lg text-sm font-medium">
                        Real Network Scan
                    </button>
                    <button @click="switchMode('mock')" 
                            :class="stats.scan_mode === 'mock' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                            class="px-4 py-2 rounded-lg text-sm font-medium">
                        Demo Mode
                    </button>
                    <button @click="triggerScan()" 
                            class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                        Scan Now
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600" x-text="stats.total_devices || 0"></div>
                    <div class="text-sm text-blue-600">Total Devices</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-green-600" x-text="stats.active_devices || 0"></div>
                    <div class="text-sm text-green-600">Active Devices</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600" x-text="Object.keys(stats.device_types || {}).length"></div>
                    <div class="text-sm text-purple-600">Device Types</div>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-orange-600" x-text="Object.keys(stats.vendors || {}).length"></div>
                    <div class="text-sm text-orange-600">Vendors</div>
                </div>
            </div>
        </div>

        <!-- Devices Table -->
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-xl font-semibold">Discovered Devices</h2>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <template x-for="device in devices" :key="device.mac">
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900" x-text="device.hostname || 'Unknown'"></div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900 font-mono" x-text="device.ip"></div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-500 font-mono" x-text="device.mac"></div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800" 
                                          x-text="device.device_type || 'Unknown'"></span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900" x-text="device.vendor || 'Unknown'"></div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span :class="device.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                                          x-text="device.status || 'Unknown'"></span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span x-text="formatTime(device.last_seen)"></span>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function discoveryDashboard() {
            return {
                devices: [],
                stats: {},
                currentTime: new Date().toLocaleString(),
                
                init() {
                    this.loadData();
                    // Refresh data every 10 seconds
                    setInterval(() => {
                        this.loadData();
                        this.currentTime = new Date().toLocaleString();
                    }, 10000);
                },
                
                async loadData() {
                    try {
                        const devicesResponse = await fetch('/api/devices');
                        this.devices = await devicesResponse.json();
                        
                        const statsResponse = await fetch('/api/stats');
                        this.stats = await statsResponse.json();
                    } catch (error) {
                        console.error('Failed to load data:', error);
                    }
                },
                
                async switchMode(mode) {
                    try {
                        const response = await fetch('/api/switch-mode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mode })
                        });
                        const result = await response.json();
                        if (result.status === 'success') {
                            this.loadData();
                        }
                    } catch (error) {
                        console.error('Failed to switch mode:', error);
                    }
                },
                
                async triggerScan() {
                    try {
                        const response = await fetch('/api/scan-now', { method: 'POST' });
                        const result = await response.json();
                        console.log('Scan result:', result);
                        setTimeout(() => this.loadData(), 2000);
                    } catch (error) {
                        console.error('Failed to trigger scan:', error);
                    }
                },
                
                formatTime(timeStr) {
                    if (!timeStr) return 'Unknown';
                    try {
                        const date = new Date(timeStr);
                        const now = new Date();
                        const diffMs = now - date;
                        const diffSecs = Math.floor(diffMs / 1000);
                        const diffMins = Math.floor(diffSecs / 60);
                        const diffHours = Math.floor(diffMins / 60);
                        
                        if (diffSecs < 60) return `${diffSecs}s ago`;
                        if (diffMins < 60) return `${diffMins}m ago`;
                        if (diffHours < 24) return `${diffHours}h ago`;
                        return date.toLocaleDateString();
                    } catch {
                        return timeStr;
                    }
                }
            }
        }
    </script>
</body>
</html>
    '''

def create_templates_directory():
    """Create templates directory and dashboard template"""
    import os
    
    templates_dir = "templates"
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    dashboard_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Discovery Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8" x-data="discoveryDashboard()">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Automated Network Discovery</h1>
            <p class="text-gray-600 mt-2">Real-time device detection and classification</p>
            <div class="flex items-center mt-4 space-x-4">
                <div class="flex items-center">
                    <div class="h-3 w-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span class="text-sm text-gray-600">Live Scanning Active</span>
                </div>
                <div class="text-sm text-gray-500">Last updated: {{ current_time }}</div>
            </div>
        </header>

        <!-- Control Panel -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">Discovery Controls</h2>
                <div class="flex space-x-2">
                    <button @click="switchMode('real')" 
                            :class="stats.scan_mode === 'real' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                            class="px-4 py-2 rounded-lg text-sm font-medium">
                        Real Network Scan
                    </button>
                    <button @click="switchMode('mock')" 
                            :class="stats.scan_mode === 'mock' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                            class="px-4 py-2 rounded-lg text-sm font-medium">
                        Demo Mode
                    </button>
                    <button @click="triggerScan()" 
                            class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                        Scan Now
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">{{ stats.total_devices or 0 }}</div>
                    <div class="text-sm text-blue-600">Total Devices</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">{{ stats.active_devices or 0 }}</div>
                    <div class="text-sm text-green-600">Active Devices</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600">{{ stats.device_types|length or 0 }}</div>
                    <div class="text-sm text-purple-600">Device Types</div>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-orange-600">{{ stats.vendors|length or 0 }}</div>
                    <div class="text-sm text-orange-600">Vendors</div>
                </div>
            </div>
        </div>

        <!-- Device Types Chart -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 class="text-lg font-semibold mb-4">Device Types Distribution</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                {% for device_type, count in stats.device_types.items() %}
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <div class="text-xl font-bold text-gray-800">{{ count }}</div>
                    <div class="text-sm text-gray-600">{{ device_type }}</div>
                </div>
                {% endfor %}
            </div>
        </div>

        <!-- Devices Table -->
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-xl font-semibold">Discovered Devices ({{ devices|length }})</h2>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        {% for device in devices %}
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">{{ device.hostname or 'Unknown' }}</div>
                                {% if device.ports %}
                                <div class="text-xs text-gray-500">{{ device.ports|length }} ports open</div>
                                {% endif %}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900 font-mono">{{ device.ip }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-500 font-mono">{{ device.mac }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {{ device.device_type or 'Unknown' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">{{ device.vendor or 'Unknown' }}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                {% set status_class = 'bg-green-100 text-green-800' if device.status == 'Active' else 'bg-red-100 text-red-800' %}
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {{ status_class }}">
                                    {{ device.status or 'Unknown' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ device.last_seen }}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh page every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
    '''
    
    with open(os.path.join(templates_dir, "dashboard.html"), "w") as f:
        f.write(dashboard_html)

def main():
    """Main function to run the discovery dashboard"""
    print("=== Network Discovery Dashboard ===")
    print("Starting automated network discovery system...")
    
    # Create templates directory
    create_templates_directory()
    
    # Start with mock discovery for demonstration
    discovery_manager.switch_to_mock_discovery()
    
    print(f"Dashboard available at: http://localhost:8080")
    print("Features:")
    print("- Real-time device discovery and classification")
    print("- MAC address-based device tracking")
    print("- Automatic vendor identification")
    print("- Device type categorization")
    print("- Live dashboard with auto-refresh")
    print("\nPress Ctrl+C to stop...")
    
    try:
        app.run(host='0.0.0.0', port=8080, debug=True)
    except KeyboardInterrupt:
        print("\nStopping discovery dashboard...")
        if discovery_manager.real_discovery:
            discovery_manager.real_discovery.stop_scanning()
        if discovery_manager.mock_discovery:
            discovery_manager.mock_discovery.stop_discovery()

if __name__ == "__main__":
    main()