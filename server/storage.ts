import { 
  users, 
  type User, 
  type InsertUser, 
  devices, 
  type Device, 
  type InsertDevice,
  prohibitedSoftware,
  type ProhibitedSoftware,
  type InsertProhibitedSoftware,
  softwareDetectionLog,
  type SoftwareDetectionLog,
  type InsertSoftwareDetectionLog,
  softwareScanResults,
  type SoftwareScanResults,
  type InsertSoftwareScanResults
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  
  // Prohibited Software operations
  getProhibitedSoftware(): Promise<ProhibitedSoftware[]>;
  getProhibitedSoftwareById(id: number): Promise<ProhibitedSoftware | undefined>;
  createProhibitedSoftware(software: InsertProhibitedSoftware): Promise<ProhibitedSoftware>;
  updateProhibitedSoftware(id: number, software: Partial<InsertProhibitedSoftware>): Promise<ProhibitedSoftware | undefined>;
  deleteProhibitedSoftware(id: number): Promise<boolean>;
  
  // Software Detection Log operations
  getSoftwareDetectionLogs(): Promise<SoftwareDetectionLog[]>;
  getSoftwareDetectionLogsByDevice(deviceId: number): Promise<SoftwareDetectionLog[]>;
  createSoftwareDetectionLog(log: InsertSoftwareDetectionLog): Promise<SoftwareDetectionLog>;
  updateSoftwareDetectionLogStatus(id: number, status: string): Promise<SoftwareDetectionLog | undefined>;
  
  // Software Scan Results operations
  getSoftwareScanResults(): Promise<SoftwareScanResults[]>;
  getSoftwareScanResultsByDevice(deviceId: number): Promise<SoftwareScanResults[]>;
  createSoftwareScanResult(result: InsertSoftwareScanResults): Promise<SoftwareScanResults>;
  getLatestScanByDevice(deviceId: number): Promise<SoftwareScanResults | undefined>;
  
  // Dashboard summary operations
  getProhibitedSoftwareSummary(): Promise<{
    totalProhibitedSoftware: number;
    totalDetections: number;
    activeThreats: number;
    devicesAffected: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const now = new Date();
    const [device] = await db
      .insert(devices)
      .values({ ...insertDevice, lastUpdated: now })
      .returning();
    return device;
  }

  async updateDevice(id: number, updatedDevice: Partial<InsertDevice>): Promise<Device | undefined> {
    const now = new Date();
    const [device] = await db
      .update(devices)
      .set({ ...updatedDevice, lastUpdated: now })
      .where(eq(devices.id, id))
      .returning();
    return device;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning({ id: devices.id });
    
    return result.length > 0;
  }

  // Method to initialize the database with sample data
  async initSampleDevices(): Promise<void> {
    const count = await db.select().from(devices);
    
    // Only initialize if no devices exist
    if (count.length === 0) {
      console.log("Initializing database with sample devices");
      const sampleDevices: InsertDevice[] = [
        // North America
        {
          name: "WS-001-DEV",
          model: "Dell XPS 8940",
          type: "Workstation",
          status: "Active",
          location: "Headquarters",
          ipAddress: "192.168.1.101",
          latitude: "37.7749",
          longitude: "-122.4194"
        },
        {
          name: "SRV-DB-001",
          model: "Dell PowerEdge R740",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "10.0.0.15",
          latitude: "37.7790",
          longitude: "-122.4200"
        },
        {
          name: "SRV-APP-002",
          model: "Dell PowerEdge R640",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "10.0.0.16",
          latitude: "37.7790",
          longitude: "-122.4200"
        },
        {
          name: "RTR-MAIN-001",
          model: "Cisco ASR 1000",
          type: "Router",
          status: "Inactive",
          location: "Data Center",
          ipAddress: "10.0.0.1",
          latitude: "37.7790",
          longitude: "-122.4200"
        },
        // Seattle, USA
        {
          name: "SRV-WEST-001",
          model: "HPE ProLiant DL380",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "10.1.0.10",
          latitude: "47.6062",
          longitude: "-122.3321"
        },
        // New York, USA
        {
          name: "RTR-EAST-001",
          model: "Cisco 8000 Series",
          type: "Router",
          status: "Active",
          location: "Branch Office",
          ipAddress: "10.2.0.1",
          latitude: "40.7128",
          longitude: "-74.0060"
        },
        // Europe - London, UK
        {
          name: "SRV-EU-001",
          model: "Dell PowerEdge R750",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "172.16.0.10",
          latitude: "51.5074",
          longitude: "-0.1278"
        },
        // Europe - Paris, France
        {
          name: "RTR-EU-002",
          model: "Juniper MX Series",
          type: "Router",
          status: "Active",
          location: "Branch Office",
          ipAddress: "172.16.1.1",
          latitude: "48.8566",
          longitude: "2.3522"
        },
        // Asia - Tokyo, Japan
        {
          name: "SRV-ASIA-001",
          model: "HPE Synergy 480",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "192.168.10.10",
          latitude: "35.6762",
          longitude: "139.6503"
        },
        // Asia - Singapore
        {
          name: "RTR-ASIA-002",
          model: "Cisco Catalyst 8300",
          type: "Router",
          status: "Maintenance",
          location: "Branch Office",
          ipAddress: "192.168.11.1",
          latitude: "1.3521",
          longitude: "103.8198"
        },
        // Australia - Sydney
        {
          name: "SRV-AUS-001",
          model: "Dell PowerEdge R650",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "192.168.12.10",
          latitude: "-33.8688",
          longitude: "151.2093"
        },
        // South America - Sao Paulo, Brazil
        {
          name: "RTR-BRAZ-001",
          model: "Cisco 4000 Series",
          type: "Router",
          status: "Active", 
          location: "Branch Office",
          ipAddress: "192.168.13.1",
          latitude: "-23.5505",
          longitude: "-46.6333"
        },
        // Africa - Johannesburg, South Africa
        {
          name: "SRV-AFR-001",
          model: "HPE ProLiant DL360",
          type: "Server",
          status: "Inactive",
          location: "Branch Office",
          ipAddress: "192.168.14.10",
          latitude: "-26.2041",
          longitude: "28.0473"
        },
        // Middle East - Dubai, UAE
        {
          name: "RTR-UAE-001",
          model: "Juniper SRX Series",
          type: "Router",
          status: "Active",
          location: "Branch Office",
          ipAddress: "192.168.15.1",
          latitude: "25.2048",
          longitude: "55.2708"
        },
        // India - Mumbai
        {
          name: "SRV-IND-001",
          model: "Dell PowerEdge R740",
          type: "Server",
          status: "Active",
          location: "Data Center",
          ipAddress: "192.168.16.10",
          latitude: "19.0760",
          longitude: "72.8777"
        }
      ];
      
      for (const device of sampleDevices) {
        await this.createDevice(device);
      }
    }
  }

  // Prohibited Software operations
  async getProhibitedSoftware(): Promise<ProhibitedSoftware[]> {
    return await db.select().from(prohibitedSoftware).orderBy(desc(prohibitedSoftware.createdAt));
  }

  async getProhibitedSoftwareById(id: number): Promise<ProhibitedSoftware | undefined> {
    const [software] = await db.select().from(prohibitedSoftware).where(eq(prohibitedSoftware.id, id));
    return software;
  }

  async createProhibitedSoftware(insertProhibitedSoftware: InsertProhibitedSoftware): Promise<ProhibitedSoftware> {
    const [software] = await db
      .insert(prohibitedSoftware)
      .values(insertProhibitedSoftware)
      .returning();
    return software;
  }

  async updateProhibitedSoftware(id: number, updateData: Partial<InsertProhibitedSoftware>): Promise<ProhibitedSoftware | undefined> {
    const [software] = await db
      .update(prohibitedSoftware)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(prohibitedSoftware.id, id))
      .returning();
    return software;
  }

  async deleteProhibitedSoftware(id: number): Promise<boolean> {
    const result = await db.delete(prohibitedSoftware).where(eq(prohibitedSoftware.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Software Detection Log operations
  async getSoftwareDetectionLogs(): Promise<SoftwareDetectionLog[]> {
    return await db.select().from(softwareDetectionLog).orderBy(desc(softwareDetectionLog.detectionDate));
  }

  async getSoftwareDetectionLogsByDevice(deviceId: number): Promise<SoftwareDetectionLog[]> {
    return await db.select().from(softwareDetectionLog)
      .where(eq(softwareDetectionLog.deviceId, deviceId))
      .orderBy(desc(softwareDetectionLog.detectionDate));
  }

  async createSoftwareDetectionLog(insertLog: InsertSoftwareDetectionLog): Promise<SoftwareDetectionLog> {
    const [log] = await db
      .insert(softwareDetectionLog)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateSoftwareDetectionLogStatus(id: number, status: string): Promise<SoftwareDetectionLog | undefined> {
    const [log] = await db
      .update(softwareDetectionLog)
      .set({ status })
      .where(eq(softwareDetectionLog.id, id))
      .returning();
    return log;
  }

  // Software Scan Results operations
  async getSoftwareScanResults(): Promise<SoftwareScanResults[]> {
    return await db.select().from(softwareScanResults).orderBy(desc(softwareScanResults.scanDate));
  }

  async getSoftwareScanResultsByDevice(deviceId: number): Promise<SoftwareScanResults[]> {
    return await db.select().from(softwareScanResults)
      .where(eq(softwareScanResults.deviceId, deviceId))
      .orderBy(desc(softwareScanResults.scanDate));
  }

  async createSoftwareScanResult(insertResult: InsertSoftwareScanResults): Promise<SoftwareScanResults> {
    const [result] = await db
      .insert(softwareScanResults)
      .values(insertResult)
      .returning();
    return result;
  }

  async getLatestScanByDevice(deviceId: number): Promise<SoftwareScanResults | undefined> {
    const [result] = await db.select().from(softwareScanResults)
      .where(eq(softwareScanResults.deviceId, deviceId))
      .orderBy(desc(softwareScanResults.scanDate))
      .limit(1);
    return result;
  }

  // Dashboard summary operations
  async getProhibitedSoftwareSummary(): Promise<{
    totalProhibitedSoftware: number;
    totalDetections: number;
    activeThreats: number;
    devicesAffected: number;
  }> {
    const [totalProhibitedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prohibitedSoftware);

    const [totalDetectionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(softwareDetectionLog);

    const [activeThreatsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(softwareDetectionLog)
      .where(eq(softwareDetectionLog.status, 'Active'));

    const [devicesAffectedResult] = await db
      .select({ count: sql<number>`count(distinct ${softwareDetectionLog.deviceId})` })
      .from(softwareDetectionLog)
      .where(eq(softwareDetectionLog.status, 'Active'));

    return {
      totalProhibitedSoftware: totalProhibitedResult?.count || 0,
      totalDetections: totalDetectionsResult?.count || 0,
      activeThreats: activeThreatsResult?.count || 0,
      devicesAffected: devicesAffectedResult?.count || 0,
    };
  }

  // Initialize sample prohibited software data
  async initSampleProhibitedSoftware(): Promise<void> {
    const existingSoftware = await this.getProhibitedSoftware();
    if (existingSoftware.length === 0) {
      const sampleProhibitedSoftware = [
        {
          name: "BitTorrent Client",
          description: "Peer-to-peer file sharing software that can be used for illegal downloads",
          executableName: "bittorrent.exe",
          category: "File Sharing",
          riskLevel: "High" as const,
          blockExecution: true,
          autoUninstall: false,
        },
        {
          name: "TeamViewer Personal",
          description: "Remote access software - unauthorized versions pose security risks",
          executableName: "teamviewer.exe",
          category: "Remote Access",
          riskLevel: "Medium" as const,
          blockExecution: true,
          autoUninstall: false,
        },
        {
          name: "Cryptocurrency Miner",
          description: "Bitcoin mining software that can degrade system performance",
          executableName: "cgminer.exe",
          category: "Mining Software",
          riskLevel: "Critical" as const,
          blockExecution: true,
          autoUninstall: true,
        },
        {
          name: "Keylogger Pro",
          description: "Potential malware - captures keyboard input",
          executableName: "keylogger.exe",
          category: "Security Risk",
          riskLevel: "Critical" as const,
          blockExecution: true,
          autoUninstall: true,
        },
        {
          name: "Unauthorized VPN",
          description: "VPN software not approved by IT department",
          executableName: "vpnclient.exe",
          category: "Network Tools",
          riskLevel: "Medium" as const,
          blockExecution: false,
          autoUninstall: false,
        }
      ];

      for (const software of sampleProhibitedSoftware) {
        await this.createProhibitedSoftware(software);
      }
    }
  }
}

export const storage = new DatabaseStorage();
