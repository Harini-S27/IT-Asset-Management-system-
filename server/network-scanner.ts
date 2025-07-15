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
      // Use nmap for network discovery
      const nmapCommand = `nmap -sn ${network} | grep -E "(Nmap scan report|MAC Address)"`;
      const { stdout } = await execAsync(nmapCommand);
      
      const lines = stdout.split('\n');
      let currentDevice: Partial<DiscoveredDevice> = {};

      for (const line of lines) {
        if (line.includes('Nmap scan report')) {
          // Save previous device if exists
          if (currentDevice.ip) {
            devices.push(currentDevice as DiscoveredDevice);
          }
          
          // Extract IP and hostname
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
          // Extract MAC address and vendor
          const macMatch = line.match(/MAC Address: ([A-Fa-f0-9:]{17})/);
          const vendorMatch = line.match(/\((.+)\)/);
          
          if (macMatch) {
            currentDevice.mac = macMatch[1];
            currentDevice.vendor = vendorMatch ? vendorMatch[1] : 'Unknown';
          }
        }
      }

      // Add last device
      if (currentDevice.ip) {
        devices.push(currentDevice as DiscoveredDevice);
      }

    } catch (error) {
      console.error(`Error scanning network ${network}:`, error);
      // Fallback to ping scan for basic discovery
      return this.fallbackPingScan(network);
    }

    return devices;
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

    // Create device in database
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