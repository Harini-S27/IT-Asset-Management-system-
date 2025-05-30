#!/usr/bin/env python3
"""
Global Website Blocking System
Manages network-wide domain blocking across all discovered devices
Supports both simulated mode (JSON storage) and real SSH router control
"""

import json
import os
import paramiko
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GlobalBlockingManager:
    def __init__(self, config_file: str = "global_blocked_sites.json", router_config_file: str = "router_config.json"):
        self.config_file = config_file
        self.router_config_file = router_config_file
        self.blocked_domains = self.load_blocked_domains()
        
    def load_blocked_domains(self) -> List[Dict]:
        """Load blocked domains from JSON file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            logger.error(f"Error loading blocked domains: {e}")
            return []
    
    def save_blocked_domains(self) -> bool:
        """Save blocked domains to JSON file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.blocked_domains, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving blocked domains: {e}")
            return False
    
    def load_router_config(self) -> Optional[Dict]:
        """Load router configuration for SSH access"""
        try:
            if os.path.exists(self.router_config_file):
                with open(self.router_config_file, 'r') as f:
                    config = json.load(f)
                    if config.get('connection_status', {}).get('success', False):
                        return config
            return None
        except Exception as e:
            logger.error(f"Error loading router config: {e}")
            return None
    
    def get_discovered_devices(self) -> List[Dict]:
        """Get list of discovered devices from network discovery"""
        # This would integrate with your existing network discovery system
        # For now, return a placeholder that integrates with your existing API
        try:
            import requests
            response = requests.get('http://localhost:5000/api/network-devices')
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            logger.error(f"Error getting discovered devices: {e}")
            return []
    
    def add_blocked_domain(self, domain: str, reason: str = "Global block", created_by: str = "admin") -> Tuple[bool, str]:
        """Add a domain to the global block list"""
        try:
            # Clean domain input
            clean_domain = domain.strip().lower().replace('http://', '').replace('https://', '').replace('www.', '')
            
            # Check if already blocked
            if any(d['domain'] == clean_domain for d in self.blocked_domains):
                return False, f"Domain {clean_domain} is already blocked"
            
            # Add to blocked list
            block_entry = {
                "domain": clean_domain,
                "reason": reason,
                "created_by": created_by,
                "created_at": datetime.now().isoformat(),
                "applied_devices": [],
                "status": "active"
            }
            
            self.blocked_domains.append(block_entry)
            
            # Save to file
            if self.save_blocked_domains():
                # Apply blocking rules
                success, applied_count = self.apply_domain_block(clean_domain)
                if success:
                    return True, f"Domain {clean_domain} blocked successfully on {applied_count} devices"
                else:
                    return True, f"Domain {clean_domain} added to block list (rules application pending)"
            else:
                return False, "Failed to save blocked domains"
                
        except Exception as e:
            logger.error(f"Error adding blocked domain: {e}")
            return False, f"Error adding domain: {str(e)}"
    
    def remove_blocked_domain(self, domain: str, removed_by: str = "admin") -> Tuple[bool, str]:
        """Remove a domain from the global block list"""
        try:
            clean_domain = domain.strip().lower()
            
            # Find and remove domain
            original_count = len(self.blocked_domains)
            self.blocked_domains = [d for d in self.blocked_domains if d['domain'] != clean_domain]
            
            if len(self.blocked_domains) == original_count:
                return False, f"Domain {clean_domain} not found in block list"
            
            # Save changes
            if self.save_blocked_domains():
                # Remove blocking rules
                success, removed_count = self.remove_domain_block(clean_domain)
                if success:
                    return True, f"Domain {clean_domain} unblocked successfully on {removed_count} devices"
                else:
                    return True, f"Domain {clean_domain} removed from block list (rules removal pending)"
            else:
                return False, "Failed to save changes"
                
        except Exception as e:
            logger.error(f"Error removing blocked domain: {e}")
            return False, f"Error removing domain: {str(e)}"
    
    def apply_domain_block(self, domain: str) -> Tuple[bool, int]:
        """Apply blocking rules for a domain across all devices"""
        router_config = self.load_router_config()
        devices = self.get_discovered_devices()
        applied_count = 0
        
        if not router_config:
            # Simulated mode - just update status
            logger.info(f"Simulated mode: Blocking {domain} on {len(devices)} devices")
            return True, len(devices)
        
        # Real SSH mode
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(
                hostname=router_config['router_ip'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 22),
                timeout=10
            )
            
            for device in devices:
                device_ip = device.get('currentIp')
                if device_ip:
                    # Apply iptables rule to block domain for this device
                    rule_command = f"iptables -A FORWARD -s {device_ip} -m string --string '{domain}' --algo bm -j REJECT"
                    stdin, stdout, stderr = ssh.exec_command(rule_command)
                    
                    if stderr.read().decode().strip() == "":
                        applied_count += 1
                        logger.info(f"Applied block rule for {domain} on device {device_ip}")
                    else:
                        logger.warning(f"Failed to apply rule for {device_ip}: {stderr.read().decode()}")
            
            ssh.close()
            return True, applied_count
            
        except Exception as e:
            logger.error(f"Error applying domain block via SSH: {e}")
            return False, 0
    
    def remove_domain_block(self, domain: str) -> Tuple[bool, int]:
        """Remove blocking rules for a domain across all devices"""
        router_config = self.load_router_config()
        devices = self.get_discovered_devices()
        removed_count = 0
        
        if not router_config:
            # Simulated mode
            logger.info(f"Simulated mode: Unblocking {domain} on {len(devices)} devices")
            return True, len(devices)
        
        # Real SSH mode
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(
                hostname=router_config['router_ip'],
                username=router_config['username'],
                password=router_config['password'],
                port=router_config.get('port', 22),
                timeout=10
            )
            
            for device in devices:
                device_ip = device.get('currentIp')
                if device_ip:
                    # Remove iptables rule
                    rule_command = f"iptables -D FORWARD -s {device_ip} -m string --string '{domain}' --algo bm -j REJECT"
                    stdin, stdout, stderr = ssh.exec_command(rule_command)
                    removed_count += 1
            
            ssh.close()
            return True, removed_count
            
        except Exception as e:
            logger.error(f"Error removing domain block via SSH: {e}")
            return False, 0
    
    def get_blocked_domains(self) -> List[Dict]:
        """Get list of all blocked domains"""
        return self.blocked_domains
    
    def reapply_all_rules(self) -> Tuple[bool, str]:
        """Re-apply all blocking rules across all devices"""
        total_applied = 0
        failed_domains = []
        
        for domain_entry in self.blocked_domains:
            if domain_entry['status'] == 'active':
                success, count = self.apply_domain_block(domain_entry['domain'])
                if success:
                    total_applied += count
                else:
                    failed_domains.append(domain_entry['domain'])
        
        if failed_domains:
            return False, f"Applied {total_applied} rules, failed: {', '.join(failed_domains)}"
        else:
            return True, f"Successfully applied {total_applied} blocking rules"
    
    def get_blocking_status(self) -> Dict:
        """Get current blocking system status"""
        router_config = self.load_router_config()
        devices = self.get_discovered_devices()
        
        return {
            "mode": "real_ssh" if router_config else "simulated",
            "blocked_domains_count": len([d for d in self.blocked_domains if d['status'] == 'active']),
            "total_devices": len(devices),
            "router_connected": bool(router_config),
            "last_updated": datetime.now().isoformat()
        }

def main():
    """Test the global blocking system"""
    manager = GlobalBlockingManager()
    
    # Test adding a domain
    success, message = manager.add_blocked_domain("facebook.com", "Test block", "admin")
    print(f"Add domain result: {success} - {message}")
    
    # List blocked domains
    domains = manager.get_blocked_domains()
    print(f"Blocked domains: {domains}")
    
    # Get status
    status = manager.get_blocking_status()
    print(f"System status: {status}")

if __name__ == "__main__":
    main()