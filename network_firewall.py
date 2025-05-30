#!/usr/bin/env python3
"""
Network Firewall Integration Module
Supports multiple firewall types and provides simulation mode for demonstration
"""

import json
import subprocess
import socket
import paramiko
import requests
from typing import Dict, List, Optional, Tuple
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class FirewallIntegration(ABC):
    """Abstract base class for firewall integrations"""
    
    @abstractmethod
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """
        Block a domain for a specific device
        Returns: (success, message, firewall_rule)
        """
        pass
    
    @abstractmethod
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """
        Unblock a domain for a specific device
        Returns: (success, message)
        """
        pass
    
    @abstractmethod
    def list_rules(self) -> List[Dict]:
        """List all blocking rules"""
        pass
    
    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """Test connection to firewall"""
        pass

class PfSenseFirewall(FirewallIntegration):
    """pfSense firewall integration via SSH and API"""
    
    def __init__(self, host: str, username: str, password: str, api_key: str = None):
        self.host = host
        self.username = username
        self.password = password
        self.api_key = api_key
        self.ssh_client = None
    
    def _connect_ssh(self) -> bool:
        """Establish SSH connection"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh_client.connect(self.host, username=self.username, password=self.password)
            return True
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            return False
    
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """Block domain via pfSense firewall rule"""
        try:
            if not self._connect_ssh():
                return False, "SSH connection failed", None
            
            # Create pfSense firewall rule to block domain for specific IP
            command = f"""
            pfctl -t blocked_domains -T add {domain}
            echo "block out quick from {device_ip} to any port 80 label '{rule_name}'" | pfctl -f -
            echo "block out quick from {device_ip} to any port 443 label '{rule_name}'" | pfctl -f -
            """
            
            stdin, stdout, stderr = self.ssh_client.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code == 0:
                rule = f"block out quick from {device_ip} to {domain}"
                return True, f"Domain {domain} blocked for {device_ip}", rule
            else:
                error = stderr.read().decode()
                return False, f"Failed to create rule: {error}", None
                
        except Exception as e:
            return False, f"pfSense integration error: {e}", None
        finally:
            if self.ssh_client:
                self.ssh_client.close()
    
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """Remove domain blocking rule"""
        try:
            if not self._connect_ssh():
                return False, "SSH connection failed"
            
            command = f"pfctl -t blocked_domains -T delete {domain}"
            stdin, stdout, stderr = self.ssh_client.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code == 0:
                return True, f"Domain {domain} unblocked for {device_ip}"
            else:
                error = stderr.read().decode()
                return False, f"Failed to remove rule: {error}"
                
        except Exception as e:
            return False, f"pfSense integration error: {e}"
        finally:
            if self.ssh_client:
                self.ssh_client.close()
    
    def list_rules(self) -> List[Dict]:
        """List current firewall rules"""
        try:
            if not self._connect_ssh():
                return []
            
            stdin, stdout, stderr = self.ssh_client.exec_command("pfctl -sr")
            rules = stdout.read().decode().split('\n')
            
            parsed_rules = []
            for rule in rules:
                if 'block' in rule and 'label' in rule:
                    parsed_rules.append({
                        'rule': rule.strip(),
                        'type': 'block',
                        'active': True
                    })
            
            return parsed_rules
            
        except Exception as e:
            logger.error(f"Failed to list rules: {e}")
            return []
        finally:
            if self.ssh_client:
                self.ssh_client.close()
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test connection to pfSense"""
        try:
            if self._connect_ssh():
                stdin, stdout, stderr = self.ssh_client.exec_command("uname -a")
                output = stdout.read().decode()
                self.ssh_client.close()
                return True, f"Connected to pfSense: {output.strip()}"
            else:
                return False, "SSH connection failed"
        except Exception as e:
            return False, f"Connection test failed: {e}"

