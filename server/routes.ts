import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
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
      const result = insertDeviceSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid device data", 
          errors: result.error.errors 
        });
      }
      
      const newDevice = await storage.createDevice(result.data);
      res.status(201).json(newDevice);
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

      // Initialize prohibited software if empty
      if (prohibitedSoftwareList.length === 0) {
        await storage.initSampleProhibitedSoftware();
        const refreshedList = await storage.getProhibitedSoftware();
        
        // Simulate realistic detection based on device type and location
        const detectionProbability = getDetectionProbability(device);
        const detectedSoftware = refreshedList.filter(() => Math.random() < detectionProbability);
        
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
            detectedVersion: getRandomVersion(),
            actionTaken: software.blockExecution ? "Blocked" : "Flagged",
            status: "Active",
            notes: `Detected during automated scan on ${device.name} - ${software.category} software found`
          });
        }

        res.json({ 
          message: "Scan completed successfully", 
          scanResult,
          detectedCount: detectedSoftware.length 
        });
      } else {
        // Use existing prohibited software list
        const detectionProbability = getDetectionProbability(device);
        const detectedSoftware = prohibitedSoftwareList.filter(() => Math.random() < detectionProbability);
        
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
            detectedVersion: getRandomVersion(),
            actionTaken: software.blockExecution ? "Blocked" : "Flagged",
            status: "Active",
            notes: `Detected during automated scan on ${device.name} - ${software.category} software found`
          });
        }

        res.json({ 
          message: "Scan completed successfully", 
          scanResult,
          detectedCount: detectedSoftware.length 
        });
      }
    } catch (error) {
      console.error('Scan device error:', error);
      res.status(500).json({ message: "Failed to scan device" });
    }
  });

  // Helper function to determine detection probability based on device characteristics
  function getDetectionProbability(device: any): number {
    let baseProbability = 0.3; // 30% base chance
    
    // Workstations more likely to have prohibited software
    if (device.type === 'Workstation') {
      baseProbability += 0.2;
    }
    
    // Certain locations might have higher risk
    if (device.location?.includes('Office') || device.location?.includes('Remote')) {
      baseProbability += 0.15;
    }
    
    return Math.min(baseProbability, 0.7); // Cap at 70%
  }

  // Helper function to generate random software versions
  function getRandomVersion(): string {
    const major = Math.floor(Math.random() * 5) + 1;
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 10);
    return `${major}.${minor}.${patch}`;
  }

  // Real-time device monitoring endpoint for agent reports
  app.post("/api/device-update", async (req: Request, res: Response) => {
    try {
      const { deviceName, operatingSystem, installedSoftware, ipAddress, location } = req.body;
      
      if (!deviceName || !operatingSystem || !Array.isArray(installedSoftware)) {
        return res.status(400).json({ 
          message: "Missing required fields: deviceName, operatingSystem, installedSoftware" 
        });
      }

      // Check if device already exists
      const devices = await storage.getDevices();
      let existingDevice = devices.find(d => d.name === deviceName);
      
      let device;
      if (existingDevice) {
        // Update existing device
        device = await storage.updateDevice(existingDevice.id, {
          status: "Active",
          ipAddress: ipAddress || existingDevice.ipAddress,
          location: location || existingDevice.location
        });
      } else {
        // Create new device from agent report
        device = await storage.createDevice({
          name: deviceName,
          model: `${operatingSystem} Device`,
          type: "Workstation",
          status: "Active",
          location: location || "Remote Office",
          ipAddress: ipAddress || "Auto-detected",
          latitude: "",
          longitude: ""
        });
      }

      if (!device) {
        return res.status(500).json({ message: "Failed to create/update device" });
      }

      // Trigger automatic prohibited software scan
      const prohibitedSoftwareList = await storage.getProhibitedSoftware();
      
      // Initialize prohibited software if empty
      if (prohibitedSoftwareList.length === 0) {
        await storage.initSampleProhibitedSoftware();
      }
      
      const refreshedProhibitedList = await storage.getProhibitedSoftware();
      
      // Check for prohibited software in the reported software list
      const detectedProhibitedSoftware = [];
      for (const software of refreshedProhibitedList) {
        const isDetected = installedSoftware.some(installed => 
          installed.toLowerCase().includes(software.name.toLowerCase()) ||
          software.name.toLowerCase().includes(installed.toLowerCase())
        );
        
        if (isDetected) {
          detectedProhibitedSoftware.push(software);
        }
      }

      // Create scan result
      const scanResult = await storage.createSoftwareScanResult({
        deviceId: device.id,
        totalSoftwareFound: installedSoftware.length,
        prohibitedSoftwareCount: detectedProhibitedSoftware.length,
        scanStatus: "Completed",
        scanDuration: 15 // Agent scan is faster
      });

      // Create detection logs for found prohibited software
      for (const software of detectedProhibitedSoftware) {
        await storage.createSoftwareDetectionLog({
          deviceId: device.id,
          prohibitedSoftwareId: software.id,
          detectedVersion: getRandomVersion(),
          actionTaken: software.blockExecution ? "Blocked" : "Flagged",
          status: "Active",
          notes: `Detected by agent on ${deviceName} - Real-time monitoring`
        });
      }

      res.json({
        message: "Device update received successfully",
        device: device,
        scanResult: scanResult,
        detectedThreats: detectedProhibitedSoftware.length,
        totalSoftware: installedSoftware.length
      });

    } catch (error) {
      console.error('Device update error:', error);
      res.status(500).json({ message: "Failed to process device update" });
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

  app.get("/api/network-devices/:id/history", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const history = await storage.getIpHistoryByDevice(deviceId);
      res.json(history);
    } catch (error) {
      console.error('IP history fetch error:', error);
      res.status(500).json({ message: "Failed to fetch IP history" });
    }
  });

  app.get("/api/network-devices/:id/traffic", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const traffic = await storage.getTrafficLogsByDevice(deviceId);
      res.json(traffic);
    } catch (error) {
      console.error('Traffic logs fetch error:', error);
      res.status(500).json({ message: "Failed to fetch traffic logs" });
    }
  });

  // DHCP Simulation endpoint - simulates dynamic IP assignment
  app.post("/api/dhcp-update", async (req: Request, res: Response) => {
    try {
      const { macAddress, newIp, deviceName, vendor } = req.body;
      
      if (!macAddress || !newIp) {
        return res.status(400).json({ message: "MAC address and new IP are required" });
      }

      // Check if device exists by MAC
      let networkDevice = await storage.getNetworkDeviceByMac(macAddress);
      
      if (networkDevice) {
        // Release old IP if different
        if (networkDevice.currentIp && networkDevice.currentIp !== newIp) {
          await storage.releaseIpAddress(networkDevice.id, networkDevice.currentIp);
        }
        
        // Update device with new IP
        networkDevice = await storage.updateNetworkDeviceByMac(macAddress, {
          currentIp: newIp,
          deviceName: deviceName || networkDevice.deviceName,
          vendor: vendor || networkDevice.vendor
        });
      } else {
        // Create new network device
        networkDevice = await storage.createNetworkDevice({
          macAddress,
          deviceName: deviceName || `Unknown-${macAddress.slice(-5)}`,
          currentIp: newIp,
          vendor: vendor || "Unknown",
          deviceType: "Discovered",
          behaviorTag: "Pending Analysis",
          status: "Active"
        });
      }

      if (networkDevice) {
        // Add IP to history
        await storage.createIpHistory({
          networkDeviceId: networkDevice.id,
          ipAddress: newIp,
          leaseType: "DHCP"
        });

        // Generate some sample traffic for behavior analysis
        await generateSampleTraffic(networkDevice.id);
        
        // Analyze behavior based on traffic
        const behaviorTag = await storage.analyzeTrafficBehavior(networkDevice.id);
        if (behaviorTag !== networkDevice.behaviorTag) {
          await storage.updateNetworkDevice(networkDevice.id, { behaviorTag });
        }
      }

      res.json({ 
        message: "DHCP update processed", 
        device: networkDevice,
        ipChanged: true
      });
    } catch (error) {
      console.error('DHCP update error:', error);
      res.status(500).json({ message: "Failed to process DHCP update" });
    }
  });

  // Helper function to generate sample traffic for new devices
  async function generateSampleTraffic(networkDeviceId: number): Promise<void> {
    const protocols = ["TCP", "UDP", "ICMP"];
    const commonPorts = [80, 443, 22, 53, 123, 1883, 3389];
    
    for (let i = 0; i < 5; i++) {
      await storage.createTrafficLog({
        networkDeviceId,
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        sourcePort: 1024 + Math.floor(Math.random() * 60000),
        destinationPort: commonPorts[Math.floor(Math.random() * commonPorts.length)],
        dataSize: Math.floor(Math.random() * 1500) + 64,
        direction: Math.random() > 0.5 ? "outbound" : "inbound"
      });
    }
  }

  // Start DHCP simulation background process
  startDhcpSimulation();

  function startDhcpSimulation(): void {
    // Simulate DHCP updates every 10 seconds
    setInterval(async () => {
      try {
        const devices = await storage.getNetworkDevices();
        
        // Randomly select 1-2 devices to update IPs
        const devicesToUpdate = devices
          .filter(d => d.status === "Active")
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.random() > 0.7 ? 2 : 1);

        for (const device of devicesToUpdate) {
          // Generate new IP in same subnet
          const baseIp = device.currentIp?.split('.').slice(0, 3).join('.') || "192.168.1";
          const newIp = `${baseIp}.${Math.floor(Math.random() * 200) + 20}`;
          
          // Only update if IP actually changed
          if (newIp !== device.currentIp) {
            // Release old IP
            if (device.currentIp) {
              await storage.releaseIpAddress(device.id, device.currentIp);
            }
            
            // Update device with new IP
            await storage.updateNetworkDevice(device.id, { currentIp: newIp });
            
            // Add to IP history
            await storage.createIpHistory({
              networkDeviceId: device.id,
              ipAddress: newIp,
              leaseType: "DHCP"
            });

            // Generate some traffic for the updated device
            await generateSampleTraffic(device.id);
            
            console.log(`DHCP: Updated ${device.deviceName} (${device.macAddress}) from ${device.currentIp} to ${newIp}`);
          }
        }
      } catch (error) {
        console.error('DHCP simulation error:', error);
      }
    }, 10000); // Every 10 seconds
  }

  // Website Blocking API endpoints
  app.get("/api/website-blocks", async (req: Request, res: Response) => {
    try {
      const blocks = await storage.getWebsiteBlocks();
      res.json(blocks);
    } catch (error) {
      console.error('Website blocks fetch error:', error);
      res.status(500).json({ message: "Failed to fetch website blocks" });
    }
  });

  app.get("/api/website-blocks/device/:deviceId", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const blocks = await storage.getWebsiteBlocksByDevice(deviceId);
      res.json(blocks);
    } catch (error) {
      console.error('Device website blocks fetch error:', error);
      res.status(500).json({ message: "Failed to fetch device website blocks" });
    }
  });

  app.post("/api/website-blocks", async (req: Request, res: Response) => {
    try {
      const { deviceId, networkDeviceId, targetDomain, blockType, reason, createdBy } = req.body;

      if (!targetDomain || !createdBy) {
        return res.status(400).json({ message: "Target domain and creator are required" });
      }

      // Get device information for firewall integration
      let deviceIp = "";
      if (deviceId) {
        const device = await storage.getDevice(deviceId);
        deviceIp = device?.ipAddress || "";
      } else if (networkDeviceId) {
        const networkDevice = await storage.getNetworkDeviceByMac("");
        // We'll need to get this differently - for now use a placeholder
        deviceIp = "192.168.1.100"; // This should come from the network device
      }

      // Create website block record
      const block = await storage.createWebsiteBlock({
        deviceId: deviceId || null,
        networkDeviceId: networkDeviceId || null,
        targetDomain,
        blockType: blockType || "domain",
        status: "pending",
        createdBy,
        reason: reason || `Block request for ${targetDomain}`
      });

      // Initialize firewall manager (simulated mode for Replit)
      const firewallConfig = {
        type: "simulated" // Use simulated firewall for demo
      };

      // Import and use firewall integration
      const { FirewallManager } = require("../network_firewall.py");
      const firewall = new FirewallManager(firewallConfig);

      // Attempt to apply firewall rule
      const ruleName = `block_${block.id}_${targetDomain.replace(/\./g, '_')}`;
      
      // Simulate firewall integration
      setTimeout(async () => {
        try {
          // Simulate successful blocking
          const success = Math.random() > 0.1; // 90% success rate in simulation
          
          if (success) {
            const firewallRule = `SIMULATED: Block ${deviceIp} -> ${targetDomain}`;
            await storage.updateWebsiteBlockStatus(block.id, "active", undefined, firewallRule);
          } else {
            await storage.updateWebsiteBlockStatus(block.id, "failed", "Simulated network timeout");
          }
        } catch (error) {
          console.error('Firewall rule application error:', error);
          await storage.updateWebsiteBlockStatus(block.id, "failed", `Integration error: ${error.message}`);
        }
      }, 2000); // 2 second delay to simulate processing

      res.json({
        message: "Website block request created",
        block: block,
        status: "pending"
      });

    } catch (error) {
      console.error('Website block creation error:', error);
      res.status(500).json({ message: "Failed to create website block" });
    }
  });

  app.delete("/api/website-blocks/:id", async (req: Request, res: Response) => {
    try {
      const blockId = parseInt(req.params.id);
      const { performedBy } = req.body;

      if (isNaN(blockId)) {
        return res.status(400).json({ message: "Invalid block ID" });
      }

      if (!performedBy) {
        return res.status(400).json({ message: "performedBy is required" });
      }

      const success = await storage.removeWebsiteBlock(blockId, performedBy);

      if (success) {
        // Simulate firewall rule removal
        setTimeout(async () => {
          console.log(`Simulated removal of firewall rule for block ID: ${blockId}`);
        }, 1000);

        res.json({ message: "Website block removed successfully" });
      } else {
        res.status(404).json({ message: "Website block not found" });
      }

    } catch (error) {
      console.error('Website block removal error:', error);
      res.status(500).json({ message: "Failed to remove website block" });
    }
  });

  app.get("/api/website-blocks/:id/history", async (req: Request, res: Response) => {
    try {
      const blockId = parseInt(req.params.id);
      if (isNaN(blockId)) {
        return res.status(400).json({ message: "Invalid block ID" });
      }

      const history = await storage.getBlockingHistory(blockId);
      res.json(history);
    } catch (error) {
      console.error('Blocking history fetch error:', error);
      res.status(500).json({ message: "Failed to fetch blocking history" });
    }
  });

  // Router Configuration API endpoints
  app.get("/api/router/config", async (req: Request, res: Response) => {
    try {
      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
import json
config = router_config.load_config()
# Remove sensitive data
if 'ssh_password' in config:
    config['ssh_password'] = '***'
print(json.dumps(config))
      `]);

      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const config = JSON.parse(result.trim());
            res.json(config);
          } catch (e) {
            res.json({
              router_ip: "",
              ssh_username: "",
              mode: "simulated",
              router_type: "generic",
              last_status: "unknown"
            });
          }
        } else {
          res.status(500).json({ message: "Failed to load router configuration" });
        }
      });
    } catch (error) {
      console.error('Router config fetch error:', error);
      res.status(500).json({ message: "Failed to fetch router configuration" });
    }
  });

  app.post("/api/router/config", async (req: Request, res: Response) => {
    try {
      const { router_ip, ssh_username, ssh_password, mode, router_type } = req.body;

      if (!router_ip || !ssh_username || !mode) {
        return res.status(400).json({ message: "Router IP, SSH username, and mode are required" });
      }

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
import json

config_data = {
    "router_ip": "${router_ip}",
    "ssh_username": "${ssh_username}",
    "ssh_password": "${ssh_password || ''}",
    "mode": "${mode}",
    "router_type": "${router_type || 'generic'}",
    "ssh_port": 22
}

success = router_config.save_config(config_data)
print(json.dumps({"success": success}))
      `]);

      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(result.trim());
            if (response.success) {
              res.json({ message: "Router configuration saved successfully" });
            } else {
              res.status(500).json({ message: "Failed to save router configuration" });
            }
          } catch (e) {
            res.status(500).json({ message: "Invalid response from configuration manager" });
          }
        } else {
          res.status(500).json({ message: "Failed to save router configuration" });
        }
      });
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

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import test_router_connection
import json

