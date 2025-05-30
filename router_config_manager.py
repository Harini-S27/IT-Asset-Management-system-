#!/usr/bin/env python3
"""
Router Configuration Manager
Handles router setup, connection testing, and configuration persistence
"""

import json
import os
import paramiko
import socket
from typing import Dict, Tuple, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RouterConfigManager:
    def __init__(self, config_file: str = "router_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
    
    def load_config(self) -> Dict:
        """Load router configuration from file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
        
        # Return default configuration
        return {
            "router_ip": "",
            "ssh_username": "",
            "ssh_password": "",
            "mode": "simulated",
            "router_type": "generic",
            "ssh_port": 22,
            "connection_timeout": 10,
            "last_tested": None,
            "last_status": "unknown"
        }
    
    def save_config(self, config: Dict) -> bool:
        """Save router configuration to file"""
        try:
            # Add metadata
            config["last_updated"] = datetime.now().isoformat()
            config["version"] = "1.0"
            
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.config = config
            return True
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False
    
    def test_ssh_connection(self, 
                           router_ip: str, 
                           username: str, 
                           password: str, 
                           port: int = 22,
                           timeout: int = 10) -> Tuple[bool, str, Dict]:
        """Test SSH connection to router"""
        connection_info = {
            "tested_at": datetime.now().isoformat(),
            "router_ip": router_ip,
            "ssh_port": port,
            "response_time": None,
            "router_info": None
        }
        
        try:
            start_time = datetime.now()
            
            # Test basic connectivity first
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((router_ip, port))
            sock.close()
            
            if result != 0:
                return False, f"Cannot reach {router_ip}:{port} - Network unreachable", connection_info
            
            # Test SSH connection
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh.connect(
                hostname=router_ip,
                username=username,
                password=password,
                port=port,
                timeout=timeout,
                look_for_keys=False,
                allow_agent=False
            )
            
            # Get system information
            stdin, stdout, stderr = ssh.exec_command("uname -a || cat /etc/os-release || echo 'Unknown system'")
            system_info = stdout.read().decode('utf-8', errors='ignore').strip()
            
            # Try to detect router type
            router_type = self.detect_router_type(ssh)
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            connection_info.update({
                "response_time": response_time,
                "router_info": {
                    "system_info": system_info,
                    "router_type": router_type,
                    "capabilities": self.check_router_capabilities(ssh, router_type)
                }
            })
            
            ssh.close()
            
            return True, f"Successfully connected to {router_type} router", connection_info
            
        except paramiko.AuthenticationException:
            return False, "Authentication failed - Invalid username or password", connection_info
        except paramiko.SSHException as e:
            return False, f"SSH connection failed: {str(e)}", connection_info
        except socket.timeout:
            return False, f"Connection timeout - Router not responding on port {port}", connection_info
        except Exception as e:
            return False, f"Connection failed: {str(e)}", connection_info
    
    def detect_router_type(self, ssh: paramiko.SSHClient) -> str:
        """Detect router type based on system information"""
        detection_commands = [
            ("pfSense", "cat /etc/version"),
            ("OpenWrt", "cat /etc/openwrt_release"),
            ("DD-WRT", "nvram get os_name"),
            ("Ubiquiti EdgeOS", "cat /opt/vyatta/etc/version"),
            ("MikroTik", "/system resource print"),
            ("Cisco IOS", "show version"),
            ("Linux", "cat /proc/version")
        ]
        
        for router_type, command in detection_commands:
            try:
                stdin, stdout, stderr = ssh.exec_command(command)
                output = stdout.read().decode('utf-8', errors='ignore')
                if output.strip() and not stderr.read():
                    if router_type == "pfSense" and "pfsense" in output.lower():
                        return "pfSense"
                    elif router_type == "OpenWrt" and "openwrt" in output.lower():
                        return "OpenWrt"
                    elif router_type == "DD-WRT" and "dd-wrt" in output.lower():
                        return "DD-WRT"
                    elif router_type == "Ubiquiti EdgeOS" and "vyatta" in output.lower():
                        return "EdgeOS"
                    elif router_type == "MikroTik" and "mikrotik" in output.lower():
                        return "MikroTik"
                    elif router_type == "Cisco IOS" and "cisco" in output.lower():
                        return "Cisco IOS"
                    elif router_type == "Linux" and "linux" in output.lower():
                        return "Linux-based Router"
            except:
                continue
        
        return "Generic Router"
    
    def check_router_capabilities(self, ssh: paramiko.SSHClient, router_type: str) -> Dict:
        """Check what capabilities the router supports"""
        capabilities = {
            "iptables": False,
            "pfctl": False,
            "dnsmasq": False,
            "web_filtering": False,
            "api_support": False
        }
        
        capability_tests = [
            ("iptables", "which iptables"),
            ("pfctl", "which pfctl"),
            ("dnsmasq", "which dnsmasq"),
        ]
        
        for capability, command in capability_tests:
            try:
                stdin, stdout, stderr = ssh.exec_command(command)
                output = stdout.read().decode('utf-8', errors='ignore')
                if output.strip() and not stderr.read():
                    capabilities[capability] = True
            except:
                pass
        
        # Router-specific capability detection
        if router_type == "pfSense":
            capabilities["web_filtering"] = True
            capabilities["api_support"] = True
        elif router_type == "OpenWrt":
            capabilities["web_filtering"] = True
        elif router_type in ["DD-WRT", "Linux-based Router"]:
            capabilities["web_filtering"] = capabilities["iptables"]
        
        return capabilities
    
    def get_connection_status(self) -> Dict:
        """Get current connection status"""
        if not self.config.get("router_ip"):
            return {
                "status": "not_configured",
                "message": "Router not configured",
                "last_tested": None
            }
        
        if self.config.get("mode") == "simulated":
            return {
                "status": "simulated",
                "message": "Running in simulation mode",
                "last_tested": self.config.get("last_tested")
            }
        
        return {
            "status": self.config.get("last_status", "unknown"),
            "message": f"Router: {self.config.get('router_ip')} ({self.config.get('router_type', 'Unknown')})",
            "last_tested": self.config.get("last_tested")
        }
    
    def validate_config(self, config: Dict) -> Tuple[bool, str]:
        """Validate router configuration"""
        required_fields = ["router_ip", "ssh_username", "mode"]
        
        for field in required_fields:
            if not config.get(field):
                return False, f"Missing required field: {field}"
        
        # Validate IP address format
        router_ip = config["router_ip"]
        try:
            parts = router_ip.split('.')
            if len(parts) != 4 or not all(0 <= int(part) <= 255 for part in parts):
                return False, "Invalid IP address format"
        except:
            return False, "Invalid IP address format"
        
        # Validate mode
        if config["mode"] not in ["simulated", "real"]:
            return False, "Mode must be 'simulated' or 'real'"
        
        # For real mode, password is required
        if config["mode"] == "real" and not config.get("ssh_password"):
            return False, "SSH password is required for real mode"
        
        return True, "Configuration valid"
    
    def update_connection_status(self, success: bool, message: str, router_info: Dict = None):
        """Update the connection status in config"""
        self.config.update({
            "last_tested": datetime.now().isoformat(),
            "last_status": "connected" if success else "failed",
            "last_message": message
        })
        
        if router_info and success:
            self.config.update({
                "router_type": router_info.get("router_info", {}).get("router_type", "Unknown"),
                "capabilities": router_info.get("router_info", {}).get("capabilities", {})
            })
        
        self.save_config(self.config)
    
    def get_firewall_config(self) -> Dict:
        """Get configuration for firewall integration"""
        if self.config.get("mode") == "simulated":
            return {"type": "simulated"}
        
        router_type = self.config.get("router_type", "generic").lower()
        
        firewall_config = {
            "type": "simulated",  # Default fallback
            "host": self.config.get("router_ip"),
            "username": self.config.get("ssh_username"),
            "password": self.config.get("ssh_password"),
            "port": self.config.get("ssh_port", 22)
        }
        
        # Map router types to firewall integration types
        if "pfsense" in router_type:
            firewall_config["type"] = "pfsense"
        elif "openwrt" in router_type:
            firewall_config["type"] = "openwrt"
        elif "fortigate" in router_type:
            firewall_config["type"] = "fortigate"
            if self.config.get("api_key"):
                firewall_config["api_key"] = self.config["api_key"]
        
        return firewall_config
    
    def export_config(self) -> str:
        """Export configuration as JSON string"""
        # Remove sensitive data for export
        export_config = self.config.copy()
        if "ssh_password" in export_config:
            export_config["ssh_password"] = "***HIDDEN***"
        
        return json.dumps(export_config, indent=2)
    
    def reset_config(self) -> bool:
        """Reset configuration to defaults"""
        try:
            if os.path.exists(self.config_file):
                os.remove(self.config_file)
            self.config = self.load_config()
            return True
        except Exception as e:
            logger.error(f"Failed to reset config: {e}")
            return False

# Global router config instance
router_config = RouterConfigManager()

def test_router_connection(router_ip: str, username: str, password: str) -> Tuple[bool, str, Dict]:
    """Convenience function for testing router connections"""
    return router_config.test_ssh_connection(router_ip, username, password)

def get_router_status() -> Dict:
    """Get current router connection status"""
    return router_config.get_connection_status()

def save_router_config(config_data: Dict) -> Tuple[bool, str]:
    """Save router configuration"""
    valid, message = router_config.validate_config(config_data)
    if not valid:
        return False, message
    
    success = router_config.save_config(config_data)
    return success, "Configuration saved successfully" if success else "Failed to save configuration"