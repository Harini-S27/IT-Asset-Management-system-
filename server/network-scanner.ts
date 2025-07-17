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
    console.log(`🔍 Comprehensive network scan: ${network}`);
    const allDevices: DiscoveredDevice[] = [];

    try {
      // Method 1: Enhanced ARP scan with ping sweep
      const arpDevices = await this.comprehensiveArpScan(network);
      console.log(`📡 ARP scan found ${arpDevices.length} devices`);
      allDevices.push(...arpDevices);

      // Method 2: Nmap network discovery
      const nmapDevices = await this.nmapNetworkScan(network);
      console.log(`🗺️ Nmap scan found ${nmapDevices.length} devices`);
      allDevices.push(...nmapDevices);

      // Method 3: Port scanning common services
      const serviceDevices = await this.serviceDiscoveryScan(network);
      console.log(`🔌 Service discovery found ${serviceDevices.length} devices`);
      allDevices.push(...serviceDevices);

      // Method 4: Historical IP tracking (for inactive devices)
      const historicalDevices = await this.historicalDeviceDiscovery(network);
      console.log(`📚 Historical tracking found ${historicalDevices.length} devices`);
      allDevices.push(...historicalDevices);

      // Method 5: Geographic coordinate-based detection
      const geoDevices = await this.geographicDeviceDiscovery();
      console.log(`🗺️ Geographic discovery found ${geoDevices.length} devices`);
      allDevices.push(...geoDevices);

      // Merge and deduplicate devices
      const uniqueDevices = this.deduplicateDevices(allDevices);
      console.log(`✅ Total unique devices discovered: ${uniqueDevices.length}`);
      
      return uniqueDevices;

    } catch (error) {
      console.error('Network scan failed:', error);
      return [];
    }
  }

  private async comprehensiveArpScan(network: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const baseIP = network.split('/')[0].split('.').slice(0, 3).join('.');
    
    try {
      // Aggressive ping sweep to populate ARP table
      console.log(`🔄 Enhanced ping sweep for ${network}`);
      const pingPromises = [];
      
      // Scan full range for comprehensive discovery
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        pingPromises.push(this.advancedPing(ip));
      }
      
      await Promise.allSettled(pingPromises);
      
      // Multiple ARP table reads for consistency
      const arpDevices1 = await this.readArpTable();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const arpDevices2 = await this.readArpTable();
      
      // Combine results
      const allArpDevices = [...arpDevices1, ...arpDevices2];
      console.log(`📋 Combined ARP table scan found ${allArpDevices.length} devices`);
      
      return this.deduplicateDevices(allArpDevices);

    } catch (error) {
      console.error('Enhanced ARP scan failed:', error);
      return [];
    }
  }

  private async nmapNetworkScan(network: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];

    try {
      // Try multiple nmap scanning techniques
      const nmapCommands = [
        `nmap -sn ${network}`,                    // Ping scan
        `nmap -sS -O ${network}`,                 // SYN scan with OS detection
        `nmap -sU -p 53,67,68,161 ${network}`,   // UDP scan for common services
        `nmap -PS80,443,22,21,23,25,53,110,143,993,995 ${network}` // TCP SYN ping
      ];

      for (const command of nmapCommands) {
        try {
          const { stdout } = await execAsync(command);
          const nmapDevices = await this.parseNmapOutput(stdout);
          devices.push(...nmapDevices);
        } catch (error) {
          console.log(`Nmap command failed: ${command}`);
        }
      }

      return this.deduplicateDevices(devices);

    } catch (error) {
      console.error('Nmap scan failed:', error);
      return [];
    }
  }

  private async serviceDiscoveryScan(network: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const baseIP = network.split('/')[0].split('.').slice(0, 3).join('.');
    
    // Common service ports to scan
    const commonPorts = [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 8080, 8443];
    
    try {
      console.log(`🔌 Scanning common services on ${network}`);
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        
        // Quick port scan for each IP
        for (const port of commonPorts) {
          try {
            const isOpen = await this.checkPort(ip, port);
            if (isOpen) {
              devices.push({
                ip: ip,
                mac: await this.getMacFromIP(ip),
                hostname: await this.getHostname(ip),
                vendor: 'Service Discovery',
                ports: [port],
                osGuess: await this.detectOSFromPort(ip, port),
                responseTime: 0,
                lastSeen: new Date().toISOString()
              });
              break; // Found a service, move to next IP
            }
          } catch (error) {
            // Continue to next port
          }
        }
      }

      return this.deduplicateDevices(devices);

    } catch (error) {
      console.error('Service discovery scan failed:', error);
      return [];
    }
  }

  private async historicalDeviceDiscovery(network: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    
    try {
      console.log(`📚 Checking historical device data for ${network}`);
      
      // Get all previously seen devices from database
      const knownDevices = await storage.getDevices();
      
      for (const device of knownDevices) {
        if (device.ipAddress && this.isInNetwork(device.ipAddress, network)) {
          // Check if device is still reachable
          const isReachable = await this.advancedPing(device.ipAddress);
          
          devices.push({
            ip: device.ipAddress,
            mac: device.macAddress || 'Unknown',
            hostname: device.name,
            vendor: device.model || 'Historical Record',
            ports: [],
            osGuess: device.model || 'Unknown',
            responseTime: 0,
            lastSeen: isReachable ? new Date().toISOString() : device.lastUpdated.toISOString()
          });
        }
      }

      return devices;

    } catch (error) {
      console.error('Historical device discovery failed:', error);
      return [];
    }
  }

  private async geographicDeviceDiscovery(): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    
    try {
      console.log(`🗺️ Geographic coordinate-based device discovery`);
      
      // Get all devices with coordinates from database
      const allDevices = await storage.getDevices();
      
      for (const device of allDevices) {
        if (device.latitude && device.longitude) {
          // Check if device is within expected geographic boundaries
          if (this.isWithinGeographicBounds(device.latitude, device.longitude)) {
            
            // Try to ping the device even if it was last seen long ago
            const isCurrentlyActive = device.ipAddress ? await this.advancedPing(device.ipAddress) : false;
            
            devices.push({
              ip: device.ipAddress || `geo-${device.id}`,
              mac: device.macAddress || 'Unknown',
              hostname: device.name,
              vendor: 'Geographic Discovery',
              ports: [],
              osGuess: device.model || 'Unknown',
              responseTime: 0,
              lastSeen: isCurrentlyActive ? new Date().toISOString() : device.lastUpdated.toISOString()
            });
          }
        }
      }

      return devices;

    } catch (error) {
      console.error('Geographic device discovery failed:', error);
      return [];
    }
  }

  private async advancedPing(ip: string): Promise<boolean> {
    try {
      // Try multiple ping methods for better detection
      const pingMethods = [
        process.platform === 'win32' ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`,
        process.platform === 'win32' ? `ping -n 3 -w 2000 ${ip}` : `ping -c 3 -W 2 ${ip}`,
        `nping -c 1 --icmp ${ip}` // If nping is available
      ];

      for (const method of pingMethods) {
        try {
          await execAsync(method);
          return true;
        } catch (error) {
          continue;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkPort(ip: string, port: number): Promise<boolean> {
    try {
      const command = `timeout 2 bash -c "</dev/tcp/${ip}/${port}"`;
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getMacFromIP(ip: string): Promise<string> {
    try {
      const command = process.platform === 'win32' ? `arp -a ${ip}` : `arp -n ${ip}`;
      const { stdout } = await execAsync(command);
      
      const macMatch = stdout.match(/([a-fA-F0-9:]{17}|[a-fA-F0-9-]{17})/);
      return macMatch ? macMatch[1].replace(/-/g, ':').toLowerCase() : 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  private async detectOSFromPort(ip: string, port: number): Promise<string> {
    const osGuesses: { [key: number]: string } = {
      22: 'Linux/Unix',
      23: 'Network Device',
      25: 'Mail Server',
      53: 'DNS Server',
      80: 'Web Server',
      110: 'Mail Server',
      143: 'Mail Server',
      443: 'Web Server',
      993: 'Mail Server',
      995: 'Mail Server',
      8080: 'Web Server',
      8443: 'Web Server'
    };
    
    return osGuesses[port] || 'Unknown';
  }

  private async parseNmapOutput(output: string): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const lines = output.split('\n');
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

  private deduplicateDevices(devices: DiscoveredDevice[]): DiscoveredDevice[] {
    const uniqueDevices = new Map<string, DiscoveredDevice>();
    
    for (const device of devices) {
      const key = device.ip || device.mac || device.hostname;
      if (key && key !== 'Unknown') {
        // Keep the most recent or most detailed device info
        const existing = uniqueDevices.get(key);
        if (!existing || device.lastSeen > existing.lastSeen || device.ports.length > existing.ports.length) {
          uniqueDevices.set(key, device);
        }
      }
    }
    
    return Array.from(uniqueDevices.values());
  }

  private isInNetwork(ip: string, network: string): boolean {
    const [networkIP, cidr] = network.split('/');
    const networkParts = networkIP.split('.').map(Number);
    const ipParts = ip.split('.').map(Number);
    const cidrNum = parseInt(cidr);
    
    // Simple subnet check for /24 networks
    if (cidrNum === 24) {
      return networkParts[0] === ipParts[0] && 
             networkParts[1] === ipParts[1] && 
             networkParts[2] === ipParts[2];
    }
    
    return false;
  }

  private isWithinGeographicBounds(latitude: string, longitude: string): boolean {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    // Check if coordinates are within Chennai area bounds
    const chennaiBounds = {
      north: 13.2,
      south: 12.8,
      east: 80.3,
      west: 80.1
    };
    
    // Also check if coordinates are within reasonable office bounds
    const officeBounds = {
      north: 37.85,
      south: 37.70,
      east: -122.35,
      west: -122.50
    };
    
    const inChennai = lat >= chennaiBounds.south && lat <= chennaiBounds.north &&
                      lon >= chennaiBounds.west && lon <= chennaiBounds.east;
    
    const inOffice = lat >= officeBounds.south && lat <= officeBounds.north &&
                     lon >= officeBounds.west && lon <= officeBounds.east;
    
    return inChennai || inOffice;
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

    // Create pending device for approval
    const pendingDevice = await storage.createPendingDevice({
      name: deviceName,
      type: this.guessDeviceType(device),
      model: `${device.vendor} Device`,
      status: 'Active',
      location: 'Auto-Discovered',
      ipAddress: device.ip,
      macAddress: device.mac,
      latitude: '37.7749',  // Default to San Francisco
      longitude: '-122.4194',
      discoveryMethod: 'auto-discovery',
      discoveryData: JSON.stringify({
        vendor: device.vendor,
        hostname: device.hostname,
        ports: device.ports,
        osGuess: device.osGuess,
        responseTime: device.responseTime,
        lastSeen: device.lastSeen
      })
    });

    // Broadcast device added notification for approval popup
    this.broadcastDeviceNotification({
      type: 'DEVICE_ADDED',
      data: {
        id: pendingDevice.id,
        name: pendingDevice.name,
        model: pendingDevice.model,
        type: pendingDevice.type,
        status: pendingDevice.status,
        location: pendingDevice.location,
        ipAddress: pendingDevice.ipAddress,
        latitude: pendingDevice.latitude,
        longitude: pendingDevice.longitude,
        lastUpdated: pendingDevice.createdAt
      },
      timestamp: new Date().toISOString(),
      isNewDevice: true,
      isPending: true
    });

    // Create API key record (will be activated upon approval)
    const apiKeyRecord: DeviceApiKey = {
      deviceId: pendingDevice.id,
      apiKey,
      deviceName,
      ipAddress: device.ip,
      macAddress: device.mac,
      createdAt: new Date().toISOString(),
      status: 'pending' // Mark as pending until approved
    };

    this.deviceApiKeys.set(device.mac, apiKeyRecord);
    this.saveApiKeys();

    console.log(`🔑 Generated API key for pending device ${deviceName} (${device.ip}): ${apiKey.substring(0, 16)}...`);
    
    // Create notification history record for the pending device
    try {
      await storage.createNotificationHistory({
        deviceId: pendingDevice.id,
        deviceName: pendingDevice.name,
        deviceModel: pendingDevice.model,
        deviceType: pendingDevice.type,
        deviceStatus: pendingDevice.status,
        deviceLocation: pendingDevice.location,
        notificationType: 'DEVICE_ADDED'
      });
      console.log(`📱 Notification history created for pending device: ${deviceName}`);
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