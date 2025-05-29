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

  // Helper function to perform automatic scan
  const performAutomaticScan = async (device: any) => {
    try {
      // Get prohibited software list
      const prohibitedSoftwareList = await storage.getProhibitedSoftware();
      
      // Simulate finding some prohibited software randomly
      const detectedSoftware = prohibitedSoftwareList.filter(() => Math.random() > 0.6);
      
      // Create scan result
      await storage.createSoftwareScanResult({
        deviceId: device.id,
        totalSoftwareFound: Math.floor(Math.random() * 50) + 20,
        prohibitedSoftwareCount: detectedSoftware.length,
        scanStatus: "Completed",
        scanDuration: Math.floor(Math.random() * 60) + 30
      });

      // Create detection logs for found software
      for (const software of detectedSoftware) {
        await storage.createSoftwareDetectionLog({
          deviceId: device.id,
          prohibitedSoftwareId: software.id,
          detectedVersion: "1.0.0",
          actionTaken: software.blockExecution ? "Blocked" : "Flagged",
          status: "Active",
          notes: `Auto-detected during device registration: ${device.name}`
        });
      }

      return detectedSoftware.length;
    } catch (error) {
      console.error("Auto-scan failed:", error);
      return 0;
    }
  };

  // Create a new device
  app.post("/api/devices", async (req: Request, res: Response) => {
    try {
      const result = insertDeviceSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid device data", 
          errors: result.error.errors 
        });
      }
      
      const newDevice = await storage.createDevice(result.data);
      
      // Auto-scan for prohibited software when device is added
      let autoScanResults = 0;
      if (newDevice.status === 'Active') {
        autoScanResults = await performAutomaticScan(newDevice);
      }
      
      res.status(201).json({
        ...newDevice,
        autoScanTriggered: newDevice.status === 'Active',
        threatsDetected: autoScanResults
      });
    } catch (error) {
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
      
      // Create a partial schema for validation
      const partialSchema = insertDeviceSchema.partial();
      const result = partialSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid device data", 
          errors: result.error.errors 
        });
      }
      
      const updatedDevice = await storage.updateDevice(id, result.data);
      
      if (!updatedDevice) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(updatedDevice);
    } catch (error) {
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
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // PROHIBITED SOFTWARE ROUTES

  // Get all prohibited software
  app.get("/api/prohibited-software", async (req: Request, res: Response) => {
    try {
      const prohibitedSoftware = await storage.getProhibitedSoftware();
      res.json(prohibitedSoftware);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prohibited software" });
    }
  });

  // Get prohibited software by ID
  app.get("/api/prohibited-software/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid software ID" });
      }
      
      const software = await storage.getProhibitedSoftwareById(id);
      if (!software) {
        return res.status(404).json({ message: "Prohibited software not found" });
      }
      
      res.json(software);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prohibited software" });
    }
  });

  // Create new prohibited software
  app.post("/api/prohibited-software", async (req: Request, res: Response) => {
    try {
      const result = insertProhibitedSoftwareSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid prohibited software data", 
          errors: result.error.errors 
        });
      }
      
      const software = await storage.createProhibitedSoftware(result.data);
      res.status(201).json(software);
    } catch (error) {
      res.status(500).json({ message: "Failed to create prohibited software" });
    }
  });

  // Update prohibited software
  app.patch("/api/prohibited-software/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid software ID" });
      }
      
      const software = await storage.updateProhibitedSoftware(id, req.body);
      if (!software) {
        return res.status(404).json({ message: "Prohibited software not found" });
      }
      
      res.json(software);
    } catch (error) {
      res.status(500).json({ message: "Failed to update prohibited software" });
    }
  });

  // Delete prohibited software
  app.delete("/api/prohibited-software/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid software ID" });
      }
      
      const success = await storage.deleteProhibitedSoftware(id);
      if (!success) {
        return res.status(404).json({ message: "Prohibited software not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prohibited software" });
    }
  });

  // SOFTWARE DETECTION LOG ROUTES

  // Get all detection logs
  app.get("/api/detection-logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getSoftwareDetectionLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch detection logs" });
    }
  });

  // Get detection logs by device
  app.get("/api/detection-logs/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const logs = await storage.getSoftwareDetectionLogsByDevice(deviceId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch detection logs" });
    }
  });

  // Create detection log
  app.post("/api/detection-logs", async (req: Request, res: Response) => {
    try {
      const result = insertSoftwareDetectionLogSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid detection log data", 
          errors: result.error.errors 
        });
      }
      
      const log = await storage.createSoftwareDetectionLog(result.data);
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to create detection log" });
    }
  });

  // Update detection log status
  app.patch("/api/detection-logs/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid log ID" });
      }
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const log = await storage.updateSoftwareDetectionLogStatus(id, status);
      if (!log) {
        return res.status(404).json({ message: "Detection log not found" });
      }
      
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to update detection log status" });
    }
  });

  // SCAN RESULTS ROUTES

  // Get all scan results
  app.get("/api/scan-results", async (req: Request, res: Response) => {
    try {
      const results = await storage.getSoftwareScanResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scan results" });
    }
  });

  // Get scan results by device
  app.get("/api/scan-results/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }
      
      const results = await storage.getSoftwareScanResultsByDevice(deviceId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scan results" });
    }
  });

  // Create scan result
  app.post("/api/scan-results", async (req: Request, res: Response) => {
    try {
      const result = insertSoftwareScanResultsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid scan result data", 
          errors: result.error.errors 
        });
      }
      
      const scanResult = await storage.createSoftwareScanResult(result.data);
      res.status(201).json(scanResult);
    } catch (error) {
      res.status(500).json({ message: "Failed to create scan result" });
    }
  });

  // Get prohibited software summary for dashboard
  app.get("/api/prohibited-software-summary", async (req: Request, res: Response) => {
    try {
      const summary = await storage.getProhibitedSoftwareSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prohibited software summary" });
    }
  });

  // Simulate software scan on a device
  app.post("/api/scan-device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      // Simulate scanning process
      const prohibitedSoftwareList = await storage.getProhibitedSoftware();
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Simulate finding some prohibited software randomly
      const detectedSoftware = prohibitedSoftwareList.filter(() => Math.random() > 0.7);
      
      // Create scan result
      const scanResult = await storage.createSoftwareScanResult({
        deviceId,
        totalSoftwareFound: Math.floor(Math.random() * 50) + 20,
        prohibitedSoftwareCount: detectedSoftware.length,
        scanStatus: "Completed",
        scanDuration: Math.floor(Math.random() * 60) + 30
      });

      // Create detection logs for found software
      for (const software of detectedSoftware) {
        await storage.createSoftwareDetectionLog({
          deviceId,
          prohibitedSoftwareId: software.id,
          detectedVersion: "1.0.0",
          actionTaken: software.blockExecution ? "Blocked" : "Flagged",
          status: "Active",
          notes: `Detected during automated scan on ${device.name}`
        });
      }

      res.json({ 
        message: "Scan completed successfully", 
        scanResult,
        detectedCount: detectedSoftware.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to scan device" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