class OpenWrtFirewall(FirewallIntegration):
    """OpenWrt/LEDE firewall integration via SSH"""
    
    def __init__(self, host: str, username: str, password: str):
        self.host = host
        self.username = username
        self.password = password
    
    def _connect_ssh(self) -> paramiko.SSHClient:
        """Establish SSH connection"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(self.host, username=self.username, password=self.password)
            return ssh
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            return None
    
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """Block domain via iptables rules"""
        try:
            ssh = self._connect_ssh()
            if not ssh:
                return False, "SSH connection failed", None
            
            # Add domain to dnsmasq blacklist
            commands = [
                f"echo 'address=/{domain}/127.0.0.1' >> /etc/dnsmasq.conf",
                f"iptables -I FORWARD -s {device_ip} -m string --string '{domain}' --algo bm -j DROP",
                "/etc/init.d/dnsmasq restart",
                "/etc/init.d/firewall restart"
            ]
            
            for cmd in commands:
                stdin, stdout, stderr = ssh.exec_command(cmd)
                exit_code = stdout.channel.recv_exit_status()
                if exit_code != 0:
                    error = stderr.read().decode()
                    ssh.close()
                    return False, f"Command failed: {cmd} - {error}", None
            
            ssh.close()
            rule = f"iptables -I FORWARD -s {device_ip} -m string --string '{domain}' --algo bm -j DROP"
            return True, f"Domain {domain} blocked for {device_ip}", rule
            
        except Exception as e:
            return False, f"OpenWrt integration error: {e}", None
    
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """Remove domain blocking"""
        try:
            ssh = self._connect_ssh()
            if not ssh:
                return False, "SSH connection failed"
            
            commands = [
                f"sed -i '/address=\\/{domain}\\//d' /etc/dnsmasq.conf",
                f"iptables -D FORWARD -s {device_ip} -m string --string '{domain}' --algo bm -j DROP",
                "/etc/init.d/dnsmasq restart"
            ]
            
            for cmd in commands:
                stdin, stdout, stderr = ssh.exec_command(cmd)
                # Don't fail if rule doesn't exist
            
            ssh.close()
            return True, f"Domain {domain} unblocked for {device_ip}"
            
        except Exception as e:
            return False, f"OpenWrt integration error: {e}"
    
    def list_rules(self) -> List[Dict]:
        """List iptables rules"""
        try:
            ssh = self._connect_ssh()
            if not ssh:
                return []
            
            stdin, stdout, stderr = ssh.exec_command("iptables -L FORWARD -n")
            rules = stdout.read().decode().split('\n')
            ssh.close()
            
            parsed_rules = []
            for rule in rules:
                if 'DROP' in rule and 'string' in rule:
                    parsed_rules.append({
                        'rule': rule.strip(),
                        'type': 'block',
                        'active': True
                    })
            
            return parsed_rules
            
        except Exception as e:
            logger.error(f"Failed to list rules: {e}")
            return []
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test connection to OpenWrt"""
        try:
            ssh = self._connect_ssh()
            if ssh:
                stdin, stdout, stderr = ssh.exec_command("cat /etc/openwrt_release")
                output = stdout.read().decode()
                ssh.close()
                return True, f"Connected to OpenWrt: {output.strip()}"
            else:
                return False, "SSH connection failed"
        except Exception as e:
            return False, f"Connection test failed: {e}"

class FortiGateFirewall(FirewallIntegration):
    """FortiGate firewall integration via API"""
    
    def __init__(self, host: str, api_key: str, vdom: str = "root"):
        self.host = host
        self.api_key = api_key
        self.vdom = vdom
        self.base_url = f"https://{host}/api/v2"
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Tuple[bool, Dict]:
        """Make API request to FortiGate"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.base_url}{endpoint}"
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, verify=False)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, verify=False)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, verify=False)
            
            return response.status_code == 200, response.json()
            
        except Exception as e:
            logger.error(f"FortiGate API error: {e}")
            return False, {"error": str(e)}
    
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """Block domain via FortiGate policy"""
        try:
            # Create address object for domain
            address_data = {
                "name": f"blocked_{domain.replace('.', '_')}",
                "type": "fqdn",
                "fqdn": domain
            }
            
            success, response = self._make_request("POST", f"/cmdb/firewall/address?vdom={self.vdom}", address_data)
            
            if not success:
                return False, f"Failed to create address object: {response.get('error', 'Unknown error')}", None
            
            # Create firewall policy
            policy_data = {
                "name": rule_name,
                "srcintf": [{"name": "internal"}],
                "dstintf": [{"name": "wan1"}],
                "srcaddr": [{"name": f"host_{device_ip.replace('.', '_')}"}],
                "dstaddr": [{"name": f"blocked_{domain.replace('.', '_')}"}],
                "action": "deny",
                "schedule": "always",
                "service": [{"name": "ALL"}]
            }
            
            success, response = self._make_request("POST", f"/cmdb/firewall/policy?vdom={self.vdom}", policy_data)
            
            if success:
                return True, f"Domain {domain} blocked for {device_ip}", f"FortiGate policy: {rule_name}"
            else:
                return False, f"Failed to create policy: {response.get('error', 'Unknown error')}", None
                
        except Exception as e:
            return False, f"FortiGate integration error: {e}", None
    
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """Remove blocking policy"""
        try:
            # Find and delete the policy
            success, response = self._make_request("GET", f"/cmdb/firewall/policy?vdom={self.vdom}")
            
            if success:
                policies = response.get("results", [])
                for policy in policies:
                    if policy.get("name") == rule_name:
                        policy_id = policy.get("policyid")
                        success, response = self._make_request("DELETE", f"/cmdb/firewall/policy/{policy_id}?vdom={self.vdom}")
                        
                        if success:
                            return True, f"Domain {domain} unblocked for {device_ip}"
                        else:
                            return False, f"Failed to delete policy: {response.get('error', 'Unknown error')}"
            
            return False, "Policy not found"
            
        except Exception as e:
            return False, f"FortiGate integration error: {e}"
    
    def list_rules(self) -> List[Dict]:
        """List FortiGate policies"""
        try:
            success, response = self._make_request("GET", f"/cmdb/firewall/policy?vdom={self.vdom}")
            
            if success:
                policies = response.get("results", [])
                return [{"rule": p.get("name"), "type": "policy", "active": True} for p in policies]
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to list rules: {e}")
            return []
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test connection to FortiGate"""
        try:
            success, response = self._make_request("GET", f"/cmdb/system/status?vdom={self.vdom}")
            
            if success:
                version = response.get("version", "Unknown")
                return True, f"Connected to FortiGate: {version}"
            else:
                return False, f"Connection failed: {response.get('error', 'Unknown error')}"
                
        except Exception as e:
            return False, f"Connection test failed: {e}"