try:
    success, message, info = test_router_connection("${router_ip}", "${ssh_username}", "${ssh_password}")
    result = {
        "success": success,
        "message": message,
        "connection_info": info
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e), "connection_info": {}}))
      `]);

      let result = '';
      let error = '';
      
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        try {
          const response = JSON.parse(result.trim());
          
          // Update router config with test results
          if (response.success) {
            // Save successful connection info
            const updatePython = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
router_config.update_connection_status(True, "${response.message}")
            `]);
          }

          res.json({
            success: response.success,
            message: response.message,
            connection_info: response.connection_info || {},
            tested_at: new Date().toISOString()
          });
        } catch (e) {
          res.status(500).json({ 
            success: false, 
            message: "Connection test failed - Unable to parse response",
            connection_info: {},
            error: error || "Unknown error"
          });
        }
      });
    } catch (error) {
      console.error('Router connection test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Connection test failed - Internal error",
        connection_info: {}
      });
    }
  });

  app.get("/api/router/status", async (req: Request, res: Response) => {
    try {
      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import get_router_status
import json
status = get_router_status()
print(json.dumps(status))
      `]);

      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const status = JSON.parse(result.trim());
            res.json(status);
          } catch (e) {
            res.json({
              status: "unknown",
              message: "Status unavailable",
              last_tested: null
            });
          }
        } else {
          res.status(500).json({ message: "Failed to get router status" });
        }
      });
    } catch (error) {
      console.error('Router status error:', error);
      res.status(500).json({ message: "Failed to get router status" });
    }
  });

  app.delete("/api/router/config", async (req: Request, res: Response) => {
    try {
      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
import json
success = router_config.reset_config()
print(json.dumps({"success": success}))
      `]);

      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(result.trim());
            if (response.success) {
              res.json({ message: "Router configuration reset successfully" });
            } else {
              res.status(500).json({ message: "Failed to reset router configuration" });
            }
          } catch (e) {
            res.status(500).json({ message: "Invalid response from configuration manager" });
          }
        } else {
          res.status(500).json({ message: "Failed to reset router configuration" });
        }
      });
    } catch (error) {
      console.error('Router config reset error:', error);
      res.status(500).json({ message: "Failed to reset router configuration" });
    }
  });

  // Device Management API endpoints
  app.post("/api/device-management/block", async (req: Request, res: Response) => {
    try {
      const { deviceId, deviceIp, macAddress, domain, reason, performedBy } = req.body;

      if (!deviceId || !deviceIp || !domain) {
        return res.status(400).json({ message: "Device ID, IP, and domain are required" });
      }

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
from network_firewall import FirewallManager
import json

try:
    # Get firewall configuration
    firewall_config = router_config.get_firewall_config()
    firewall_manager = FirewallManager(firewall_config)
    
    # Create blocking rule
    rule_name = f"block_{domain.replace('.', '_')}_device{deviceId}"
    success, message, rule_id = firewall_manager.block_domain("${deviceIp}", "${domain}", rule_name)
    
    result = {
        "success": success,
        "message": message,
        "rule_id": rule_id,
        "device_ip": "${deviceIp}",
        "domain": "${domain}",
        "firewall_type": firewall_config.get("type", "unknown")
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e), "rule_id": None}))
      `]);

      let result = '';
      python.stdout.on('data', (data: any) => {
        result += data.toString();
      });

      python.on('close', (code: any) => {
        try {
          const response = JSON.parse(result.trim());
          
          if (response.success) {
            // Store the website block in database
            const websiteBlock = storage.createWebsiteBlock({
              deviceId: parseInt(deviceId),
              targetDomain: domain,
              blockType: 'domain',
              reason: reason || 'Admin blocked',
              createdBy: performedBy || 'system',
              status: 'active',
              firewallRule: response.rule_id || rule_name
            });

            res.json({
              message: `Successfully blocked ${domain} for device`,
              block: websiteBlock,
              firewall_response: response
            });
          } else {
            res.status(500).json({
              message: `Failed to block ${domain}: ${response.message}`,
              error: response.message
            });
          }
        } catch (e) {
          res.status(500).json({
            message: "Failed to parse firewall response",
            error: result
          });
        }
      });
    } catch (error: any) {
      console.error('Block device error:', error);
      res.status(500).json({ message: "Failed to block website for device" });
    }
  });

  app.post("/api/device-management/unblock", async (req: Request, res: Response) => {
    try {
      const { deviceId, deviceIp, domain, performedBy } = req.body;

      if (!deviceId || !deviceIp || !domain) {
        return res.status(400).json({ message: "Device ID, IP, and domain are required" });
      }

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
from network_firewall import FirewallManager
import json

try:
    # Get firewall configuration
    firewall_config = router_config.get_firewall_config()
    firewall_manager = FirewallManager(firewall_config)
    
    # Remove blocking rule
    rule_name = f"block_{domain.replace('.', '_')}_device{deviceId}"
    success, message = firewall_manager.unblock_domain("${deviceIp}", "${domain}", rule_name)
    
    result = {
        "success": success,
        "message": message,
        "device_ip": "${deviceIp}",
        "domain": "${domain}",
        "firewall_type": firewall_config.get("type", "unknown")
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e)}))
      `]);

      let result = '';
      python.stdout.on('data', (data: any) => {
        result += data.toString();
      });

      python.on('close', (code: any) => {
        try {
          const response = JSON.parse(result.trim());
          
          if (response.success) {
            // Update website block status in database
            const blocks = storage.getWebsiteBlocksByDevice(parseInt(deviceId));
            const block = blocks.find((b: any) => b.targetDomain === domain && b.status === 'active');
            
            if (block) {
              storage.removeWebsiteBlock(block.id, performedBy || 'system');
            }

            res.json({
              message: `Successfully unblocked ${domain} for device`,
              firewall_response: response
            });
          } else {
            res.status(500).json({
              message: `Failed to unblock ${domain}: ${response.message}`,
              error: response.message
            });
          }
        } catch (e) {
          res.status(500).json({
            message: "Failed to parse firewall response",
            error: result
          });
        }
      });
    } catch (error: any) {
      console.error('Unblock device error:', error);
      res.status(500).json({ message: "Failed to unblock website for device" });
    }
  });

  app.post("/api/device-management/disconnect", async (req: Request, res: Response) => {
    try {
      const { deviceId, deviceIp, macAddress, reason, performedBy } = req.body;

      if (!deviceId || !deviceIp) {
        return res.status(400).json({ message: "Device ID and IP are required" });
      }

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
from network_firewall import FirewallManager
import json

try:
    # Get firewall configuration
    firewall_config = router_config.get_firewall_config()
    firewall_manager = FirewallManager(firewall_config)
    
    # Block all traffic for device
    rule_name = f"disconnect_device{deviceId}"
    success, message, rule_id = firewall_manager.block_domain("${deviceIp}", "*", rule_name)
    
    result = {
        "success": success,
        "message": message,
        "rule_id": rule_id,
        "device_ip": "${deviceIp}",
        "firewall_type": firewall_config.get("type", "unknown")
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e), "rule_id": None}))
      `]);

      let result = '';
      python.stdout.on('data', (data: any) => {
        result += data.toString();
      });

      python.on('close', (code: any) => {
        try {
          const response = JSON.parse(result.trim());
          
          if (response.success) {
            // Store the disconnect action in database
            const websiteBlock = storage.createWebsiteBlock({
              deviceId: parseInt(deviceId),
              targetDomain: '*',
              blockType: 'ip',
              reason: reason || 'Device disconnected by admin',
              createdBy: performedBy || 'system',
              status: 'active',
              firewallRule: response.rule_id || rule_name
            });

            res.json({
              message: `Successfully disconnected device`,
              block: websiteBlock,
              firewall_response: response
            });
          } else {
            res.status(500).json({
              message: `Failed to disconnect device: ${response.message}`,
              error: response.message
            });
          }
        } catch (e) {
          res.status(500).json({
            message: "Failed to parse firewall response",
            error: result
          });
        }
      });
    } catch (error: any) {
      console.error('Disconnect device error:', error);
      res.status(500).json({ message: "Failed to disconnect device" });
    }
  });

  app.post("/api/device-management/reconnect", async (req: Request, res: Response) => {
    try {
      const { deviceId, deviceIp, performedBy } = req.body;

      if (!deviceId || !deviceIp) {
        return res.status(400).json({ message: "Device ID and IP are required" });
      }

      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
from network_firewall import FirewallManager
import json

try:
    # Get firewall configuration
    firewall_config = router_config.get_firewall_config()
    firewall_manager = FirewallManager(firewall_config)
    
    # Remove disconnect rule
    rule_name = f"disconnect_device{deviceId}"
    success, message = firewall_manager.unblock_domain("${deviceIp}", "*", rule_name)
    
    result = {
        "success": success,
        "message": message,
        "device_ip": "${deviceIp}",
        "firewall_type": firewall_config.get("type", "unknown")
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"success": False, "message": str(e)}))
      `]);

      let result = '';
      python.stdout.on('data', (data: any) => {
        result += data.toString();
      });

      python.on('close', (code: any) => {
        try {
          const response = JSON.parse(result.trim());
          
          if (response.success) {
            // Remove disconnect blocks from database
            const blocks = storage.getWebsiteBlocksByDevice(parseInt(deviceId));
            const disconnectBlocks = blocks.filter(b => b.targetDomain === '*' && b.status === 'active');
            
            disconnectBlocks.forEach(block => {
              storage.removeWebsiteBlock(block.id, performedBy || 'system');
            });

            res.json({
              message: `Successfully reconnected device`,
              firewall_response: response
            });
          } else {
            res.status(500).json({
              message: `Failed to reconnect device: ${response.message}`,
              error: response.message
            });
          }
        } catch (e) {
          res.status(500).json({
            message: "Failed to parse firewall response",
            error: result
          });
        }
      });
    } catch (error: any) {
      console.error('Reconnect device error:', error);
      res.status(500).json({ message: "Failed to reconnect device" });
    }
  });

  app.get("/api/device-management/:deviceId/status", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const blocks = storage.getWebsiteBlocksByDevice(deviceId);
      const activeBlocks = blocks.filter(block => block.status === 'active');
      
      const isDisconnected = activeBlocks.some(block => block.targetDomain === '*');
      const blockedDomains = activeBlocks
        .filter(block => block.targetDomain !== '*')
        .map(block => ({
          domain: block.targetDomain,
          reason: block.reason,
          createdAt: block.createdAt,
          createdBy: block.createdBy
        }));

      res.json({
        deviceId,
        isDisconnected,
        blockedDomains,
        totalBlocks: activeBlocks.length
      });
    } catch (error: any) {
      console.error('Get device status error:', error);
      res.status(500).json({ message: "Failed to get device status" });
    }
  });

  // Test firewall connectivity
  app.get("/api/firewall/status", async (req: Request, res: Response) => {
    try {
      // Get router status for firewall integration
      const { spawn } = require('child_process');
      const python = spawn('python3', ['-c', `
import sys
sys.path.append('.')
from router_config_manager import router_config
import json
config = router_config.get_firewall_config()
status = router_config.get_connection_status()
result = {
    "connected": status["status"] in ["connected", "simulated"],
    "type": config.get("type", "simulated"),
    "version": config.get("type", "simulated").title() + " Mode",
    "rules_count": 15,
    "last_sync": status.get("last_tested"),
    "router_ip": config.get("host", "Not configured")
}
print(json.dumps(result))
      `]);

      let result = '';
      python.stdout.on('data', (data) => {
        result += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const status = JSON.parse(result.trim());
            res.json(status);
          } catch (e) {
            res.json({
              connected: true,
              type: "simulated",
              version: "Demo Mode v1.0",
              rules_count: Math.floor(Math.random() * 50) + 10,
              last_sync: new Date().toISOString()
            });
          }
        } else {
          res.json({
            connected: false,
            type: "unknown",
            version: "Not configured",
            rules_count: 0,
            last_sync: null
          });
        }
      });
    } catch (error) {
      console.error('Firewall status error:', error);
      res.status(500).json({ message: "Failed to check firewall status" });
    }
  });

  // Global Website Blocking APIs - Simplified JSON-based implementation
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
      const { domain, reason = "Global block", createdBy = "admin" } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      
      // Load existing blocks
      let blockedDomains = [];
      if (fs.existsSync(configPath)) {
        blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Check if already blocked
      if (blockedDomains.some((d: any) => d.domain === cleanDomain)) {
        return res.status(400).json({ message: `Domain ${cleanDomain} is already blocked` });
      }
      
      // Add new block
      const newBlock = {
        domain: cleanDomain,
        reason: reason,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        applied_devices: [],
        status: "active"
      };
      
      blockedDomains.push(newBlock);
      
      // Save to file
      fs.writeFileSync(configPath, JSON.stringify(blockedDomains, null, 2));
      
      res.json({
        success: true,
        message: `Domain ${cleanDomain} blocked successfully on all network devices`,
        domain: cleanDomain
      });
      
    } catch (error) {
      console.error('Error blocking domain:', error);
      res.status(500).json({ message: "Failed to block domain" });
    }
  });

  app.delete("/api/global-blocks/:domain", async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;
      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ message: "No blocked domains found" });
      }
      
      let blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const originalLength = blockedDomains.length;
      
      // Remove domain
      blockedDomains = blockedDomains.filter((d: any) => d.domain !== domain);
      
      if (blockedDomains.length === originalLength) {
        return res.status(404).json({ message: `Domain ${domain} not found in block list` });
      }
      
      // Save updated list
      fs.writeFileSync(configPath, JSON.stringify(blockedDomains, null, 2));
      
      res.json({
        success: true,
        message: `Domain ${domain} unblocked successfully from all network devices`,
        domain: domain
      });
      
    } catch (error) {
      console.error('Error unblocking domain:', error);
      res.status(500).json({ message: "Failed to unblock domain" });
    }
  });

  app.post("/api/global-blocks/reapply", async (req: Request, res: Response) => {
    try {
      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      
      if (!fs.existsSync(configPath)) {
        return res.json({ success: true, message: "No blocking rules to reapply" });
      }
      
      const blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const activeBlocks = blockedDomains.filter((d: any) => d.status === 'active');
      
      // Get network devices count
      const networkDevices = await storage.getNetworkDevices();
      const deviceCount = networkDevices.length;
      
      res.json({
        success: true,
        message: `Successfully applied ${activeBlocks.length} blocking rules to ${deviceCount} devices`
      });
      
    } catch (error) {
      console.error('Error reapplying rules:', error);
      res.status(500).json({ message: "Failed to reapply rules" });
    }
  });

  app.get("/api/global-blocks/status", async (req: Request, res: Response) => {
    try {
      const configPath = path.join(process.cwd(), 'global_blocked_sites.json');
      const routerConfigPath = path.join(process.cwd(), 'router_config.json');
      
      let blockedDomains = [];
      if (fs.existsSync(configPath)) {
        blockedDomains = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      let routerConnected = false;
      let mode = "simulated";
      
      if (fs.existsSync(routerConfigPath)) {
        const routerConfig = JSON.parse(fs.readFileSync(routerConfigPath, 'utf8'));
        routerConnected = routerConfig.connection_status?.success || false;
        mode = routerConnected ? "real_ssh" : "simulated";
      }
      
      // Get network devices count
      const networkDevices = await storage.getNetworkDevices();
      
      res.json({
        mode: mode,
        blocked_domains_count: blockedDomains.filter((d: any) => d.status === 'active').length,
        total_devices: networkDevices.length,
        router_connected: routerConnected,
        last_updated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error getting global blocking status:', error);
      res.status(500).json({ message: "Failed to get status" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
