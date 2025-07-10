import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { routerManager } from "./router-manager";
import { emailService } from "./email-service";
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

  // Device update endpoint for Python agents
  app.post("/api/device-update", async (req: Request, res: Response) => {
    try {
      const { deviceName, operatingSystem, installedSoftware, ipAddress, location, agentVersion, reportTime, systemUptime } = req.body;

      if (!deviceName || !operatingSystem) {
        return res.status(400).json({ message: "Device name and operating system are required" });
      }

      // Check if device already exists by hostname
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
      } else {
        // Create new device
        device = await storage.createDevice({
          name: deviceName,
          type: "Workstation",
          model: `${operatingSystem} Device`,
          status: "Active",
          location: "Agent-Reported",
          ipAddress: ipAddress || "Unknown",
          latitude: "37.7749",
          longitude: "-122.4194"
        });
        isNewDevice = true;
        
        // Broadcast new device notification
        broadcastToClients({
          type: 'DEVICE_ADDED',
          data: device,
          timestamp: new Date().toISOString(),
          isNewDevice: true
        });
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

      res.json({
        success: true,
        message: `Device ${deviceName} updated successfully`,
        deviceId: device?.id,
        detectedThreats,
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

  return httpServer;
}