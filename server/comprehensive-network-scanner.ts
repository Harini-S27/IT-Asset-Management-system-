import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from './storage';
import { Device } from '@shared/schema';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  ports: number[];
  osGuess: string;
  responseTime: number;
  lastSeen: string;
  isActive: boolean;
  deviceType: string;
  location: string;
  coordinates: { latitude: string; longitude: string };
}

export class ComprehensiveNetworkScanner {
  private scanInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private discoveredDevices: Map<string, NetworkDevice> = new Map();
  private networkRanges: string[] = [
    '192.168.1.0/24',
    '192.168.0.0/24',
    '10.0.0.0/24',
    '172.16.0.0/24'
  ];

  constructor() {
    this.initializeDeviceDatabase();
  }

  private async initializeDeviceDatabase() {
    // Create some realistic network devices for comprehensive testing
    const simulatedDevices = [
      {
        ip: '192.168.1.1',
        mac: '00:1A:A0:12:34:56',
        hostname: 'Router-Gateway',
        vendor: 'Cisco Systems',
        ports: [80, 443, 22, 23],
        osGuess: 'IOS',
        deviceType: 'Network Equipment',
        location: 'Network Closet',
        coordinates: { latitude: '13.0827', longitude: '80.2707' }
      },
      {
        ip: '192.168.1.2',
        mac: '00:50:56:AB:CD:EF',
        hostname: 'FileServer-01',
        vendor: 'Dell Inc.',
        ports: [22, 80, 443, 445, 139],
        osGuess: 'Ubuntu Server',
        deviceType: 'Server',
        location: 'Data Center',
        coordinates: { latitude: '13.0828', longitude: '80.2708' }
      },
      {
        ip: '192.168.1.10',
        mac: '00:E0:4C:68:91:23',
        hostname: 'Workstation-Dev01',
        vendor: 'Intel Corporation',
        ports: [22, 3389, 5900],
        osGuess: 'Windows 11',
        deviceType: 'Workstation',
        location: 'Development Floor',
        coordinates: { latitude: '13.0829', longitude: '80.2709' }
      },
      {
        ip: '192.168.1.15',
        mac: '28:CD:C1:45:67:89',
        hostname: 'MacBook-Designer',
        vendor: 'Apple Inc.',
        ports: [22, 5900, 7000],
        osGuess: 'macOS',
        deviceType: 'Laptop',
        location: 'Design Studio',
        coordinates: { latitude: '13.0830', longitude: '80.2710' }
      },
      {
        ip: '192.168.1.20',
        mac: '00:1B:21:33:44:55',
        hostname: 'Printer-HP-LaserJet',
        vendor: 'Hewlett-Packard',
        ports: [9100, 80, 443, 515],
        osGuess: 'Embedded Linux',
        deviceType: 'Printer',
        location: 'Office Floor 1',
        coordinates: { latitude: '13.0831', longitude: '80.2711' }
      },
      {
        ip: '192.168.1.25',
        mac: '00:26:BB:77:88:99',
        hostname: 'iPhone-CEO',
        vendor: 'Apple Inc.',
        ports: [62078],
        osGuess: 'iOS',
        deviceType: 'Mobile Device',
        location: 'Executive Office',
        coordinates: { latitude: '13.0832', longitude: '80.2712' }
      },
      {
        ip: '192.168.1.30',
        mac: '00:21:CC:AA:BB:CC',
        hostname: 'Security-Camera-01',
        vendor: 'Hikvision',
        ports: [80, 8000, 554],
        osGuess: 'Embedded Linux',
        deviceType: 'Security Camera',
        location: 'Entrance',
        coordinates: { latitude: '13.0833', longitude: '80.2713' }
      },
      {
        ip: '192.168.1.35',
        mac: '00:24:D7:DD:EE:FF',
        hostname: 'AccessPoint-WiFi',
        vendor: 'Ubiquiti Networks',
        ports: [22, 80, 443, 8080],
        osGuess: 'OpenWrt',
        deviceType: 'Access Point',
        location: 'Ceiling Mount',
        coordinates: { latitude: '13.0834', longitude: '80.2714' }
      }
    ];

    // Initialize simulated devices
    for (const device of simulatedDevices) {
      this.discoveredDevices.set(device.ip, {
        ...device,
        responseTime: Math.random() * 100,
        lastSeen: new Date().toISOString(),
        isActive: Math.random() > 0.2 // 80% devices are active
      });
    }
  }

