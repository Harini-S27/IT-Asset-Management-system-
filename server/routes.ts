import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { routerManager } from "./router-manager";
import { 
  insertDeviceSchema, 
  insertProhibitedSoftwareSchema,
  insertSoftwareDetectionLogSchema,
  insertSoftwareScanResultsSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}