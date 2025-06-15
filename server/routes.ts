import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      if (existingDevice) {
        // Update existing device
        device = await storage.updateDevice(existingDevice.id, {
          name: deviceName,
          model: `${operatingSystem} Device`,
          ipAddress: ipAddress || "Unknown",
          status: "Active"
        });
      } else {
        // Create new device
        device = await storage.createDevice({
          name: deviceName,
          type: "Workstation",
          model: `${operatingSystem} Device`,
          status: "Active",
          location: "Remote",
          ipAddress: ipAddress || "Unknown",
          latitude: "37.7749",
          longitude: "-122.4194"
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

  const httpServer = createServer(app);
  return httpServer;
}