  public async startComprehensiveScanning(intervalMinutes: number = 5) {
    if (this.isScanning) {
      console.log('🔍 Comprehensive scanner already running');
      return;
    }

    this.isScanning = true;
    console.log(`🚀 Starting comprehensive network discovery - interval: ${intervalMinutes} minutes`);

    // Initial scan
    await this.performComprehensiveScan();

    // Set up periodic scanning
    this.scanInterval = setInterval(async () => {
      await this.performComprehensiveScan();
    }, intervalMinutes * 60 * 1000);
  }

  public stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
    console.log('🛑 Comprehensive network scanner stopped');
  }

  private async performComprehensiveScan() {
    console.log('🔍 Starting comprehensive network scan...');
    
    try {
      // Method 1: Active Network Scanning
      const activeDevices = await this.activeNetworkScan();
      console.log(`📡 Active scan found ${activeDevices.length} devices`);

      // Method 2: Passive Network Monitoring
      const passiveDevices = await this.passiveNetworkMonitoring();
      console.log(`👁️ Passive monitoring found ${passiveDevices.length} devices`);

      // Method 3: Historical Device Tracking
      const historicalDevices = await this.historicalDeviceTracking();
      console.log(`📚 Historical tracking found ${historicalDevices.length} devices`);

      // Method 4: Geographic Coordinate Detection
      const geoDevices = await this.geographicDeviceDetection();
      console.log(`🗺️ Geographic detection found ${geoDevices.length} devices`);

      // Method 5: Service Discovery
      const serviceDevices = await this.serviceDiscovery();
      console.log(`🔌 Service discovery found ${serviceDevices.length} devices`);

      // Combine all discovery methods
      const allDevices = [
        ...activeDevices,
        ...passiveDevices,
        ...historicalDevices,
        ...geoDevices,
        ...serviceDevices
      ];

      // Deduplicate and process devices
      const uniqueDevices = this.deduplicateDevices(allDevices);
      console.log(`✅ Total unique devices discovered: ${uniqueDevices.length}`);

      // Update device database
      await this.updateDeviceDatabase(uniqueDevices);

      // Store discovered devices
      for (const device of uniqueDevices) {
        this.discoveredDevices.set(device.ip, device);
      }

      console.log(`📊 Comprehensive scan completed - ${uniqueDevices.length} devices in network`);

    } catch (error) {
      console.error('❌ Comprehensive scan failed:', error);
    }
  }

  private async updateDeviceDatabase(devices: NetworkDevice[]): Promise<void> {
    console.log(`🎯 ENTERING updateDeviceDatabase with ${devices.length} devices`);
    console.log(`💾 Saving ${devices.length} discovered devices to database...`);
    console.log(`🔍 Device list:`, devices.map(d => `${d.hostname}(${d.ip})`));
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      console.log(`📝 Processing device ${i + 1}/${devices.length}: ${device.hostname} (${device.ip})`);
      try {
        await this.saveDiscoveredDeviceToDatabase(device);
        console.log(`✅ Successfully processed device ${i + 1}/${devices.length}`);
      } catch (error) {
        console.error(`❌ Failed to process device ${i + 1}/${devices.length}:`, error);
      }
    }
    
    console.log('✅ Device database update completed');
  }

  public async saveDiscoveredDevicesToDatabase(): Promise<void> {
    console.log('🔄 Manually saving all discovered devices to database...');
    const devices = Array.from(this.discoveredDevices.values());
    console.log(`📊 Found ${devices.length} devices in discoveredDevices map`);
    
    if (devices.length === 0) {
      console.log('⚠️ No devices found in discoveredDevices map');
      return;
    }
    
    console.log(`🚀 About to call updateDeviceDatabase with ${devices.length} devices`);
    console.log(`🔍 Device sample:`, devices.slice(0, 2).map(d => `${d.hostname}(${d.ip})`));
    try {
      await this.updateDeviceDatabase(devices);
      console.log(`🎉 Successfully completed updateDeviceDatabase for ${devices.length} devices`);
    } catch (error) {
      console.error('❌ Error in updateDeviceDatabase:', error);
      throw error;
    }
  }

  private async activeNetworkScan(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];

    for (const network of this.networkRanges) {
      try {
        // Use nmap for comprehensive active scanning
        const nmapCommand = `nmap -sn -T4 --min-parallelism 50 ${network}`;
        const { stdout } = await execAsync(nmapCommand);
        
        const nmapDevices = this.parseNmapOutput(stdout);
        devices.push(...nmapDevices);

        // Use arp-scan for layer 2 discovery
        const arpCommand = `arp-scan -l -t 500 ${network}`;
        try {
          const { stdout: arpOutput } = await execAsync(arpCommand);
          const arpDevices = this.parseArpScanOutput(arpOutput);
          devices.push(...arpDevices);
        } catch (arpError) {
          console.log(`ARP scan failed for ${network}: ${arpError}`);
        }

      } catch (error) {
        console.log(`Active scan failed for ${network}: ${error}`);
      }
    }

    return devices;
  }

  private async passiveNetworkMonitoring(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];

    try {
      // Monitor ARP table for recently seen devices
      const arpCommand = process.platform === 'win32' ? 'arp -a' : 'arp -a';
      const { stdout } = await execAsync(arpCommand);
      
      const arpDevices = this.parseSystemArpTable(stdout);
      devices.push(...arpDevices);

      // Monitor DHCP logs (if available)
      const dhcpDevices = await this.monitorDHCPLogs();
      devices.push(...dhcpDevices);

    } catch (error) {
      console.log('Passive monitoring failed:', error);
    }

    return devices;
  }

  private async historicalDeviceTracking(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];

    try {
      // Get all devices from database
      const knownDevices = await storage.getDevices();
      
      for (const device of knownDevices) {
        if (device.ipAddress) {
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
            lastSeen: isReachable ? new Date().toISOString() : device.lastUpdated.toISOString(),
            isActive: isReachable,
            deviceType: device.type,
            location: device.location || 'Unknown',
            coordinates: {
              latitude: device.latitude || '13.0827',
              longitude: device.longitude || '80.2707'
            }
          });
        }
      }

    } catch (error) {
      console.log('Historical tracking failed:', error);
    }

    return devices;
  }

  private async geographicDeviceDetection(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];

    try {
      // Find devices based on coordinate patterns
      const allDevices = await storage.getDevices();
      
      for (const device of allDevices) {
        if (device.latitude && device.longitude) {
          const lat = parseFloat(device.latitude);
          const lon = parseFloat(device.longitude);
          
          // Check if device is within expected geographic boundaries
          if (this.isWithinGeographicBounds(lat, lon)) {
            const isCurrentlyActive = device.ipAddress ? 
              await this.advancedPing(device.ipAddress) : false;
            
            devices.push({
              ip: device.ipAddress || `geo-${device.id}`,
              mac: device.macAddress || 'Unknown',
              hostname: device.name,
              vendor: 'Geographic Discovery',
              ports: [],
              osGuess: device.model || 'Unknown',
              responseTime: 0,
              lastSeen: isCurrentlyActive ? new Date().toISOString() : device.lastUpdated.toISOString(),
              isActive: isCurrentlyActive,
              deviceType: device.type,
              location: device.location || 'Unknown',
              coordinates: {
                latitude: device.latitude,
                longitude: device.longitude
              }
            });
          }
        }
      }

    } catch (error) {
      console.log('Geographic detection failed:', error);
    }

    return devices;
  }

  private async serviceDiscovery(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];
    const commonServices = [
      { port: 22, service: 'SSH' },
      { port: 23, service: 'Telnet' },
      { port: 80, service: 'HTTP' },
      { port: 443, service: 'HTTPS' },
      { port: 21, service: 'FTP' },
      { port: 25, service: 'SMTP' },
      { port: 53, service: 'DNS' },
      { port: 110, service: 'POP3' },
      { port: 143, service: 'IMAP' },
      { port: 993, service: 'IMAPS' },
      { port: 995, service: 'POP3S' },
      { port: 3389, service: 'RDP' },
      { port: 5900, service: 'VNC' },
      { port: 8080, service: 'HTTP-Alt' }
    ];

    for (const network of this.networkRanges) {
      const baseIP = network.split('/')[0].split('.').slice(0, 3).join('.');
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        
        // Quick port scan for common services
        for (const { port, service } of commonServices) {
          try {
            const isOpen = await this.checkPortWithTimeout(ip, port, 500);
            if (isOpen) {
              devices.push({
                ip: ip,
                mac: await this.getMacFromIP(ip),
                hostname: await this.getHostnameWithTimeout(ip),
                vendor: 'Service Discovery',
                ports: [port],
                osGuess: this.guessOSFromPort(port),
                responseTime: 0,
                lastSeen: new Date().toISOString(),
                isActive: true,
                deviceType: this.guessDeviceTypeFromPort(port),
                location: 'Auto-Discovered',
                coordinates: storage.assignRealisticCoordinates(
                  this.guessDeviceTypeFromPort(port),
                  'Auto-Discovered',
                  ip
                )
              });
              break; // Found a service, move to next IP
            }
          } catch (error) {
            // Continue to next port
          }
        }
      }
    }

    return devices;
  }

  private parseNmapOutput(output: string): NetworkDevice[] {
    const devices: NetworkDevice[] = [];
    const lines = output.split('\n');
    let currentDevice: Partial<NetworkDevice> = {};

    for (const line of lines) {
      if (line.includes('Nmap scan report')) {
        if (currentDevice.ip) {
          devices.push(currentDevice as NetworkDevice);
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
          lastSeen: new Date().toISOString(),
          isActive: true,
          deviceType: 'Unknown',
          location: 'Auto-Discovered',
          coordinates: { latitude: '13.0827', longitude: '80.2707' }
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
      devices.push(currentDevice as NetworkDevice);
    }

    return devices;
  }

  private parseArpScanOutput(output: string): NetworkDevice[] {
    const devices: NetworkDevice[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9:]{17})\s+(.+)/);
      if (match) {
        devices.push({
          ip: match[1],
          mac: match[2],
          hostname: 'Unknown',
          vendor: match[3].trim(),
          ports: [],
          osGuess: 'Unknown',
          responseTime: 0,
          lastSeen: new Date().toISOString(),
          isActive: true,
          deviceType: 'Unknown',
          location: 'Auto-Discovered',
          coordinates: storage.assignRealisticCoordinates('Unknown', 'Auto-Discovered', match[1])
        });
      }
    }
    
    return devices;
  }

  private parseSystemArpTable(output: string): NetworkDevice[] {
    const devices: NetworkDevice[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      let match;
      
      if (process.platform === 'win32') {
        match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9-]{17})\s+dynamic/i);
        if (match) {
          const mac = match[2].replace(/-/g, ':').toLowerCase();
          devices.push(this.createNetworkDevice(match[1], mac));
        }
      } else {
        match = line.match(/(\S+)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([a-fA-F0-9:]{17})/);
        if (match) {
          devices.push(this.createNetworkDevice(match[2], match[3].toLowerCase()));
        }
      }
    }

    return devices;
  }

  private async saveDiscoveredDeviceToDatabase(device: NetworkDevice): Promise<void> {
    console.log(`🎯 ENTERING saveDiscoveredDeviceToDatabase for: ${device.hostname} (${device.ip})`);
    try {
      console.log(`🔍 Processing network device: ${device.hostname} (${device.ip}) with MAC: ${device.mac}`);
      
      // Generate MAC address if not present to ensure uniqueness
      const macAddress = device.mac || this.generateUniqueMac(device.ip);
      console.log(`🔧 Using MAC address: ${macAddress}`);
      
      // Check if device already exists in networkDevices table by MAC address
      const existingNetworkDevice = await storage.getNetworkDeviceByMac(macAddress);
      
      if (!existingNetworkDevice) {
        // Create new network device entry
        const newNetworkDevice = {
          macAddress: macAddress,
          deviceName: device.hostname !== 'Unknown' ? device.hostname : device.ip,
          currentIp: device.ip,
          vendor: device.vendor || 'Unknown Vendor',
          deviceType: device.deviceType,
          behaviorTag: this.analyzeBehavior(device),
          status: device.isActive ? 'Active' : 'Inactive'
        };
        
        console.log(`📝 Creating network device with data:`, newNetworkDevice);
        await storage.createNetworkDevice(newNetworkDevice);
        console.log(`✅ Added network device to database: ${device.hostname} (${device.ip})`);
      } else {
        // Update existing network device
        console.log(`📝 Updating existing network device: ${existingNetworkDevice.id}`);
        await storage.updateNetworkDevice(existingNetworkDevice.id, {
          currentIp: device.ip,
          deviceName: device.hostname !== 'Unknown' ? device.hostname : device.ip,
          vendor: device.vendor || existingNetworkDevice.vendor,
          deviceType: device.deviceType || existingNetworkDevice.deviceType,
          status: device.isActive ? 'Active' : 'Inactive',
          behaviorTag: this.analyzeBehavior(device)
        });
        console.log(`🔄 Updated network device: ${device.hostname} (${device.ip})`);
      }
    } catch (error) {
      console.error(`❌ Failed to save network device to database: ${device.hostname} (${device.ip})`, error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  }

  private analyzeBehavior(device: NetworkDevice): string {
    // Analyze device behavior based on ports, hostname, vendor
    if (device.hostname.toLowerCase().includes('admin')) return 'Admin Device';
    if (device.hostname.toLowerCase().includes('server')) return 'Server Device';
    if (device.hostname.toLowerCase().includes('printer')) return 'Network Printer';
    if (device.hostname.toLowerCase().includes('camera')) return 'Security Camera';
    if (device.vendor.toLowerCase().includes('apple')) return 'iOS Device';
    if (device.vendor.toLowerCase().includes('samsung')) return 'Android Device';
    if (device.ports.some(p => p === 22)) return 'SSH Server';
    if (device.ports.some(p => p === 80 || p === 443)) return 'Web Server';
    if (device.ports.some(p => p === 3389)) return 'RDP Server';
    return 'Network Device';
  }

  private generateUniqueMac(ip: string): string {
    // Generate a unique MAC address based on IP address
    const ipParts = ip.split('.').map(part => parseInt(part));
    const timestamp = Date.now() % 1000; // Last 3 digits of timestamp for uniqueness
    
    // Use a private range MAC prefix (02:xx:xx:xx:xx:xx)
    const mac = [
      '02',
      ipParts[0].toString(16).padStart(2, '0'),
      ipParts[1].toString(16).padStart(2, '0'),
      ipParts[2].toString(16).padStart(2, '0'),
      ipParts[3].toString(16).padStart(2, '0'),
      timestamp.toString(16).padStart(2, '0').slice(-2)
    ].join(':');
    
    return mac;
  }

  private createNetworkDevice(ip: string, mac: string): NetworkDevice {
    return {
      ip,
      mac,
      hostname: 'Unknown',
      vendor: this.guessVendorFromMac(mac),
      ports: [],
      osGuess: 'Unknown',
      responseTime: 0,
      lastSeen: new Date().toISOString(),
      isActive: true,
      deviceType: 'Unknown',
      location: 'Auto-Discovered',
      coordinates: storage.assignRealisticCoordinates('Unknown', 'Auto-Discovered', ip)
    };
  }

  private async monitorDHCPLogs(): Promise<NetworkDevice[]> {
    // This would typically read DHCP server logs
    // For now, return empty array as DHCP logs are not accessible
    return [];
  }

  private async advancedPing(ip: string): Promise<boolean> {
    try {
      const command = process.platform === 'win32' ? 
        `ping -n 1 -w 1000 ${ip}` : 
        `ping -c 1 -W 1 ${ip}`;
      
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkPortWithTimeout(ip: string, port: number, timeout: number): Promise<boolean> {
    try {
      const command = `timeout ${timeout/1000} bash -c "</dev/tcp/${ip}/${port}"`;
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

  private async getHostnameWithTimeout(ip: string): Promise<string> {
    try {
      const command = `timeout 2 nslookup ${ip}`;
      const { stdout } = await execAsync(command);
      
      const hostnameMatch = stdout.match(/name = (.+)/);
      return hostnameMatch ? hostnameMatch[1].trim() : 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
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

  private guessOSFromPort(port: number): string {
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
      3389: 'Windows',
      5900: 'VNC Server',
      8080: 'Web Server'
    };
    
    return osGuesses[port] || 'Unknown';
  }

  private guessDeviceTypeFromPort(port: number): string {
    const typeGuesses: { [key: number]: string } = {
      22: 'Server',
      23: 'Network Equipment',
      25: 'Server',
      53: 'Server',
      80: 'Server',
      110: 'Server',
      143: 'Server',
      443: 'Server',
      993: 'Server',
      995: 'Server',
      3389: 'Workstation',
      5900: 'Workstation',
      8080: 'Server'
    };
    
    return typeGuesses[port] || 'Unknown';
  }

  private isWithinGeographicBounds(lat: number, lon: number): boolean {
    // Chennai area bounds
    const chennaiBounds = {
      north: 13.2,
      south: 12.8,
      east: 80.3,
      west: 80.1
    };
    
    // Office area bounds
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

  private deduplicateDevices(devices: NetworkDevice[]): NetworkDevice[] {
    const uniqueDevices = new Map<string, NetworkDevice>();
    
    for (const device of devices) {
      const key = device.ip || device.mac || device.hostname;
      if (key && key !== 'Unknown') {
        const existing = uniqueDevices.get(key);
        if (!existing || device.lastSeen > existing.lastSeen || device.ports.length > existing.ports.length) {
          uniqueDevices.set(key, device);
        }
      }
    }
    
    return Array.from(uniqueDevices.values());
  }



  public getDiscoveredDevices(): NetworkDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public getStatus() {
    return {
      isScanning: this.isScanning,
      totalDevices: this.discoveredDevices.size,
      activeDevices: Array.from(this.discoveredDevices.values()).filter(d => d.isActive).length,
      networkRanges: this.networkRanges,
      lastScan: this.discoveredDevices.size > 0 ? 
        Math.max(...Array.from(this.discoveredDevices.values()).map(d => new Date(d.lastSeen).getTime())) : 0
    };
  }
}