import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from './storage';
import { Device } from '@shared/schema';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface DiscoveredDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  ports: number[];
  osGuess: string;
  responseTime: number;
  lastSeen: string;
}

interface DeviceApiKey {
  deviceId: number;
  apiKey: string;
  deviceName: string;
  ipAddress: string;
  macAddress: string;
  createdAt: string;
  status: 'active' | 'inactive';
  lastUsed?: string;
}

export class NetworkScanner {
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private deviceApiKeys: Map<string, DeviceApiKey> = new Map();
  private apiKeysPath: string;
  private scanNetworks: string[];
  private broadcastCallback: ((message: any) => void) | null = null;

  constructor() {
    this.apiKeysPath = path.join(process.cwd(), 'device_api_keys.json');
    this.scanNetworks = [
      '192.168.1.0/24',     // Common home/office network
      '192.168.0.0/24',     // Common router default
      '10.0.0.0/24',        // Corporate network
      '172.16.0.0/24'       // Private network
    ];
    this.loadApiKeys();
  }

  private loadApiKeys(): void {
    try {
      if (fs.existsSync(this.apiKeysPath)) {
        const data = fs.readFileSync(this.apiKeysPath, 'utf8');
        const keys = JSON.parse(data);
        this.deviceApiKeys = new Map(keys.map((key: DeviceApiKey) => [key.macAddress, key]));
        console.log(`📡 Network Scanner: Loaded ${this.deviceApiKeys.size} device API keys`);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  private saveApiKeys(): void {
    try {
      const keys = Array.from(this.deviceApiKeys.values());
      fs.writeFileSync(this.apiKeysPath, JSON.stringify(keys, null, 2));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  private generateApiKey(): string {
    return 'finecons_' + crypto.randomBytes(32).toString('hex');
  }

  private async detectActiveNetwork(): Promise<string> {
    try {
      // Try to detect the current network range
      const { stdout } = await execAsync('ip route | grep -E "192.168|10.0|172.16" | head -1');
      const match = stdout.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/);
      if (match) {
        return match[1];
      }
    } catch (error) {
      console.log('Could not detect network automatically, using defaults');
    }
    return this.scanNetworks[0]; // Default fallback
  }

  private async scanNetwork(network: string): Promise<DiscoveredDevice[]> {
    console.log(`🔍 Scanning network: ${network}`);
    const devices: DiscoveredDevice[] = [];

    try {
      // Try ARP scan first (works better in most networks)
      const arpDevices = await this.arpScan(network);
      if (arpDevices.length > 0) {
        console.log(`📡 ARP scan found ${arpDevices.length} devices`);
        return arpDevices;
      }

      // Fallback to nmap if available
      const nmapCommand = `nmap -sn ${network} | grep -E "(Nmap scan report|MAC Address)"`;
      const { stdout } = await execAsync(nmapCommand);
      
      const lines = stdout.split('\n');
      let currentDevice: Partial<DiscoveredDevice> = {};

      for (const line of lines) {
        if (line.includes('Nmap scan report')) {
          if (currentDevice.ip) {
            devices.push(currentDevice as DiscoveredDevice);
          }
          
          const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          const hostnameMatch = line.match(/for (.+) \(/);
          
          currentDevice = {
            ip: ipMatch ? ipMatch[1] : '',
            hostname: hostnameMatch ? hostnameMatch[1] : 'Unknown',
            mac: '',
            vendor: '',
            ports: [],
            osGuess: 'Unknown',
            responseTime: 0,
            lastSeen: new Date().toISOString()
          };
        } else if (line.includes('MAC Address')) {
          const macMatch = line.match(/MAC Address: ([A-Fa-f0-9:]{17})/);
          const vendorMatch = line.match(/\((.+)\)/);
          
          if (macMatch) {
            currentDevice.mac = macMatch[1];
            currentDevice.vendor = vendorMatch ? vendorMatch[1] : 'Unknown';
          }
        }
      }

      if (currentDevice.ip) {
        devices.push(currentDevice as DiscoveredDevice);
      }

    } catch (error) {
      console.error(`Error scanning network ${network}:`, error);
      return this.fallbackPingScan(network);
    }

    return devices;
  }

  private async arpScan(network: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    
    try {
      // Method 1: Use arp-scan if available
      try {
        const arpScanCommand = `arp-scan ${network}`;
        const { stdout } = await execAsync(arpScanCommand);
        return this.parseArpScanOutput(stdout);
      } catch (error) {
        console.log('arp-scan not available, trying alternative methods');
      }

      // Method 2: Use system ARP table + ping sweep
      const baseIP = network.split('/')[0].split('.').slice(0, 3).join('.');
      const subnet = parseInt(network.split('/')[1]) || 24;
      const hostCount = subnet === 24 ? 254 : 20; // Limit scan range

      // Ping sweep to populate ARP table
      console.log(`🔄 Ping sweep for ${network}`);
      const pingPromises = [];
      for (let i = 1; i <= Math.min(hostCount, 50); i++) {
        const ip = `${baseIP}.${i}`;
        pingPromises.push(this.quickPing(ip));
      }
      
      await Promise.allSettled(pingPromises);
      
      // Read ARP table
      const arpDevices = await this.readArpTable();
      console.log(`📋 ARP table scan found ${arpDevices.length} devices`);
      
      return arpDevices;

    } catch (error) {
      console.error('ARP scan failed:', error);
      return [];
    }
  }

  private async parseArpScanOutput(output: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse arp-scan output: IP MAC Vendor
      const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9:]{17})\s+(.+)/);
      if (match) {
        devices.push({
          ip: match[1],
          mac: match[2],
          hostname: await this.getHostname(match[1]),
          vendor: match[3].trim(),
          ports: [],
          osGuess: 'Unknown',
          responseTime: 0,
          lastSeen: new Date().toISOString()
        });
      }
    }
    
    return devices;
  }

  private async quickPing(ip: string): Promise<boolean> {
    try {
      const command = process.platform === 'win32' 
        ? `ping -n 1 -w 1000 ${ip}` 
        : `ping -c 1 -W 1 ${ip}`;
      
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async readArpTable(): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    
    try {
      const command = process.platform === 'win32' ? 'arp -a' : 'arp -a';
      const { stdout } = await execAsync(command);
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        let match;
        
        if (process.platform === 'win32') {
          // Windows ARP format: IP Address Physical Address Type
          match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9-]{17})\s+dynamic/i);
          if (match) {
            const mac = match[2].replace(/-/g, ':').toLowerCase();
            devices.push({
              ip: match[1],
              mac: mac,
              hostname: await this.getHostname(match[1]),
              vendor: this.guessVendorFromMac(mac),
              ports: [],
              osGuess: 'Unknown',
              responseTime: 0,
              lastSeen: new Date().toISOString()
            });
          }
        } else {
          // Linux ARP format: host (IP) at MAC [ether] on interface
          match = line.match(/(\S+)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([a-fA-F0-9:]{17})/);
          if (match) {
            devices.push({
              ip: match[2],
              mac: match[3].toLowerCase(),
              hostname: match[1] !== '?' ? match[1] : await this.getHostname(match[2]),
              vendor: this.guessVendorFromMac(match[3]),
              ports: [],
              osGuess: 'Unknown',
              responseTime: 0,
              lastSeen: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading ARP table:', error);
    }
    
    return devices;
  }

  private guessVendorFromMac(mac: string): string {
    const oui = mac.substring(0, 8).toUpperCase();
    const vendors: { [key: string]: string } = {
      '00:50:56': 'VMware',
      '08:00:27': 'VirtualBox',
      '00:15:5D': 'Microsoft Hyper-V',
      '00:1B:21': 'Intel Corporation',
      '00:1A:A0': 'Marvell',
      '00:E0:4C': 'Realtek',
      '00:25:90': 'Apple',
      '00:26:BB': 'Apple',
      '28:CD:C1': 'Apple',
      '3C:15:C2': 'Apple',
      '00:21:CC': 'Intel',
      '00:24:D7': 'Intel',
      '00:1F:3C': 'Intel'
    };
    
    return vendors[oui] || 'Unknown Vendor';
  }

  private async fallbackPingScan(network: string): Promise<DiscoveredDevice[]> {
    console.log(`🔄 Fallback ping scan for ${network}`);
    const devices: DiscoveredDevice[] = [];
    const baseIP = network.split('/')[0].split('.').slice(0, 3).join('.');

    // Ping a smaller range for faster testing
    const pingPromises = [];
    for (let i = 1; i <= 20; i++) {
      const ip = `${baseIP}.${i}`;
      pingPromises.push(this.pingDevice(ip));
    }

    const results = await Promise.allSettled(pingPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        devices.push(result.value);
      }
    }

    // No simulated devices - rely on Python agents for device discovery
    console.log(`📱 Agent-only mode: ${devices.length} devices found via ping scan`);

    return devices;
  }

  private async pingDevice(ip: string): Promise<DiscoveredDevice | null> {
    try {
      const { stdout } = await execAsync(`ping -c 1 -W 1 ${ip}`);
      if (stdout.includes('1 received')) {
        return {
          ip,
          mac: await this.getMacAddress(ip),
          hostname: await this.getHostname(ip),
          vendor: 'Unknown',
          ports: [],
          osGuess: 'Unknown',
          responseTime: this.extractPingTime(stdout),
          lastSeen: new Date().toISOString()
        };
      }
    } catch (error) {
      // Device not reachable
    }
    return null;
  }

  private async getMacAddress(ip: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`arp -n ${ip}`);
      const macMatch = stdout.match(/([a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2}:[a-fA-F0-9]{2})/);
      return macMatch ? macMatch[1] : '';
    } catch (error) {
      return '';
    }
  }