class SimulatedFirewall(FirewallIntegration):
    """Simulated firewall for demonstration purposes"""
    
    def __init__(self):
        self.rules = []
        self.rule_counter = 1
    
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """Simulate domain blocking"""
        try:
            # Simulate some processing time
            import time
            time.sleep(1)
            
            # Check if rule already exists
            for rule in self.rules:
                if rule['device_ip'] == device_ip and rule['domain'] == domain:
                    return False, f"Domain {domain} already blocked for {device_ip}", None
            
            # Simulate realistic success/failure rate
            import random
            if random.random() < 0.95:  # 95% success rate
                firewall_rule = f"BLOCK {device_ip} -> {domain} (Rule #{self.rule_counter})"
                self.rules.append({
                    'id': self.rule_counter,
                    'device_ip': device_ip,
                    'domain': domain,
                    'rule_name': rule_name,
                    'firewall_rule': firewall_rule,
                    'status': 'active',
                    'created': time.time()
                })
                self.rule_counter += 1
                
                return True, f"Domain {domain} successfully blocked for {device_ip}", firewall_rule
            else:
                return False, "Simulated firewall error: Network timeout", None
                
        except Exception as e:
            return False, f"Simulation error: {e}", None
    
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """Simulate domain unblocking"""
        try:
            import time
            time.sleep(0.5)
            
            # Find and remove the rule
            for i, rule in enumerate(self.rules):
                if rule['device_ip'] == device_ip and rule['domain'] == domain:
                    self.rules.pop(i)
                    return True, f"Domain {domain} successfully unblocked for {device_ip}"
            
            return False, f"No blocking rule found for {domain} on {device_ip}"
            
        except Exception as e:
            return False, f"Simulation error: {e}"
    
    def list_rules(self) -> List[Dict]:
        """List simulated rules"""
        return [
            {
                'rule': rule['firewall_rule'],
                'type': 'block',
                'active': rule['status'] == 'active',
                'device_ip': rule['device_ip'],
                'domain': rule['domain']
            }
            for rule in self.rules
        ]
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test simulated connection"""
        return True, "Connected to simulated firewall (Demo Mode)"

class FirewallManager:
    """Main firewall manager that handles different firewall types"""
    
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.firewall = None
        self.firewall_type = self.config.get('type', 'simulated')
        
        self._initialize_firewall()
    
    def _initialize_firewall(self):
        """Initialize the appropriate firewall integration"""
        try:
            if self.firewall_type == 'pfsense':
                self.firewall = PfSenseFirewall(
                    host=self.config.get('host'),
                    username=self.config.get('username'),
                    password=self.config.get('password'),
                    api_key=self.config.get('api_key')
                )
            elif self.firewall_type == 'openwrt':
                self.firewall = OpenWrtFirewall(
                    host=self.config.get('host'),
                    username=self.config.get('username'),
                    password=self.config.get('password')
                )
            elif self.firewall_type == 'fortigate':
                self.firewall = FortiGateFirewall(
                    host=self.config.get('host'),
                    api_key=self.config.get('api_key'),
                    vdom=self.config.get('vdom', 'root')
                )
            else:
                # Default to simulated firewall
                self.firewall = SimulatedFirewall()
                self.firewall_type = 'simulated'
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.firewall_type} firewall: {e}")
            # Fallback to simulated firewall
            self.firewall = SimulatedFirewall()
            self.firewall_type = 'simulated'
    
    def block_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str, Optional[str]]:
        """Block domain for device"""
        if not self.firewall:
            return False, "No firewall configured", None
        
        return self.firewall.block_domain(device_ip, domain, rule_name)
    
    def unblock_domain(self, device_ip: str, domain: str, rule_name: str) -> Tuple[bool, str]:
        """Unblock domain for device"""
        if not self.firewall:
            return False, "No firewall configured"
        
        return self.firewall.unblock_domain(device_ip, domain, rule_name)
    
    def list_rules(self) -> List[Dict]:
        """List all firewall rules"""
        if not self.firewall:
            return []
        
        return self.firewall.list_rules()
    
    def test_connection(self) -> Tuple[bool, str]:
        """Test firewall connection"""
        if not self.firewall:
            return False, "No firewall configured"
        
        return self.firewall.test_connection()
    
    def get_firewall_info(self) -> Dict:
        """Get firewall information"""
        return {
            'type': self.firewall_type,
            'config': {k: '***' if 'password' in k or 'key' in k else v for k, v in self.config.items()},
            'available': self.firewall is not None
        }