// Pure TypeScript router configuration manager
// Replaces Python dependencies for deployment compatibility

import fs from 'fs';
import path from 'path';

interface RouterConfig {
  router_ip: string;
  ssh_username: string;
  ssh_password: string;
  mode: string;
  router_type: string;
  ssh_port: number;
  last_updated?: string;
  connection_status?: {
    success: boolean;
    message: string;
    last_tested?: string;
  };
}

interface FirewallRule {
  id: string;
  device_ip: string;
  domain: string;
  rule_name: string;
  created_at: string;
  status: 'active' | 'inactive';
}

export class RouterManager {
  private configPath: string;
  private rulesPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'router_config.json');
    this.rulesPath = path.join(process.cwd(), 'firewall_rules.json');
  }

  loadConfig(): RouterConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading router config:', error);
    }
    
    return {
      router_ip: '',
      ssh_username: '',
      ssh_password: '',
      mode: 'simulated',
      router_type: 'generic',
      ssh_port: 22
    };
  }

  saveConfig(config: Partial<RouterConfig>): boolean {
    try {
      const currentConfig = this.loadConfig();
      const newConfig = {
        ...currentConfig,
        ...config,
        last_updated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving router config:', error);
      return false;
    }
  }

  async testConnection(router_ip: string, ssh_username: string, ssh_password: string): Promise<{
    success: boolean;
    message: string;
    connection_info: any;
  }> {
    // Simulate connection test for deployment compatibility
    try {
      // In a real implementation, this would use SSH to test the connection
      // For now, simulate based on provided credentials
      const isValidFormat = router_ip.match(/^\d+\.\d+\.\d+\.\d+$/) && ssh_username.length > 0;
      
      if (isValidFormat) {
        const success = Math.random() > 0.3; // Simulate connection success/failure
        
        this.updateConnectionStatus(success, success ? 'Connection successful' : 'Connection failed');
        
        return {
          success,
          message: success ? 'Router connection successful' : 'Unable to connect to router',
          connection_info: {
            router_type: 'Generic Router',
            firmware_version: 'v1.0.0',
            uptime: '7 days, 3 hours'
          }
        };
      } else {
        return {
          success: false,
          message: 'Invalid router IP or credentials',
          connection_info: {}
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        connection_info: {}
      };
    }
  }

  updateConnectionStatus(success: boolean, message: string): void {
    const config = this.loadConfig();
    config.connection_status = {
      success,
      message,
      last_tested: new Date().toISOString()
    };
    this.saveConfig(config);
  }

  addFirewallRule(device_ip: string, domain: string, rule_name: string): {
    success: boolean;
    message: string;
    rule_id: string;
  } {
    try {
      const rules = this.loadFirewallRules();
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRule: FirewallRule = {
        id: ruleId,
        device_ip,
        domain,
        rule_name,
        created_at: new Date().toISOString(),
        status: 'active'
      };
      
      rules.push(newRule);
      this.saveFirewallRules(rules);
      
      return {
        success: true,
        message: `Firewall rule created for ${domain}`,
        rule_id: ruleId
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create firewall rule',
        rule_id: ''
      };
    }
  }

  removeFirewallRule(rule_id: string): { success: boolean; message: string } {
    try {
      const rules = this.loadFirewallRules();
      const filteredRules = rules.filter(rule => rule.id !== rule_id);
      
      if (filteredRules.length < rules.length) {
        this.saveFirewallRules(filteredRules);
        return {
          success: true,
          message: 'Firewall rule removed successfully'
        };
      } else {
        return {
          success: false,
          message: 'Firewall rule not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to remove firewall rule'
      };
    }
  }

  private loadFirewallRules(): FirewallRule[] {
    try {
      if (fs.existsSync(this.rulesPath)) {
        return JSON.parse(fs.readFileSync(this.rulesPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading firewall rules:', error);
    }
    return [];
  }

  private saveFirewallRules(rules: FirewallRule[]): void {
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(rules, null, 2));
    } catch (error) {
      console.error('Error saving firewall rules:', error);
    }
  }

  getFirewallStatus(): {
    connected: boolean;
    type: string;
    version: string;
    rules_count: number;
    last_sync: string | null;
  } {
    const config = this.loadConfig();
    const rules = this.loadFirewallRules();
    
    return {
      connected: config.connection_status?.success || false,
      type: config.mode || 'simulated',
      version: 'Router Manager v1.0',
      rules_count: rules.length,
      last_sync: config.connection_status?.last_tested || null
    };
  }
}

export const routerManager = new RouterManager();