  private async getHostname(ip: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`);
      const nameMatch = stdout.match(/name = (.+)\./);
      return nameMatch ? nameMatch[1] : ip;
    } catch (error) {
      return ip;
    }
  }

  private extractPingTime(pingOutput: string): number {
    const timeMatch = pingOutput.match(/time=(\d+\.?\d*)/);
    return timeMatch ? parseFloat(timeMatch[1]) : 0;
  }

  private async registerDeviceWithApiKey(device: DiscoveredDevice): Promise<DeviceApiKey> {
    const deviceName = device.hostname !== 'Unknown' ? device.hostname : `Device-${device.ip.split('.').pop()}`;
    const apiKey = this.generateApiKey();

    // Create device in database (for approval notification)
    const dbDevice = await storage.createDevice({
      name: deviceName,
      type: this.guessDeviceType(device),
      model: `${device.vendor} Device`,
      status: 'Active',
      location: 'Auto-Discovered',
      ipAddress: device.ip,
      latitude: '37.7749',  // Default to San Francisco
      longitude: '-122.4194'
    });

    // Broadcast device added notification for approval popup
    this.broadcastDeviceNotification({
      type: 'DEVICE_ADDED',
      data: dbDevice,
      timestamp: new Date().toISOString(),
      isNewDevice: true
    });

    // Create API key record
    const apiKeyRecord: DeviceApiKey = {
      deviceId: dbDevice.id,
      apiKey,
      deviceName,
      ipAddress: device.ip,
      macAddress: device.mac,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    this.deviceApiKeys.set(device.mac, apiKeyRecord);
    this.saveApiKeys();

    console.log(`🔑 Generated API key for ${deviceName} (${device.ip}): ${apiKey.substring(0, 16)}...`);
    
    // Create notification history record for the new device
    try {
      await storage.createNotificationHistory({
        deviceId: dbDevice.id,
        deviceName: dbDevice.name,
        deviceModel: dbDevice.model,
        deviceType: dbDevice.type,
        deviceStatus: dbDevice.status,
        deviceLocation: dbDevice.location,
        notificationType: 'DEVICE_ADDED'
      });
      console.log(`📱 Notification history created for new device: ${deviceName}`);
    } catch (error) {
      console.error(`Failed to create notification history for ${deviceName}:`, error);
    }
    
    return apiKeyRecord;
  }

  private guessDeviceType(device: DiscoveredDevice): string {
    const vendor = device.vendor.toLowerCase();
    const hostname = device.hostname.toLowerCase();

    if (vendor.includes('apple') || hostname.includes('iphone') || hostname.includes('ipad')) {
      return 'Mobile Device';
    } else if (vendor.includes('samsung') || vendor.includes('android')) {
      return 'Mobile Device';
    } else if (vendor.includes('cisco') || vendor.includes('netgear') || vendor.includes('linksys')) {
      return 'Network Equipment';
    } else if (hostname.includes('printer') || vendor.includes('hp') || vendor.includes('canon')) {
      return 'Printer';
    } else if (hostname.includes('server') || hostname.includes('nas')) {
      return 'Server';
    } else {
      return 'Workstation';
    }
  }

  public async startScanning(intervalMinutes: number = 5): Promise<void> {
    if (this.isScanning) {
      console.log('⚠️  Network scanner already running');
      return;
    }

    console.log(`🚀 Starting network scanner - interval: ${intervalMinutes} minutes`);
    this.isScanning = true;

    // Initial scan
    await this.performScan();

    // Set up periodic scanning
    this.scanInterval = setInterval(async () => {
      await this.performScan();
    }, intervalMinutes * 60 * 1000);
  }

  public stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    console.log('⏹️  Network scanner stopped');
  }

  private async performScan(): Promise<void> {
    console.log('🔍 Starting network scan...');
    
    try {
      // Detect active network
      const activeNetwork = await this.detectActiveNetwork();
      
      // Scan the network
      const devices = await this.scanNetwork(activeNetwork);
      
      let newDevices = 0;
      let existingDevices = 0;

      for (const device of devices) {
        if (!device.mac) continue; // Skip devices without MAC addresses

        // Check if device already has API key
        const existingApiKey = this.deviceApiKeys.get(device.mac);
        
        if (existingApiKey) {
          // Update last seen
          existingApiKey.lastUsed = new Date().toISOString();
          this.deviceApiKeys.set(device.mac, existingApiKey);
          existingDevices++;
        } else {
          // New device - register with API key
          await this.registerDeviceWithApiKey(device);
          newDevices++;
        }

        // Update discovered devices cache
        this.discoveredDevices.set(device.mac, device);
      }

      console.log(`📊 Scan complete: ${newDevices} new devices, ${existingDevices} existing devices`);
      
      // Save updated API keys
      if (newDevices > 0) {
        this.saveApiKeys();
      }

    } catch (error) {
      console.error('Error during network scan:', error);
    }
  }

  public getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public getDeviceApiKeys(): DeviceApiKey[] {
    return Array.from(this.deviceApiKeys.values());
  }

  public getApiKeyForDevice(macAddress: string): DeviceApiKey | undefined {
    return this.deviceApiKeys.get(macAddress);
  }

  public isValidApiKey(apiKey: string): DeviceApiKey | undefined {
    return Array.from(this.deviceApiKeys.values()).find(key => key.apiKey === apiKey);
  }

  public setBroadcastCallback(callback: (message: any) => void): void {
    this.broadcastCallback = callback;
  }

  private broadcastDeviceNotification(message: any): void {
    if (this.broadcastCallback) {
      this.broadcastCallback(message);
    }
  }

  public getStatus(): {
    isScanning: boolean;
    totalDevices: number;
    activeApiKeys: number;
    lastScanTime: string;
  } {
    return {
      isScanning: this.isScanning,
      totalDevices: this.discoveredDevices.size,
      activeApiKeys: Array.from(this.deviceApiKeys.values()).filter(key => key.status === 'active').length,
      lastScanTime: new Date().toISOString()
    };
  }
}

export const networkScanner = new NetworkScanner();