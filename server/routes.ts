import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { routerManager } from "./router-manager";
import { emailService } from "./email-service";
import { networkScanner } from "./network-scanner";
import { ComprehensiveNetworkScanner } from "./comprehensive-network-scanner";
import { 
  insertDeviceSchema, 
  insertProhibitedSoftwareSchema,
  insertSoftwareDetectionLogSchema,
  insertSoftwareScanResultsSchema,
  insertTicketSchema,
  insertCmdbConfigurationItemSchema,
  insertCmdbChangeRecordSchema,
  insertCmdbRelationshipSchema,
  insertCmdbComplianceRuleSchema,
  insertAlertSchema,
  insertAssetLifecycleSchema,
  insertUserManagementSchema
} from "@shared/schema";
import { AlertScheduler, setBroadcastFunction } from "./alert-scheduler";
import { z } from "zod";

// WebSocket connection management
const connectedClients = new Set<WebSocket>();

// Initialize comprehensive network scanner
const comprehensiveScanner = new ComprehensiveNetworkScanner();

function broadcastToClients(message: any) {
  const messageString = JSON.stringify(message);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', async (ws) => {
    console.log('Client connected to WebSocket');
    connectedClients.add(ws);
    
    // Send pending devices as notifications to new clients
    try {
      const pendingDevices = await storage.getPendingDevices();
      const activePendingDevices = pendingDevices.filter(device => !device.isApproved && !device.isRejected);
      
      console.log(`📱 Sending ${activePendingDevices.length} pending devices as notifications to new client`);
      
      for (const pendingDevice of activePendingDevices) {
        const deviceData = {
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
        };
        
        const notification = {
          type: 'DEVICE_ADDED',
          data: deviceData,
          timestamp: new Date().toISOString(),
          isNewDevice: true,
          isPending: true
        };
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
          console.log(`📱 Sent notification for pending device: ${pendingDevice.name}`);
        }
      }
    } catch (error) {
      console.error('Error sending pending devices to new client:', error);
    }
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Set up network scanner broadcast callback
  networkScanner.setBroadcastCallback(broadcastToClients);
  // Get all devices
  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Get a specific device
  app.get("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  // Create a new device
  app.post("/api/devices", async (req: Request, res: Response) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      
      // Broadcast real-time notification to all connected clients
      broadcastToClients({
        type: 'DEVICE_ADDED',
        data: device,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  // Update a device
  app.patch("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const updateData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(id, updateData);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  // Delete a device
  app.delete("/api/devices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const success = await storage.deleteDevice(id);
      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Router Configuration API endpoints - Pure TypeScript
  app.get("/api/router/config", async (req: Request, res: Response) => {
    try {
      const config = routerManager.loadConfig();
      // Remove sensitive data
      if (config.ssh_password) {
        config.ssh_password = '***';
      }
      res.json(config);
    } catch (error) {
      console.error('Router config fetch error:', error);
      res.status(500).json({ message: "Failed to fetch router configuration" });
    }
  });

  app.post("/api/router/config", async (req: Request, res: Response) => {
    try {
      const { router_ip, ssh_username, ssh_password, mode, router_type } = req.body;

      if (!router_ip || !ssh_username) {
        return res.status(400).json({ message: "Router IP and SSH username are required" });
      }

      const success = routerManager.saveConfig({
        router_ip,
        ssh_username,
        ssh_password: ssh_password || '',
        mode: mode || 'simulated',
        router_type: router_type || 'generic'
      });

      if (success) {
        res.json({ message: "Router configuration saved successfully" });
      } else {
        res.status(500).json({ message: "Failed to save router configuration" });
      }
    } catch (error) {
      console.error('Router config save error:', error);
      res.status(500).json({ message: "Failed to save router configuration" });
    }
  });

  app.post("/api/router/test-connection", async (req: Request, res: Response) => {
    try {
      const { router_ip, ssh_username, ssh_password } = req.body;

      if (!router_ip || !ssh_username || !ssh_password) {
        return res.status(400).json({ message: "Router IP, SSH username, and password are required" });
      }

      const response = await routerManager.testConnection(router_ip, ssh_username, ssh_password);
      res.json(response);
    } catch (error) {
      console.error('Router test connection error:', error);
      res.status(500).json({ message: "Failed to test router connection" });
    }
  });

  app.get("/api/router/status", async (req: Request, res: Response) => {
    try {
      const status = routerManager.getFirewallStatus();
      res.json(status);
    } catch (error) {
      console.error('Router status error:', error);
      res.status(500).json({ message: "Failed to check router status" });
    }
  });

  app.delete("/api/router/config", async (req: Request, res: Response) => {
    try {
      const configPath = path.join(process.cwd(), 'router_config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      res.json({ message: "Router configuration reset successfully" });
    } catch (error) {
      console.error('Router config reset error:', error);
      res.status(500).json({ message: "Failed to reset router configuration" });
    }
  });

  // Device Management API endpoints - Simplified without Python dependencies
  app.post("/api/device-management/block", async (req: Request, res: Response) => {
    try {
      const { deviceId, deviceIp, domain, reason, performedBy } = req.body;

      if (!deviceId || !deviceIp || !domain) {
        return res.status(400).json({ message: "Device ID, IP, and domain are required" });
      }

      // Use router manager for firewall rules
      const result = routerManager.addFirewallRule(deviceIp, domain, `block_${domain.replace('.', '_')}_device${deviceId}`);
      
      if (result.success) {
        // Store the website block in database
        const websiteBlock = await storage.createWebsiteBlock({
          deviceId: parseInt(deviceId),
          targetDomain: domain,
          blockType: 'domain',
          reason: reason || 'Admin blocked',
          createdBy: performedBy || 'system',
          status: 'active',
          firewallRule: result.rule_id
        });

        res.json({
          success: true,
          message: `Domain ${domain} blocked for device ${deviceId}`,
          block: websiteBlock,
          firewall_rule: result.rule_id
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Device block error:', error);
      res.status(500).json({ message: "Failed to block device" });
    }
  });

  // Global Website Blocking APIs - Pure TypeScript JSON-based implementation
  app.get("/api/global-blocks", async (req: Request, res: Response) => {
    try {
      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      
      if (fs.existsSync(configPath)) {
        const blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json(blockedDomains);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Error reading global blocks:', error);
      res.json([]);
    }
  });

  app.post("/api/global-blocks", async (req: Request, res: Response) => {
    try {
      const { domain, reason, created_by } = req.body;

      if (!domain || !reason) {
        return res.status(400).json({ message: "Domain and reason are required" });
      }

      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      let blockedDomains = [];

      if (fs.existsSync(configPath)) {
        blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      // Check if domain already exists
      const existingDomain = blockedDomains.find((item: any) => item.domain === domain);
      if (existingDomain) {
        return res.status(400).json({ message: "Domain is already blocked" });
      }

      const newBlock = {
        domain,
        reason,
        created_by: created_by || 'admin',
        created_at: new Date().toISOString(),
        status: 'active'
      };

      blockedDomains.push(newBlock);
      fs.writeFileSync(configPath, JSON.stringify(blockedDomains, null, 2));

      res.json({
        success: true,
        message: `Domain ${domain} added to global block list`,
        block: newBlock
      });
    } catch (error) {
      console.error('Error adding global block:', error);
      res.status(500).json({ message: "Failed to add global block" });
    }
  });

  // Test endpoint to simulate new device detection (Agent-Reported)
  app.post("/api/test-new-device", async (req: Request, res: Response) => {
    try {
      // Generate a random device name for testing
      const deviceNames = [
        "TestDevice-001",
        "NewLaptop-Marketing",
        "SecureWorkstation-HR",
        "TechDevice-IT",
        "MobileDevice-Sales",
        "TestMachine-QA"
      ];
      
      const randomName = deviceNames[Math.floor(Math.random() * deviceNames.length)] + "-" + Date.now();
      
      // Create a new test device
      const device = await storage.createDevice({
        name: randomName,
        type: "Workstation",
        model: "Test Device - Windows 11",
        status: "Active",
        location: "Other",
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        latitude: "37.7749",
        longitude: "-122.4194"
      });
      
      // Broadcast new device notification to trigger popup
      broadcastToClients({
        type: 'DEVICE_ADDED',
        data: device,
        timestamp: new Date().toISOString(),
        isNewDevice: true
      });

      // Create notification history record
      try {
        await storage.createNotificationHistory({
          deviceId: device.id,
          deviceName: device.name,
          deviceModel: device.model,
          deviceType: device.type,
          deviceStatus: device.status,
          deviceLocation: device.location || 'Unknown',
          notificationType: 'DEVICE_ADDED'
        });
      } catch (error) {
        console.error(`Failed to create notification history for test device ${randomName}:`, error);
      }

      res.json({
        success: true,
        message: `Test device ${randomName} created successfully`,
        device: device
      });

    } catch (error) {
      console.error('Test device creation error:', error);
      res.status(500).json({ message: "Failed to create test device" });
    }
  });

  // Test endpoint to simulate auto-discovered device
  app.post("/api/test-auto-discovered-device", async (req: Request, res: Response) => {
    try {
      // Generate a random auto-discovered device
      const autoDeviceNames = [
        "192.168.1.101",
        "192.168.1.102", 
        "192.168.1.103",
        "192.168.1.104",
        "192.168.1.105"
      ];
      
      const randomIP = autoDeviceNames[Math.floor(Math.random() * autoDeviceNames.length)];
      const deviceName = `Device-${randomIP.split('.').pop()}`;
      
      // Create a new pending device for approval
      const pendingDevice = await storage.createPendingDevice({
        name: deviceName,
        type: "Workstation",
        model: "Unknown Vendor Device",
        status: "Active",
        location: "Auto-Discovered",
        ipAddress: randomIP,
        macAddress: `00:11:22:33:44:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}`,
        latitude: "37.7749",
        longitude: "-122.4194",
        discoveryMethod: "auto-discovery",
        discoveryData: JSON.stringify({
          vendor: "Unknown Vendor",
          hostname: deviceName,
          ports: [],
          osGuess: "Unknown",
          responseTime: 0,
          lastSeen: new Date().toISOString()
        })
      });
      
      // Broadcast new device notification to trigger popup
      broadcastToClients({
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

      // Create notification history record
      try {
        await storage.createNotificationHistory({
          deviceId: pendingDevice.id,
          deviceName: pendingDevice.name,
          deviceModel: pendingDevice.model,
          deviceType: pendingDevice.type,
          deviceStatus: pendingDevice.status,
          deviceLocation: pendingDevice.location || 'Unknown',
          notificationType: 'DEVICE_ADDED'
        });
      } catch (error) {
        console.error(`Failed to create notification history for auto-discovered device ${deviceName}:`, error);
      }

      res.json({
        success: true,
        message: `Auto-discovered device ${deviceName} created for approval`,
        device: pendingDevice
      });

    } catch (error) {
      console.error('Auto-discovered device creation error:', error);
      res.status(500).json({ message: "Failed to create auto-discovered device" });
    }
  });

  // Get all pending devices
  app.get("/api/pending-devices", async (req: Request, res: Response) => {
    try {
      const pendingDevices = await storage.getPendingDevices();
      res.json(pendingDevices);
    } catch (error) {
      console.error('Error fetching pending devices:', error);
      res.status(500).json({ message: "Failed to fetch pending devices" });
    }
  });

  // Device approval endpoint
  app.post("/api/devices/approve/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const approvedDevice = await storage.approvePendingDevice(id);
      if (!approvedDevice) {
        return res.status(404).json({ message: "Pending device not found" });
      }

      // Broadcast device approved notification
      broadcastToClients({
        type: 'DEVICE_APPROVED',
        data: approvedDevice,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Device ${approvedDevice.name} approved and added to dashboard`,
        device: approvedDevice
      });

    } catch (error) {
      console.error('Device approval error:', error);
      res.status(500).json({ message: "Failed to approve device" });
    }
  });

  // Device rejection endpoint
  app.post("/api/devices/reject/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const success = await storage.rejectPendingDevice(id);
      if (!success) {
        return res.status(404).json({ message: "Pending device not found" });
      }

      // Broadcast device rejected notification
      broadcastToClients({
        type: 'DEVICE_REJECTED',
        data: { id },
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "Device rejected successfully"
      });

    } catch (error) {
      console.error('Device rejection error:', error);
      res.status(500).json({ message: "Failed to reject device" });
    }
  });

  // Get pending devices endpoint
  app.get("/api/pending-devices", async (req: Request, res: Response) => {
    try {
      const pendingDevices = await storage.getPendingDevices();
      const activePendingDevices = pendingDevices.filter(device => !device.isApproved && !device.isRejected);
      res.json(activePendingDevices);
    } catch (error) {
      console.error('Error fetching pending devices:', error);
      res.status(500).json({ message: "Failed to fetch pending devices" });
    }
  });

  // Helper function to classify device type based on characteristics
  function classifyDeviceType(deviceName: string, operatingSystem: string, installedSoftware: string[] = []): string {
    const hostname = deviceName.toLowerCase();
    const os = operatingSystem.toLowerCase();
    
    // Check for mobile devices first
    if (hostname.includes('iphone') || hostname.includes('ipad') || hostname.includes('android') || 
        hostname.includes('mobile') || os.includes('android') || os.includes('ios')) {
      return "Mobile";
    }
    
    // Check for tablets
    if (hostname.includes('ipad') || hostname.includes('tablet')) {
      return "Tablet";
    }
    
    // Check for laptops/notebooks
    if (hostname.includes('laptop') || hostname.includes('notebook') || hostname.includes('macbook') ||
        hostname.includes('thinkpad') || hostname.includes('dell-laptop') || hostname.includes('hp-laptop') ||
        (os.includes('darwin') && hostname.includes('macbook'))) {
      return "Laptop";
    }
    
    // Check for servers
    if (hostname.includes('server') || hostname.includes('srv') || hostname.includes('db') ||
        hostname.includes('web') || hostname.includes('mail') || hostname.includes('dns') ||
        os.includes('server') || os.includes('centos') || os.includes('ubuntu server') ||
        hostname.includes('host.docker.internal')) {
      return "Server";
    }
    
    // Check for network devices
    if (hostname.includes('router') || hostname.includes('switch') || hostname.includes('gateway') ||
        hostname.includes('access-point') || hostname.includes('ap-') || hostname.includes('wifi')) {
      return "Network Device";
    }
    
    // Check for printers
    if (hostname.includes('printer') || hostname.includes('print') || hostname.includes('hp-') ||
        hostname.includes('canon') || hostname.includes('epson') || hostname.includes('brother')) {
      return "Printer";
    }
    
    // Check for security cameras
    if (hostname.includes('cam') || hostname.includes('camera') || hostname.includes('cctv') ||
        hostname.includes('security') || hostname.includes('surveillance')) {
      return "Security Camera";
    }
    
    // Check for IoT devices
    if (hostname.includes('iot') || hostname.includes('sensor') || hostname.includes('smart') ||
        hostname.includes('alexa') || hostname.includes('nest')) {
      return "IoT Device";
    }
    
    // Default based on OS
    if (os.includes('windows') || os.includes('linux') || os.includes('ubuntu')) {
      return "Workstation";
    }
    
    if (os.includes('darwin') || os.includes('macos')) {
      // Could be laptop or workstation, default to workstation if not identified as MacBook
      return "Workstation";
    }
    
    // Default fallback
    return "Workstation";
  }

  // Endpoint to reclassify existing devices
  app.post("/api/devices/reclassify", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      let reclassifiedCount = 0;
      
      for (const device of devices) {
        // Extract OS info from model field if available
        const modelParts = device.model?.split(' ') || ['Unknown'];
        const osInfo = modelParts.length > 0 ? modelParts.join(' ') : 'Unknown';
        
        // Get new classification
        const newDeviceType = classifyDeviceType(device.name, osInfo, []);
        
        // Only update if classification has changed
        if (device.type !== newDeviceType) {
          await storage.updateDevice(device.id, {
            type: newDeviceType as any
          });
          console.log(`[RECLASSIFY] ${device.name}: ${device.type} → ${newDeviceType}`);
          reclassifiedCount++;
        }
      }
      
      res.json({
        success: true,
        message: `Reclassified ${reclassifiedCount} devices`,
        reclassifiedCount
      });
      
    } catch (error) {
      console.error('Device reclassification error:', error);
      res.status(500).json({ message: "Failed to reclassify devices" });
    }
  });

  // Device update endpoint for Python agents
  app.post("/api/device-update", async (req: Request, res: Response) => {
    try {
      console.log('[DEVICE-UPDATE] Received payload:', JSON.stringify(req.body, null, 2));
      
      const { deviceName, operatingSystem, installedSoftware, ipAddress, location, agentVersion, reportTime, systemUptime, networkDevices, discoveredDevices, geolocation } = req.body;

      if (!deviceName || !operatingSystem) {
        console.log('[DEVICE-UPDATE] Missing required fields:', { deviceName: !!deviceName, operatingSystem: !!operatingSystem });
        return res.status(400).json({ message: "Device name and operating system are required" });
      }
      
      console.log('[DEVICE-UPDATE] Processing device:', deviceName, 'OS:', operatingSystem);

      // Check if device already exists by hostname in main devices table
      const existingDevices = await storage.getDevices();
      const existingDevice = existingDevices.find(device => device.name === deviceName);
      
      // Also check if there's already a pending device for this hostname
      const pendingDevices = await storage.getPendingDevices();
      const existingPendingDevice = pendingDevices.find(device => 
        device.name === deviceName && !device.isApproved && !device.isRejected
      );

      let device;
      let isNewDevice = false;
      
      // Extract geolocation coordinates if available (support both 'location' and 'geolocation' keys)
      let latitude = "37.7749";  // Default to San Francisco
      let longitude = "-122.4194";
      let deviceLocation = "Agent-Reported";
      
      const locationData = location || geolocation;
      if (locationData && (locationData.latitude || locationData.lat) && (locationData.longitude || locationData.lon)) {
        latitude = (locationData.latitude || locationData.lat).toString();
        longitude = (locationData.longitude || locationData.lon).toString();
        
        console.log(`[DEVICE-UPDATE] Location data found:`, locationData);
        
        // Try multiple combinations for location string
        if (locationData.city && locationData.region && locationData.country) {
          deviceLocation = `${locationData.city}, ${locationData.region}, ${locationData.country}`;
        } else if (locationData.city && locationData.region) {
          deviceLocation = `${locationData.city}, ${locationData.region}`;
        } else if (locationData.city && locationData.country) {
          deviceLocation = `${locationData.city}, ${locationData.country}`;
        } else if (locationData.city) {
          deviceLocation = locationData.city;
        } else if (locationData.region) {
          deviceLocation = locationData.region;
        }
        
        console.log(`[DEVICE-UPDATE] Processed location: ${deviceLocation} (${latitude}, ${longitude})`);
      } else {
        console.log(`[DEVICE-UPDATE] No valid location data found in payload`);
      }
      
      if (existingDevice) {
        // Update existing device with geolocation
        device = await storage.updateDevice(existingDevice.id, {
          name: deviceName,
          model: `${operatingSystem} Device`,
          ipAddress: ipAddress || "Unknown",
          status: "Active",
          location: deviceLocation as any,
          latitude: latitude,
          longitude: longitude
        });
        
        // Broadcast device update notification
        broadcastToClients({
          type: 'DEVICE_UPDATED',
          data: device,
          timestamp: new Date().toISOString()
        });

        // Create notification history record for device update
        if (device) {
          try {
            await storage.createNotificationHistory({
              deviceId: device.id,
              deviceName: device.name,
              deviceModel: device.model,
              deviceType: device.type,
              deviceStatus: device.status,
              deviceLocation: device.location || 'Unknown',
              notificationType: 'DEVICE_UPDATED'
            });
          } catch (error) {
            console.error(`Failed to create notification history for updated device ${deviceName}:`, error);
          }
        }
      } else if (!existingPendingDevice) {
        // Create new pending device for approval with geolocation
        const deviceType = classifyDeviceType(deviceName, operatingSystem, installedSoftware);
        const pendingDevice = await storage.createPendingDevice({
          name: deviceName,
          type: deviceType,
          model: `${operatingSystem} Device`,
          status: "Active",
          location: deviceLocation as any,
          ipAddress: ipAddress || "Unknown",
          macAddress: "Unknown",
          latitude: latitude,
          longitude: longitude,
          discoveryMethod: "agent-reported",
          discoveryData: JSON.stringify({
            operatingSystem,
            installedSoftware: installedSoftware || [],
            agentVersion: agentVersion || "Unknown",
            reportTime: reportTime || new Date().toISOString(),
            systemUptime: systemUptime || "Unknown",
            geolocation: locationData || geolocation || {},
            networkDevices: networkDevices || []
          })
        });
        
        device = {
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
        };
        isNewDevice = true;
        
        // Broadcast new device notification for approval
        broadcastToClients({
          type: 'DEVICE_ADDED',
          data: device,
          timestamp: new Date().toISOString(),
          isNewDevice: true,
          isPending: true
        });

        // Create notification history record for new pending device
        try {
          await storage.createNotificationHistory({
            deviceId: pendingDevice.id,
            deviceName: pendingDevice.name,
            deviceModel: pendingDevice.model,
            deviceType: pendingDevice.type,
            deviceStatus: pendingDevice.status,
            deviceLocation: pendingDevice.location || 'Unknown',
            notificationType: 'DEVICE_ADDED'
          });
        } catch (error) {
          console.error(`Failed to create notification history for new pending device ${deviceName}:`, error);
        }
      } else if (existingPendingDevice) {
        // Update existing pending device
        console.log(`[DEVICE-UPDATE] Updating existing pending device: ${deviceName}`);
        device = {
          id: existingPendingDevice.id,
          name: existingPendingDevice.name,
          model: existingPendingDevice.model,
          type: existingPendingDevice.type,
          status: existingPendingDevice.status,
          location: existingPendingDevice.location,
          ipAddress: existingPendingDevice.ipAddress,
          latitude: existingPendingDevice.latitude,
          longitude: existingPendingDevice.longitude,
          lastUpdated: new Date().toISOString()
        };
      }

      // Check for prohibited software if installed software is provided
      let detectedThreats = 0;
      if (installedSoftware && installedSoftware.length > 0 && device) {
        const prohibitedSoftware = await storage.getProhibitedSoftware();
        const prohibitedNames = prohibitedSoftware.map(ps => ps.name.toLowerCase());
        
        for (const software of installedSoftware) {
          if (prohibitedNames.some(prohibited => software.toLowerCase().includes(prohibited))) {
            detectedThreats++;
            
            // Find the prohibited software entry
            const matchedProhibited = prohibitedSoftware.find(ps => 
              software.toLowerCase().includes(ps.name.toLowerCase())
            );
            
            if (matchedProhibited) {
              // Log the detection
              await storage.createSoftwareDetectionLog({
                deviceId: device.id,
                prohibitedSoftwareId: matchedProhibited.id,
                detectedVersion: "Unknown",
                actionTaken: "Flagged",
                status: "Active"
              });
            }
          }
        }
      }

      // Process network devices from agent scan
      let discoveredDeviceCount = 0;
      if (networkDevices && Array.isArray(networkDevices)) {
        console.log(`[*] Processing ${networkDevices.length} network devices from enhanced agent...`);
        console.log(`[*] Network devices:`, networkDevices.map(d => `${d.ip} (${d.mac || 'No MAC'})`));
        
        for (const networkDevice of networkDevices) {
          try {
            // Check if this network device already exists
            const existingNetworkDevice = existingDevices.find(d => 
              d.ipAddress === networkDevice.ip || 
              d.name === networkDevice.ip
            );
            
            if (!existingNetworkDevice) {
              // Create new network-discovered device
              const deviceType = "Network Device";
              const latitude = locationData?.latitude || locationData?.lat || geolocation?.lat ? (locationData?.latitude || locationData?.lat || geolocation?.lat).toString() : "37.7749";
              const longitude = locationData?.longitude || locationData?.lon || geolocation?.lon ? (locationData?.longitude || locationData?.lon || geolocation?.lon).toString() : "-122.4194";
              const location = deviceLocation;
              
              const pendingNetworkDevice = await storage.createPendingDevice({
                name: networkDevice.ip,
                type: deviceType,
                model: "Network-Discovered Device",
                status: "Active",
                location: "Other" as const,
                ipAddress: networkDevice.ip,
                macAddress: networkDevice.mac || "Unknown",
                latitude: latitude,
                longitude: longitude,
                discoveryMethod: "agent-network-scan",
                discoveryData: JSON.stringify({
                  scanSource: deviceName,
                  scanTime: reportTime || new Date().toISOString(),
                  macAddress: networkDevice.mac,
                  agentVersion: agentVersion || "Unknown"
                })
              });
              
              discoveredDeviceCount++;
              console.log(`[*] Created pending network device: ${networkDevice.ip} (MAC: ${networkDevice.mac || 'Unknown'})`);
              
              // Broadcast new network device for approval
              broadcastToClients({
                type: 'DEVICE_ADDED',
                data: {
                  id: pendingNetworkDevice.id,
                  name: pendingNetworkDevice.name,
                  model: pendingNetworkDevice.model,
                  type: pendingNetworkDevice.type,
                  status: pendingNetworkDevice.status,
                  location: pendingNetworkDevice.location,
                  ipAddress: pendingNetworkDevice.ipAddress,
                  latitude: pendingNetworkDevice.latitude,
                  longitude: pendingNetworkDevice.longitude,
                  lastUpdated: pendingNetworkDevice.createdAt
                },
                timestamp: new Date().toISOString(),
                isNewDevice: true,
                isPending: true
              });
              
              // Create notification history
              try {
                await storage.createNotificationHistory({
                  deviceId: pendingNetworkDevice.id,
                  deviceName: pendingNetworkDevice.name,
                  deviceModel: pendingNetworkDevice.model,
                  deviceType: pendingNetworkDevice.type,
                  deviceStatus: pendingNetworkDevice.status,
                  deviceLocation: pendingNetworkDevice.location || 'Unknown',
                  notificationType: 'DEVICE_ADDED'
                });
              } catch (error) {
                console.error(`Failed to create notification history for network device ${networkDevice.ip}:`, error);
              }
            }
          } catch (error) {
            console.error(`Error processing network device ${networkDevice.ip}:`, error);
          }
        }
      }
      
      // Also process legacy discoveredDevices format for backward compatibility
      if (discoveredDevices && Array.isArray(discoveredDevices)) {
        console.log(`[*] Processing ${discoveredDevices.length} discovered network devices (legacy format)...`);
        console.log(`[*] Discovered devices:`, discoveredDevices.map(d => `${d.name} (${d.ipAddress})`));
        
        for (const discoveredDevice of discoveredDevices) {
          try {
            // Check if this network device already exists
            const existingNetworkDevice = existingDevices.find(d => 
              d.ipAddress === discoveredDevice.ipAddress || 
              d.name === discoveredDevice.name
            );
            
            if (!existingNetworkDevice) {
              // Use classification function to determine device type
              const deviceName = discoveredDevice.name || discoveredDevice.ipAddress;
              const deviceType = classifyDeviceType(deviceName, discoveredDevice.type || "Unknown", []);
              const deviceModel = discoveredDevice.model || `${deviceType} Device`;
              
              // Create new network device entry
              const networkDevice = await storage.createDevice({
                name: discoveredDevice.name || discoveredDevice.ipAddress,
                type: deviceType as any,
                model: deviceModel,
                status: "Active",
                location: "Other",
                ipAddress: discoveredDevice.ipAddress,
                latitude: "13.0827",  // Chennai coordinates
                longitude: "80.2707"
              });
              
              discoveredDeviceCount++;
              
              // Broadcast new device notification
              broadcastToClients({
                type: 'DEVICE_ADDED',
                data: networkDevice,
                timestamp: new Date().toISOString()
              });
              
              console.log(`[+] Created network device: ${discoveredDevice.name} (${discoveredDevice.ipAddress})`);
            } else {
              // If existing device is Auto-Discovered, upgrade it to Network-Discovered
              if (existingNetworkDevice.location === "Auto-Discovered") {
                await storage.updateDevice(existingNetworkDevice.id, {
                  location: "Other",
                  status: "Active",
                  latitude: "13.0827",  // Chennai coordinates
                  longitude: "80.2707"
                });
                console.log(`[↑] Upgraded auto-discovered device to network-discovered: ${existingNetworkDevice.name} (${existingNetworkDevice.ipAddress})`);
              } else {
                // Update existing network device's last seen time
                await storage.updateDevice(existingNetworkDevice.id, {
                  status: "Active"
                });
                console.log(`[=] Updated existing device: ${existingNetworkDevice.name} (${existingNetworkDevice.ipAddress}) - Location: ${existingNetworkDevice.location}`);
              }
            }
          } catch (error) {
            console.error(`[!] Failed to process network device ${discoveredDevice.name}:`, error);
          }
        }
      }



      res.json({
        success: true,
        message: `Device ${deviceName} updated successfully`,
        deviceId: device?.id,
        detectedThreats,
        discoveredDeviceCount,

        agentVersion: agentVersion || "unknown",
        lastUpdate: new Date().toISOString(),
        geolocation: geolocation || {}
      });

    } catch (error) {
      console.error('Device update error:', error);
      res.status(500).json({ message: "Failed to update device information" });
    }
  });

  // Ticket Management API endpoints
  app.get("/api/tickets", async (req: Request, res: Response) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      console.error('Get tickets error:', error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Get ticket error:', error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.get("/api/tickets/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const tickets = await storage.getTicketsByDevice(deviceId);
      res.json(tickets);
    } catch (error) {
      console.error('Get device tickets error:', error);
      res.status(500).json({ message: "Failed to fetch device tickets" });
    }
  });

  app.post("/api/tickets", async (req: Request, res: Response) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      
      // Generate ticket number if not provided
      if (!ticketData.ticketNumber) {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        ticketData.ticketNumber = `TKT-${year}-${random}`;
      }
      
      const ticket = await storage.createTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      console.error('Create ticket error:', error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const updateData = insertTicketSchema.partial().parse(req.body);
      const ticket = await storage.updateTicket(id, updateData);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      console.error('Update ticket error:', error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  app.post("/api/tickets/:id/close", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const { resolvedBy, notes } = req.body;
      if (!resolvedBy) {
        return res.status(400).json({ message: "resolvedBy is required" });
      }

      const ticket = await storage.closeTicket(id, resolvedBy, notes);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error('Close ticket error:', error);
      res.status(500).json({ message: "Failed to close ticket" });
    }
  });



  // Network Discovery API endpoints
  app.get("/api/network-devices", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getNetworkDevices();
      res.json(devices);
    } catch (error) {
      console.error('Network devices fetch error:', error);
      res.status(500).json({ message: "Failed to fetch network devices" });
    }
  });

  // Test endpoint to manually add network device
  app.post("/api/network-devices-test", async (req: Request, res: Response) => {
    try {
      const device = await storage.createNetworkDevice(req.body);
      res.json(device);
    } catch (error) {
      console.error('Network device creation error:', error);
      res.status(500).json({ message: "Failed to create network device", error: (error as Error).message });
    }
  });

  app.get("/api/network-devices/:id/history", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const history = await storage.getIpHistoryByDevice(deviceId);
      res.json(history);
    } catch (error) {
      console.error('Network device history fetch error:', error);
      res.status(500).json({ message: "Failed to fetch network device history" });
    }
  });

  // Network Scanner API endpoints
  app.get("/api/network-scanner/status", (req: Request, res: Response) => {
    res.json(networkScanner.getStatus());
  });

  app.get("/api/network-scanner/discovered-devices", (req: Request, res: Response) => {
    res.json(networkScanner.getDiscoveredDevices());
  });

  app.get("/api/network-scanner/api-keys", (req: Request, res: Response) => {
    res.json(networkScanner.getDeviceApiKeys());
  });

  app.post("/api/network-scanner/start", (req: Request, res: Response) => {
    const { intervalMinutes } = req.body;
    networkScanner.startScanning(intervalMinutes || 5);
    res.json({ message: "Network scanner started", intervalMinutes: intervalMinutes || 5 });
  });

  app.post("/api/network-scanner/stop", (req: Request, res: Response) => {
    networkScanner.stopScanning();
    res.json({ message: "Network scanner stopped" });
  });

  app.post("/api/network-scanner/verify-key", (req: Request, res: Response) => {
    const { apiKey } = req.body;
    const deviceKey = networkScanner.isValidApiKey(apiKey);
    
    if (deviceKey) {
      res.json({ valid: true, device: deviceKey });
    } else {
      res.json({ valid: false, message: "Invalid API key" });
    }
  });

  // Comprehensive Network Scanner API endpoints
  app.get("/api/comprehensive-scanner/status", (req: Request, res: Response) => {
    res.json(comprehensiveScanner.getStatus());
  });

  app.get("/api/comprehensive-scanner/discovered-devices", (req: Request, res: Response) => {
    res.json(comprehensiveScanner.getDiscoveredDevices());
  });

  app.post("/api/comprehensive-scanner/start", (req: Request, res: Response) => {
    const { intervalMinutes } = req.body;
    comprehensiveScanner.startComprehensiveScanning(intervalMinutes || 5);
    res.json({ message: "Comprehensive network scanner started", intervalMinutes: intervalMinutes || 5 });
  });

  app.post("/api/comprehensive-scanner/stop", (req: Request, res: Response) => {
    comprehensiveScanner.stopScanning();
    res.json({ message: "Comprehensive network scanner stopped" });
  });

  // Force save discovered devices to database
  app.post("/api/comprehensive-scanner/save-to-db", async (req: Request, res: Response) => {
    try {
      await comprehensiveScanner.saveDiscoveredDevicesToDatabase();
      res.json({ message: "Discovered devices saved to database" });
    } catch (error) {
      res.status(500).json({ message: "Failed to save devices to database" });
    }
  });

  // Auto-enrollment endpoint for devices with API keys
  app.post("/api/auto-enroll", (req: Request, res: Response) => {
    const { apiKey, deviceInfo } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    const deviceKey = networkScanner.isValidApiKey(apiKey);
    if (!deviceKey) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Update device information if provided
    if (deviceInfo) {
      console.log(`🔄 Auto-enrollment update for device ${deviceKey.deviceName}:`, deviceInfo);
    }

    res.json({
      success: true,
      message: "Device auto-enrolled successfully",
      deviceId: deviceKey.deviceId,
      deviceName: deviceKey.deviceName,
      enrollmentTime: new Date().toISOString()
    });
  });

  // Notification History endpoints
  app.get("/api/notifications/history", async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationHistory();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notification history:', error);
      res.status(500).json({ message: "Failed to fetch notification history" });
    }
  });

  app.post("/api/notifications/history", async (req: Request, res: Response) => {
    try {
      const notificationData = req.body;
      const notification = await storage.createNotificationHistory(notificationData);
      res.json(notification);
    } catch (error) {
      console.error('Error creating notification history:', error);
      res.status(500).json({ message: "Failed to create notification history" });
    }
  });

  app.patch("/api/notifications/history/:id/action", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { action } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const notification = await storage.updateNotificationAction(id, action);
      res.json(notification);
    } catch (error) {
      console.error('Error updating notification action:', error);
      res.status(500).json({ message: "Failed to update notification action" });
    }
  });

  // Update device coordinates endpoint
  app.post("/api/update-device-coordinates", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      let updatedCount = 0;
      
      for (const device of devices) {
        // Check if device has default coordinates or coordinates that need updating
        if (device.latitude === '37.7749' && device.longitude === '-122.4194') {
          // Use the public method to assign realistic coordinates
          const coordinates = storage.assignRealisticCoordinates(
            device.type,
            device.location || 'Agent-Reported',
            device.name
          );
          
          await storage.updateDevice(device.id, {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          });
          
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Updated coordinates for ${updatedCount} devices`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error updating device coordinates:", error);
      res.status(500).json({ message: "Failed to update device coordinates" });
    }
  });

  // Get comprehensive analytics for devices page
  app.get("/api/analytics/devices", async (req: Request, res: Response) => {
    try {
      // Get all devices and filter out Unknown types
      const allDevices = await storage.getDevices();
      const devices = allDevices.filter(device => device.type !== 'Unknown');
      
      // Get alerts for security threats
      const alerts = await storage.getAlerts();
      const activeAlerts = alerts.filter(alert => alert.status === 'Active');
      
      // Get software scan data for compliance
      const prohibitedSoftware = await storage.getProhibitedSoftware();
      
      // Calculate metrics
      const totalComputers = devices.length;
      const securityThreats = activeAlerts.filter(alert => 
        alert.severity === 'Critical' || alert.severity === 'High'
      ).length;
      
      // Calculate audit success rate based on devices with recent activity
      const recentDevices = devices.filter(device => {
        if (!device.lastUpdated) return false;
        const lastSeenDate = new Date(device.lastUpdated);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastSeenDate > thirtyDaysAgo;
      });
      const auditSuccessRate = totalComputers > 0 ? Math.round((recentDevices.length / totalComputers) * 100) : 0;
      
      // Calculate compliance score based on multiple factors
      const devicesWithThreats = Math.floor(securityThreats * 0.3); // Estimate based on threats
      
      const complianceScore = totalComputers > 0 ? 
        Math.round(((totalComputers - devicesWithThreats - securityThreats) / totalComputers) * 100) : 100;
      
      // Operating system distribution (estimated based on device names and types)
      const osDistribution = devices.reduce((acc, device) => {
        let os = 'Unknown';
        if (device.name.toLowerCase().includes('windows') || device.model.toLowerCase().includes('pc')) {
          os = 'Windows 10';
        } else if (device.name.toLowerCase().includes('mac') || device.model.toLowerCase().includes('macbook')) {
          os = 'macOS';
        } else if (device.name.toLowerCase().includes('ubuntu') || device.name.toLowerCase().includes('linux')) {
          os = 'Ubuntu Linux';
        } else if (device.type === 'Server') {
          os = 'Ubuntu Server';
        }
        acc[os] = (acc[os] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Audit summary data
      const auditSummary = {
        succeeded: recentDevices.length,
        failed: Math.max(0, totalComputers - recentDevices.length - securityThreats),
        notScanned: Math.max(0, devices.filter(d => !d.lastUpdated).length),
        inProgress: securityThreats
      };
      
      // Software summary
      const totalSoftware = totalComputers * 15; // Estimated average software per device
      const prohibitedDetections = Math.floor(prohibitedSoftware.length * 0.1); // Estimated detections
      
      // License compliance (estimated based on device count and compliance score)
      const inCompliance = Math.round(totalComputers * (complianceScore / 100));
      const outOfCompliance = totalComputers - inCompliance;
      
      // Warranty summary (estimated based on device age and status)
      const warrantyInCompliance = devices.filter(device => device.status === 'Active').length;
      const warrantyOutOfCompliance = totalComputers - warrantyInCompliance;
      
      res.json({
        overview: {
          totalComputers,
          auditSuccessRate,
          securityThreats,
          complianceScore
        },
        osDistribution,
        auditSummary,
        summaryCards: {
          software: {
            total: totalSoftware,
            prohibited: prohibitedSoftware.length,
            detections: prohibitedDetections
          },
          license: {
            inCompliance,
            outOfCompliance,
            total: totalComputers
          },
          warranty: {
            inCompliance: warrantyInCompliance,
            outOfCompliance: warrantyOutOfCompliance,
            total: totalComputers
          },
          security: {
            threatsDetected: securityThreats,
            resolved: alerts.filter(alert => alert.status === 'Resolved').length,
            active: activeAlerts.length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching device analytics:', error);
      res.status(500).json({ message: "Failed to fetch device analytics" });
    }
  });

  // CMDB Configuration Items API
  app.get("/api/cmdb/configuration-items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getCmdbConfigurationItems();
      res.json(items);
    } catch (error) {
      console.error('Error fetching CMDB configuration items:', error);
      res.status(500).json({ message: "Failed to fetch CMDB configuration items" });
    }
  });

  app.get("/api/cmdb/configuration-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid configuration item ID" });
      }

      const item = await storage.getCmdbConfigurationItem(id);
      if (!item) {
        return res.status(404).json({ message: "Configuration item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error('Error fetching CMDB configuration item:', error);
      res.status(500).json({ message: "Failed to fetch CMDB configuration item" });
    }
  });

  app.get("/api/cmdb/configuration-items/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const items = await storage.getCmdbConfigurationItemsByDevice(deviceId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching CMDB configuration items by device:', error);
      res.status(500).json({ message: "Failed to fetch CMDB configuration items for device" });
    }
  });

  app.post("/api/cmdb/configuration-items", async (req: Request, res: Response) => {
    try {
      const result = insertCmdbConfigurationItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid configuration item data", errors: result.error.errors });
      }

      const item = await storage.createCmdbConfigurationItem(result.data);
      res.json(item);
    } catch (error) {
      console.error('Error creating CMDB configuration item:', error);
      res.status(500).json({ message: "Failed to create CMDB configuration item" });
    }
  });

  app.put("/api/cmdb/configuration-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid configuration item ID" });
      }

      const result = insertCmdbConfigurationItemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid configuration item data", errors: result.error.errors });
      }

      const item = await storage.updateCmdbConfigurationItem(id, result.data);
      if (!item) {
        return res.status(404).json({ message: "Configuration item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error('Error updating CMDB configuration item:', error);
      res.status(500).json({ message: "Failed to update CMDB configuration item" });
    }
  });

  app.delete("/api/cmdb/configuration-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid configuration item ID" });
      }

      const deleted = await storage.deleteCmdbConfigurationItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Configuration item not found" });
      }

      res.json({ message: "Configuration item deleted successfully" });
    } catch (error) {
      console.error('Error deleting CMDB configuration item:', error);
      res.status(500).json({ message: "Failed to delete CMDB configuration item" });
    }
  });

  // CMDB Change Records API
  app.get("/api/cmdb/change-records", async (req: Request, res: Response) => {
    try {
      const records = await storage.getCmdbChangeRecords();
      res.json(records);
    } catch (error) {
      console.error('Error fetching CMDB change records:', error);
      res.status(500).json({ message: "Failed to fetch CMDB change records" });
    }
  });

  app.get("/api/cmdb/change-records/configuration-item/:configurationItemId", async (req: Request, res: Response) => {
    try {
      const configurationItemId = parseInt(req.params.configurationItemId);
      if (isNaN(configurationItemId)) {
        return res.status(400).json({ message: "Invalid configuration item ID" });
      }

      const records = await storage.getCmdbChangeRecordsByConfigurationItem(configurationItemId);
      res.json(records);
    } catch (error) {
      console.error('Error fetching CMDB change records by configuration item:', error);
      res.status(500).json({ message: "Failed to fetch CMDB change records for configuration item" });
    }
  });

  app.post("/api/cmdb/change-records", async (req: Request, res: Response) => {
    try {
      const result = insertCmdbChangeRecordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid change record data", errors: result.error.errors });
      }

      const record = await storage.createCmdbChangeRecord(result.data);
      res.json(record);
    } catch (error) {
      console.error('Error creating CMDB change record:', error);
      res.status(500).json({ message: "Failed to create CMDB change record" });
    }
  });

  // CMDB Relationships API
  app.get("/api/cmdb/relationships", async (req: Request, res: Response) => {
    try {
      const relationships = await storage.getCmdbRelationships();
      res.json(relationships);
    } catch (error) {
      console.error('Error fetching CMDB relationships:', error);
      res.status(500).json({ message: "Failed to fetch CMDB relationships" });
    }
  });

  app.get("/api/cmdb/relationships/configuration-item/:configurationItemId", async (req: Request, res: Response) => {
    try {
      const configurationItemId = parseInt(req.params.configurationItemId);
      if (isNaN(configurationItemId)) {
        return res.status(400).json({ message: "Invalid configuration item ID" });
      }

      const relationships = await storage.getCmdbRelationshipsByConfigurationItem(configurationItemId);
      res.json(relationships);
    } catch (error) {
      console.error('Error fetching CMDB relationships by configuration item:', error);
      res.status(500).json({ message: "Failed to fetch CMDB relationships for configuration item" });
    }
  });

  app.post("/api/cmdb/relationships", async (req: Request, res: Response) => {
    try {
      const result = insertCmdbRelationshipSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid relationship data", errors: result.error.errors });
      }

      const relationship = await storage.createCmdbRelationship(result.data);
      res.json(relationship);
    } catch (error) {
      console.error('Error creating CMDB relationship:', error);
      res.status(500).json({ message: "Failed to create CMDB relationship" });
    }
  });

  // CMDB Compliance Rules API
  app.get("/api/cmdb/compliance-rules", async (req: Request, res: Response) => {
    try {
      const rules = await storage.getCmdbComplianceRules();
      res.json(rules);
    } catch (error) {
      console.error('Error fetching CMDB compliance rules:', error);
      res.status(500).json({ message: "Failed to fetch CMDB compliance rules" });
    }
  });

  app.post("/api/cmdb/compliance-rules", async (req: Request, res: Response) => {
    try {
      const result = insertCmdbComplianceRuleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid compliance rule data", errors: result.error.errors });
      }

      const rule = await storage.createCmdbComplianceRule(result.data);
      res.json(rule);
    } catch (error) {
      console.error('Error creating CMDB compliance rule:', error);
      res.status(500).json({ message: "Failed to create CMDB compliance rule" });
    }
  });

  // ===== ALERT MANAGEMENT ENDPOINTS =====
  
  // Get all alerts
  app.get("/api/alerts", async (req: Request, res: Response) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Get alert by ID
  app.get("/api/alerts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.getAlert(id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error('Error fetching alert:', error);
      res.status(500).json({ message: "Failed to fetch alert" });
    }
  });

  // Get alerts by device
  app.get("/api/alerts/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const alerts = await storage.getAlertsByDevice(deviceId);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts by device:', error);
      res.status(500).json({ message: "Failed to fetch alerts by device" });
    }
  });

  // Create alert
  app.post("/api/alerts", async (req: Request, res: Response) => {
    try {
      const result = insertAlertSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid alert data", errors: result.error.errors });
      }

      const alert = await storage.createAlert(result.data);
      res.json(alert);
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  // Update alert status
  app.patch("/api/alerts/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const alert = await storage.updateAlertStatus(id, status, 'system', notes);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error('Error updating alert status:', error);
      res.status(500).json({ message: "Failed to update alert status" });
    }
  });

  // Get alert history
  app.get("/api/alerts/:id/history", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getAlertHistory(id);
      res.json(history);
    } catch (error) {
      console.error('Error fetching alert history:', error);
      res.status(500).json({ message: "Failed to fetch alert history" });
    }
  });

  // Delete alert
  app.delete("/api/alerts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAlert(id);
      if (!deleted) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      console.error('Error deleting alert:', error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // ===== ALERT TEMPLATE ENDPOINTS =====

  // Get all alert templates
  app.get("/api/alert-templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAlertTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching alert templates:', error);
      res.status(500).json({ message: "Failed to fetch alert templates" });
    }
  });

  // Test endpoint to create sample alerts
  app.post("/api/alerts/test/create-samples", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      if (devices.length === 0) {
        return res.status(400).json({ message: "No devices available to create alerts for" });
      }

      const sampleAlerts = [
        {
          deviceId: devices[0].id,
          alertType: 'warranty_expiration',
          alertTitle: 'Warranty Expiring Soon',
          alertDescription: 'Device warranty expires in 30 days',
          severity: 'Medium',
          alertDate: new Date(),
          warrantyExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          assignedTo: 'IT Team',
          status: 'Active',
          isRecurring: false,
          emailNotificationSent: false,
          escalationLevel: 0,
          tags: []
        },
        {
          deviceId: devices[Math.min(1, devices.length - 1)].id,
          alertType: 'end_of_life',
          alertTitle: 'End of Life Approaching',
          alertDescription: 'Device reaches end of life in 90 days',
          severity: 'High',
          alertDate: new Date(),
          endOfLifeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          assignedTo: 'System Admin',
          status: 'Active',
          isRecurring: false,
          emailNotificationSent: false,
          escalationLevel: 0,
          tags: []
        },
        {
          deviceId: devices[Math.min(2, devices.length - 1)].id,
          alertType: 'maintenance_due',
          alertTitle: 'Maintenance Required',
          alertDescription: 'Scheduled maintenance is overdue',
          severity: 'Critical',
          alertDate: new Date(),
          maintenanceDueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          assignedTo: 'Maintenance Team',
          status: 'Active',
          isRecurring: false,
          emailNotificationSent: false,
          escalationLevel: 0,
          tags: []
        }
      ];

      const createdAlerts = [];
      for (const alertData of sampleAlerts) {
        const alert = await storage.createAlert(alertData);
        createdAlerts.push(alert);
      }

      res.json({ 
        message: "Sample alerts created successfully", 
        alerts: createdAlerts 
      });
    } catch (error) {
      console.error('Error creating sample alerts:', error);
      res.status(500).json({ message: "Failed to create sample alerts" });
    }
  });

  // ===== WARRANTY MANAGEMENT ENDPOINTS =====

  // Update device warranty information
  app.patch("/api/devices/:id/warranty", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const warrantyData = req.body;

      // Convert string dates to Date objects and filter out undefined values
      const processedData: any = {};
      
      // Copy non-date fields
      Object.keys(warrantyData).forEach(key => {
        if (!['purchaseDate', 'warrantyStartDate', 'warrantyEndDate', 'endOfLifeDate', 'nextMaintenanceDate', 'lastMaintenanceDate'].includes(key)) {
          processedData[key] = warrantyData[key];
        }
      });
      
      // Process date fields using string format
      if (warrantyData.purchaseDate) {
        processedData.purchaseDate = warrantyData.purchaseDate;
      }
      if (warrantyData.warrantyStartDate) {
        processedData.warrantyStartDate = warrantyData.warrantyStartDate;
      }
      if (warrantyData.warrantyEndDate) {
        processedData.warrantyEndDate = warrantyData.warrantyEndDate;
      }
      if (warrantyData.endOfLifeDate) {
        processedData.endOfLifeDate = warrantyData.endOfLifeDate;
      }
      if (warrantyData.nextMaintenanceDate) {
        processedData.nextMaintenanceDate = warrantyData.nextMaintenanceDate;
      }
      if (warrantyData.lastMaintenanceDate) {
        processedData.lastMaintenanceDate = warrantyData.lastMaintenanceDate;
      }
      
      // Note: warrantyLastChecked timestamp will be handled by the database

      const device = await storage.updateDevice(parseInt(id), processedData);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      res.json(device);
    } catch (error) {
      console.error('Error updating device warranty:', error);
      res.status(500).json({ message: "Failed to update warranty information" });
    }
  });

  // Bulk warranty import endpoint
  app.post("/api/warranty/bulk-import", async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid CSV data format" });
      }

      const results = { success: 0, failed: 0, errors: [] };
      
      for (const row of csvData) {
        try {
          const device = await storage.getDeviceByName(row.deviceName);
          if (!device) {
            results.errors.push(`Device not found: ${row.deviceName}`);
            results.failed++;
            continue;
          }

          const warrantyData = {
            serialNumber: row.serialNumber,
            assetTag: row.assetTag,
            manufacturer: row.manufacturer,
            purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
            warrantyStartDate: row.warrantyStartDate ? new Date(row.warrantyStartDate) : undefined,
            warrantyEndDate: row.warrantyEndDate ? new Date(row.warrantyEndDate) : undefined,
            warrantyType: row.warrantyType,
            warrantyProvider: row.warrantyProvider,
            cost: row.cost,
            supplier: row.supplier,
            owner: row.owner,
            department: row.department,
            endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
            nextMaintenanceDate: row.nextMaintenanceDate ? new Date(row.nextMaintenanceDate) : undefined,
            warrantyAutoDetected: false,
            warrantyLastChecked: new Date()
          };

          await storage.updateDeviceWarranty(device.id, warrantyData);
          results.success++;
        } catch (error) {
          results.errors.push(`Error processing ${row.deviceName}: ${(error as Error).message}`);
          results.failed++;
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Error bulk importing warranty data:', error);
      res.status(500).json({ message: "Failed to import warranty data" });
    }
  });

  // Auto-detect warranty information for a device
  app.post("/api/devices/:id/warranty/auto-detect", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const device = await storage.getDevice(parseInt(id));
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Import warranty service
      const { WarrantyService } = await import('./warranty-service');
      const warrantyInfo = await WarrantyService.detectWarrantyInfo(device);
      
      if (warrantyInfo.autoDetected) {
        const updatedDevice = await storage.updateDeviceWarranty(parseInt(id), {
          warrantyEndDate: warrantyInfo.warrantyEndDate,
          warrantyType: warrantyInfo.warrantyType,
          warrantyProvider: warrantyInfo.warrantyProvider,
          manufacturer: warrantyInfo.manufacturer,
          warrantyAutoDetected: true,
          warrantyLastChecked: new Date()
        });
        
        res.json({ 
          message: "Warranty information auto-detected successfully",
          device: updatedDevice,
          warrantyInfo 
        });
      } else {
        res.json({ 
          message: "Could not auto-detect warranty information",
          device,
          warrantyInfo 
        });
      }
    } catch (error) {
      console.error('Error auto-detecting warranty:', error);
      res.status(500).json({ message: "Failed to auto-detect warranty information" });
    }
  });

  // Check warranty expiration for all devices
  app.post("/api/warranty/check-expirations", async (req: Request, res: Response) => {
    try {
      const { WarrantyService } = await import('./warranty-service');
      await WarrantyService.checkWarrantyExpirations();
      res.json({ message: "Warranty expiration check completed" });
    } catch (error) {
      console.error('Error checking warranty expirations:', error);
      res.status(500).json({ message: "Failed to check warranty expirations" });
    }
  });

  // Manual trigger for alert scheduler
  app.post("/api/alerts/trigger-check", async (req: Request, res: Response) => {
    try {
      await AlertScheduler.triggerManualCheck();
      res.json({ message: "Alert check triggered successfully" });
    } catch (error) {
      console.error('Error triggering alert check:', error);
      res.status(500).json({ message: "Failed to trigger alert check" });
    }
  });

  // Test endpoint to manually send a retirement notification popup
  app.post("/api/test/retirement-notification", async (req: Request, res: Response) => {
    try {
      console.log('🧪 Sending test retirement notification popup');
      
      // Get the first device for testing
      const devices = await storage.getDevices();
      const testDevice = devices[0];
      
      if (!testDevice) {
        return res.status(404).json({ error: 'No devices found for testing' });
      }

      // Send a test retirement notification
      if (broadcastToClients) {
        broadcastToClients({
          type: 'ASSET_RETIREMENT_ALERT',
          data: {
            id: 999,
            deviceId: testDevice.id,
            deviceName: testDevice.name,
            retirementDate: '7/23/2025',
            daysUntilRetirement: 1,
            severity: 'Critical',
            message: `Test: Asset "${testDevice.name}" is scheduled for retirement in 1 day`,
            alertTitle: 'TEST RETIREMENT ALERT',
            alertDescription: `This is a test retirement notification for device "${testDevice.name}"`
          },
          timestamp: new Date().toISOString(),
          isRetirementAlert: true
        });
        
        console.log(`📡 Test retirement notification sent for device: ${testDevice.name}`);
        res.json({ 
          message: 'Test retirement notification sent successfully',
          deviceName: testDevice.name,
          deviceId: testDevice.id
        });
      } else {
        res.status(500).json({ error: 'WebSocket broadcast function not available' });
      }
    } catch (error) {
      console.error('Error sending test retirement notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Start network scanners when server starts
  console.log('🚀 Starting Finecons network scanner...');
  networkScanner.startScanning(5); // Scan every 5 minutes
  
  console.log('🚀 Starting comprehensive network scanner...');
  comprehensiveScanner.startComprehensiveScanning(5); // Comprehensive scan every 5 minutes

  // Start alert scheduler
  console.log('🚨 Starting Alert Scheduler...');
  setBroadcastFunction(broadcastToClients);
  AlertScheduler.startScheduler();

  // ===== EMAIL NOTIFICATION ENDPOINTS =====
  
  // Test email endpoint
  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      const { to, subject, message } = req.body;
      const emailTo = to || "test@example.com";
      const emailSubject = subject || "ITAM System Test Email";
      const emailMessage = message || "This is a test email from the ITAM system.";
      
      const success = await emailService.sendTestEmail(emailTo, emailSubject, emailMessage);
      
      if (success) {
        res.json({
          message: "Test email sent successfully",
          from: process.env.SMTP_EMAIL || 'itam-system@company.com',
          to: emailTo,
          subject: emailSubject,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          message: "Failed to send test email",
          error: "Email service not configured or sending failed"
        });
      }
    } catch (error) {
      console.error('Test email endpoint error:', error);
      res.status(500).json({
        message: "Test email failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Send device notification email endpoint
  app.post("/api/send-device-email", async (req: Request, res: Response) => {
    try {
      const { deviceName, deviceModel, deviceBrand, issueType, ticketNumber, serialNumber, timestamp } = req.body;
      
      if (!deviceName || !deviceModel || !issueType || !ticketNumber) {
        return res.status(400).json({
          message: "Missing required fields: deviceName, deviceModel, issueType, ticketNumber"
        });
      }

      const deviceData = {
        deviceName,
        deviceModel,
        deviceBrand,
        issueType,
        ticketNumber,
        serialNumber,
        timestamp: timestamp || new Date().toISOString()
      };
      
      const success = await emailService.sendDeviceNotification(deviceData);
      
      if (success) {
        res.json({
          message: "Device notification email sent successfully",
          ticketNumber,
          deviceName,
          issueType,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          message: "Failed to send device notification email",
          error: "Email service not configured, brand not supported, or sending failed"
        });
      }
    } catch (error) {
      console.error('Device email endpoint error:', error);
      res.status(500).json({
        message: "Device notification email failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get email configuration
  app.get("/api/email-config", async (req: Request, res: Response) => {
    try {
      const config = emailService.getConfiguration();
      res.json({
        ...config,
        senderEmail: process.env.SMTP_EMAIL || 'not-configured'
      });
    } catch (error) {
      console.error('Email config endpoint error:', error);
      res.status(500).json({
        message: "Failed to get email configuration"
      });
    }
  });

  // Get email logs
  app.get("/api/email-logs", async (req: Request, res: Response) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const logPath = path.join(process.cwd(), 'email_log.txt');
      
      if (!fs.existsSync(logPath)) {
        return res.json([]);
      }
      
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      const logs = lines.map((line, index) => {
        const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| TO: (.+?) \| SUBJECT: (.+)$/);
        if (match) {
          return {
            id: index + 1,
            timestamp: match[1],
            recipient: match[2],
            subject: match[3]
          };
        }
        return null;
      }).filter(Boolean);
      
      res.json(logs.reverse());
    } catch (error) {
      console.error('Email logs endpoint error:', error);
      res.status(500).json({
        message: "Failed to get email logs"
      });
    }
  });

  // ===== ASSET LIFECYCLE MANAGEMENT ENDPOINTS =====
  
  // Get all asset lifecycles
  app.get("/api/asset-lifecycle", async (req: Request, res: Response) => {
    try {
      const lifecycles = await storage.getAssetLifecycles();
      res.json(lifecycles);
    } catch (error) {
      console.error('Error fetching asset lifecycles:', error);
      res.status(500).json({ message: "Failed to fetch asset lifecycles" });
    }
  });

  // Get asset lifecycle by ID
  app.get("/api/asset-lifecycle/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lifecycle ID" });
      }
      
      const lifecycle = await storage.getAssetLifecycle(id);
      if (!lifecycle) {
        return res.status(404).json({ message: "Asset lifecycle not found" });
      }
      
      res.json(lifecycle);
    } catch (error) {
      console.error('Error fetching asset lifecycle:', error);
      res.status(500).json({ message: "Failed to fetch asset lifecycle" });
    }
  });

  // Create asset lifecycle
  app.post("/api/asset-lifecycle", async (req: Request, res: Response) => {
    try {
      const result = insertAssetLifecycleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid asset lifecycle data", 
          errors: result.error.errors 
        });
      }

      // Check if device exists
      const device = await storage.getDevice(result.data.deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Check if lifecycle already exists for this device
      const existingLifecycle = await storage.getAssetLifecycleByDeviceId(result.data.deviceId);
      if (existingLifecycle) {
        return res.status(409).json({ message: "Asset lifecycle already exists for this device" });
      }

      const lifecycle = await storage.createAssetLifecycle(result.data);
      res.json(lifecycle);
    } catch (error) {
      console.error('Error creating asset lifecycle:', error);
      res.status(500).json({ message: "Failed to create asset lifecycle" });
    }
  });

  // Update asset lifecycle
  app.put("/api/asset-lifecycle/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lifecycle ID" });
      }

      const result = insertAssetLifecycleSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid asset lifecycle data", 
          errors: result.error.errors 
        });
      }

      const lifecycle = await storage.updateAssetLifecycle(id, result.data);
      if (!lifecycle) {
        return res.status(404).json({ message: "Asset lifecycle not found" });
      }

      res.json(lifecycle);
    } catch (error) {
      console.error('Error updating asset lifecycle:', error);
      res.status(500).json({ message: "Failed to update asset lifecycle" });
    }
  });

  // Delete asset lifecycle
  app.delete("/api/asset-lifecycle/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lifecycle ID" });
      }

      const deleted = await storage.deleteAssetLifecycle(id);
      if (!deleted) {
        return res.status(404).json({ message: "Asset lifecycle not found" });
      }

      res.json({ message: "Asset lifecycle deleted successfully" });
    } catch (error) {
      console.error('Error deleting asset lifecycle:', error);
      res.status(500).json({ message: "Failed to delete asset lifecycle" });
    }
  });

  // Get assets near retirement
  app.get("/api/asset-lifecycle/near-retirement/:days", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.params.days);
      if (isNaN(days) || days < 0) {
        return res.status(400).json({ message: "Invalid days parameter" });
      }

      const lifecycles = await storage.getAssetsNearRetirement(days);
      res.json(lifecycles);
    } catch (error) {
      console.error('Error fetching assets near retirement:', error);
      res.status(500).json({ message: "Failed to fetch assets near retirement" });
    }
  });

  // User Management routes
  app.get("/api/user-management", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUserManagementUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching user management users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/user-management/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserManagementUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/user-management", async (req: Request, res: Response) => {
    try {
      const parseResult = insertUserManagementSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data",
          errors: parseResult.error.errors 
        });
      }

      // Check if email already exists
      const existingUser = await storage.getUserManagementUserByEmail(parseResult.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUserManagementUser(parseResult.data);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/user-management/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Parse and validate the update data
      const updateData = { ...req.body };
      delete updateData.id; // Don't allow updating ID

      const user = await storage.updateUserManagementUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/user-management/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const success = await storage.deleteUserManagementUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  return httpServer;
}