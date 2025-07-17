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
  insertTicketSchema
} from "@shared/schema";
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
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    connectedClients.add(ws);
    
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
        location: "Agent-Reported",
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

  // Device update endpoint for Python agents
  app.post("/api/device-update", async (req: Request, res: Response) => {
    try {
      const { deviceName, operatingSystem, installedSoftware, ipAddress, location, agentVersion, reportTime, systemUptime, networkDevices, discoveredDevices } = req.body;

      if (!deviceName || !operatingSystem) {
        return res.status(400).json({ message: "Device name and operating system are required" });
      }

      // Check if device already exists by hostname in main devices table
      const existingDevices = await storage.getDevices();
      const existingDevice = existingDevices.find(device => device.name === deviceName);

      let device;
      let isNewDevice = false;
      if (existingDevice) {
        // Update existing device
        device = await storage.updateDevice(existingDevice.id, {
          name: deviceName,
          model: `${operatingSystem} Device`,
          ipAddress: ipAddress || "Unknown",
          status: "Active"
        });
        
        // Broadcast device update notification
        broadcastToClients({
          type: 'DEVICE_UPDATED',
          data: device,
          timestamp: new Date().toISOString()
        });

        // Create notification history record for device update
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
      } else {
        // Create new pending device for approval
        const pendingDevice = await storage.createPendingDevice({
          name: deviceName,
          type: "Workstation",
          model: `${operatingSystem} Device`,
          status: "Active",
          location: "Agent-Reported",
          ipAddress: ipAddress || "Unknown",
          macAddress: "Unknown",
          latitude: "37.7749",
          longitude: "-122.4194",
          discoveryMethod: "agent-reported",
          discoveryData: JSON.stringify({
            operatingSystem,
            installedSoftware: installedSoftware || [],
            agentVersion: agentVersion || "Unknown",
            reportTime: reportTime || new Date().toISOString(),
            systemUptime: systemUptime || "Unknown"
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

      // Process discovered network devices
      let discoveredDeviceCount = 0;
      if (discoveredDevices && Array.isArray(discoveredDevices)) {
        console.log(`[*] Processing ${discoveredDevices.length} discovered network devices...`);
        console.log(`[*] Discovered devices:`, discoveredDevices.map(d => `${d.name} (${d.ipAddress})`));
        
        for (const discoveredDevice of discoveredDevices) {
          try {
            // Check if this network device already exists
            const existingNetworkDevice = existingDevices.find(d => 
              d.ipAddress === discoveredDevice.ipAddress || 
              d.name === discoveredDevice.name
            );
            
            if (!existingNetworkDevice) {
              // Determine device type based on discovered information
              let deviceType = "Network Device";
              let deviceModel = "Unknown Device";
              
              if (discoveredDevice.type === "Mobile") {
                deviceType = "Mobile";
                deviceModel = discoveredDevice.model || "Mobile Device";
              } else if (discoveredDevice.type === "Workstation") {
                deviceType = "Workstation";
                deviceModel = discoveredDevice.model || "Workstation Device";
              } else if (discoveredDevice.type === "Server") {
                deviceType = "Server";
                deviceModel = discoveredDevice.model || "Server Device";
              } else if (discoveredDevice.type === "Network") {
                deviceType = "Network Device";
                deviceModel = discoveredDevice.model || "Network Device";
              } else {
                deviceType = "Network Device";
                deviceModel = discoveredDevice.model || `${discoveredDevice.type || 'Unknown'} Device`;
              }
              
              // Create new network device entry
              const networkDevice = await storage.createDevice({
                name: discoveredDevice.name || discoveredDevice.ipAddress,
                type: deviceType,
                model: deviceModel,
                status: "Active",
                location: "Network-Discovered",
                ipAddress: discoveredDevice.ipAddress,
                macAddress: discoveredDevice.macAddress || "Unknown",
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
                  location: "Network-Discovered",
                  status: "Active",
                  latitude: "13.0827",  // Chennai coordinates
                  longitude: "80.2707",
                  lastUpdated: new Date().toISOString()
                });
                console.log(`[↑] Upgraded auto-discovered device to network-discovered: ${existingNetworkDevice.name} (${existingNetworkDevice.ipAddress})`);
              } else {
                // Update existing network device's last seen time
                await storage.updateDevice(existingNetworkDevice.id, {
                  status: "Active",
                  lastUpdated: new Date().toISOString()
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
        lastUpdate: new Date().toISOString()
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

  // Email logs endpoint
  app.get("/api/email-logs", async (req: Request, res: Response) => {
    try {
      const logs = emailService.getEmailLogs();
      res.json(logs);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Email configuration status endpoint
  app.get("/api/email-config", async (req: Request, res: Response) => {
    try {
      const config = emailService.getConfiguration();
      res.json(config);
    } catch (error) {
      console.error('Failed to fetch email configuration:', error);
      res.status(500).json({ message: "Failed to fetch email configuration" });
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

  // Start network scanners when server starts
  console.log('🚀 Starting Finecons network scanner...');
  networkScanner.startScanning(5); // Scan every 5 minutes
  
  console.log('🚀 Starting comprehensive network scanner...');
  comprehensiveScanner.startComprehensiveScanning(5); // Comprehensive scan every 5 minutes

  return httpServer;
}