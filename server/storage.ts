import { 
  users, 
  type User, 
  type InsertUser,
  userManagement,
  type UserManagement,
  type InsertUserManagement, 
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
  type InsertSoftwareScanResults,
  networkDevices,
  type NetworkDevice,
  type InsertNetworkDevice,
  ipHistory,
  type IpHistory,
  type InsertIpHistory,
  trafficLogs,
  type TrafficLog,
  type InsertTrafficLog,
  websiteBlocks,
  type WebsiteBlock,
  type InsertWebsiteBlock,
  blockingHistory,
  type BlockingHistory,
  type InsertBlockingHistory,
  tickets,
  type Ticket,
  type InsertTicket,
  notificationHistory,
  type NotificationHistory,
  type InsertNotificationHistory,
  pendingDevices,
  type PendingDevice,
  type InsertPendingDevice,
  cmdbConfigurationItems,
  type CmdbConfigurationItem,
  type InsertCmdbConfigurationItem,
  cmdbChangeRecords,
  type CmdbChangeRecord,
  type InsertCmdbChangeRecord,
  cmdbRelationships,
  type CmdbRelationship,
  type InsertCmdbRelationship,
  cmdbComplianceRules,
  type CmdbComplianceRule,
  type InsertCmdbComplianceRule,
  alerts,
  type Alert,
  type InsertAlert,
  alertHistory,
  type AlertHistory,
  type InsertAlertHistory,
  alertTemplates,
  type AlertTemplate,
  type InsertAlertTemplate,
  assetLifecycle,
  type SelectAssetLifecycle,
  type InsertAssetLifecycle
} from "@shared/schema";
import { db } from "./db";
import { emailService } from "./email-service";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User Management operations
  getUserManagementUsers(): Promise<UserManagement[]>;
  getUserManagementUser(id: number): Promise<UserManagement | undefined>;
  createUserManagementUser(user: InsertUserManagement): Promise<UserManagement>;
  updateUserManagementUser(id: number, user: Partial<InsertUserManagement>): Promise<UserManagement | undefined>;
  deleteUserManagementUser(id: number): Promise<boolean>;
  getUserManagementUserByEmail(email: string): Promise<UserManagement | undefined>;
  
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByName(name: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  updateDeviceWarranty(id: number, warrantyData: Partial<InsertDevice>): Promise<Device | undefined>;
  
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

  // Network Discovery operations
  getNetworkDevices(): Promise<NetworkDevice[]>;
  getNetworkDeviceByMac(macAddress: string): Promise<NetworkDevice | undefined>;
  createNetworkDevice(device: InsertNetworkDevice): Promise<NetworkDevice>;
  updateNetworkDevice(id: number, device: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined>;
  updateNetworkDeviceByMac(macAddress: string, updates: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined>;
  
  // IP History operations
  getIpHistoryByDevice(networkDeviceId: number): Promise<IpHistory[]>;
  createIpHistory(entry: InsertIpHistory): Promise<IpHistory>;
  releaseIpAddress(networkDeviceId: number, ipAddress: string): Promise<void>;
  
  // Traffic Logs operations
  getTrafficLogsByDevice(networkDeviceId: number): Promise<TrafficLog[]>;
  createTrafficLog(log: InsertTrafficLog): Promise<TrafficLog>;
  analyzeTrafficBehavior(networkDeviceId: number): Promise<string>;

  // Website Blocking operations
  getWebsiteBlocks(): Promise<WebsiteBlock[]>;
  getWebsiteBlocksByDevice(deviceId: number): Promise<WebsiteBlock[]>;
  getWebsiteBlocksByNetworkDevice(networkDeviceId: number): Promise<WebsiteBlock[]>;
  createWebsiteBlock(block: InsertWebsiteBlock): Promise<WebsiteBlock>;
  updateWebsiteBlockStatus(id: number, status: string, errorMessage?: string, firewallRule?: string): Promise<WebsiteBlock | undefined>;
  removeWebsiteBlock(id: number, performedBy: string): Promise<boolean>;
  
  // Blocking History operations
  getBlockingHistory(websiteBlockId: number): Promise<BlockingHistory[]>;
  createBlockingHistoryEntry(entry: InsertBlockingHistory): Promise<BlockingHistory>;
  
  // Ticket operations
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketsByDevice(deviceId: number): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, ticket: Partial<InsertTicket>): Promise<Ticket | undefined>;
  closeTicket(id: number, resolvedBy: string, notes?: string): Promise<Ticket | undefined>;
  
  // Auto-ticket generation
  generateAutoTicket(deviceId: number, triggerEvent: string, oldStatus?: string, newStatus?: string): Promise<Ticket | undefined>;

  // Notification History operations
  getNotificationHistory(): Promise<NotificationHistory[]>;
  createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory>;
  updateNotificationAction(id: number, action: string): Promise<NotificationHistory | undefined>;
  
  // Pending Device operations
  getPendingDevices(): Promise<PendingDevice[]>;
  getPendingDevice(id: number): Promise<PendingDevice | undefined>;
  createPendingDevice(device: InsertPendingDevice): Promise<PendingDevice>;
  approvePendingDevice(id: number): Promise<Device | undefined>;
  rejectPendingDevice(id: number): Promise<boolean>;

  // CMDB Configuration Item operations
  getCmdbConfigurationItems(): Promise<CmdbConfigurationItem[]>;
  getCmdbConfigurationItem(id: number): Promise<CmdbConfigurationItem | undefined>;
  getCmdbConfigurationItemsByDevice(deviceId: number): Promise<CmdbConfigurationItem[]>;
  createCmdbConfigurationItem(item: InsertCmdbConfigurationItem): Promise<CmdbConfigurationItem>;
  updateCmdbConfigurationItem(id: number, item: Partial<InsertCmdbConfigurationItem>): Promise<CmdbConfigurationItem | undefined>;
  deleteCmdbConfigurationItem(id: number): Promise<boolean>;

  // CMDB Change Record operations
  getCmdbChangeRecords(): Promise<CmdbChangeRecord[]>;
  getCmdbChangeRecordsByConfigurationItem(configurationItemId: number): Promise<CmdbChangeRecord[]>;
  createCmdbChangeRecord(record: InsertCmdbChangeRecord): Promise<CmdbChangeRecord>;
  updateCmdbChangeRecord(id: number, record: Partial<InsertCmdbChangeRecord>): Promise<CmdbChangeRecord | undefined>;

  // CMDB Relationship operations
  getCmdbRelationships(): Promise<CmdbRelationship[]>;
  getCmdbRelationshipsByConfigurationItem(configurationItemId: number): Promise<CmdbRelationship[]>;
  createCmdbRelationship(relationship: InsertCmdbRelationship): Promise<CmdbRelationship>;
  deleteCmdbRelationship(id: number): Promise<boolean>;

  // CMDB Compliance Rule operations
  getCmdbComplianceRules(): Promise<CmdbComplianceRule[]>;
  getCmdbComplianceRule(id: number): Promise<CmdbComplianceRule | undefined>;
  createCmdbComplianceRule(rule: InsertCmdbComplianceRule): Promise<CmdbComplianceRule>;
  updateCmdbComplianceRule(id: number, rule: Partial<InsertCmdbComplianceRule>): Promise<CmdbComplianceRule | undefined>;
  deleteCmdbComplianceRule(id: number): Promise<boolean>;

  // Alert Management operations
  getAlerts(): Promise<Alert[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  getAlertsByDevice(deviceId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  updateAlertStatus(id: number, status: string, actionBy: string, notes?: string): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;

  // Alert History operations
  getAlertHistory(alertId: number): Promise<AlertHistory[]>;
  createAlertHistory(history: InsertAlertHistory): Promise<AlertHistory>;

  // Alert Template operations
  getAlertTemplates(): Promise<AlertTemplate[]>;
  getAlertTemplate(id: number): Promise<AlertTemplate | undefined>;
  createAlertTemplate(template: InsertAlertTemplate): Promise<AlertTemplate>;
  updateAlertTemplate(id: number, template: Partial<InsertAlertTemplate>): Promise<AlertTemplate | undefined>;
  deleteAlertTemplate(id: number): Promise<boolean>;
  
  // Asset Lifecycle operations
  getAssetLifecycles(): Promise<SelectAssetLifecycle[]>;
  getAssetLifecycle(id: number): Promise<SelectAssetLifecycle | undefined>;
  getAssetLifecycleByDeviceId(deviceId: number): Promise<SelectAssetLifecycle | undefined>;
  createAssetLifecycle(lifecycle: InsertAssetLifecycle): Promise<SelectAssetLifecycle>;
  updateAssetLifecycle(id: number, lifecycle: Partial<InsertAssetLifecycle>): Promise<SelectAssetLifecycle | undefined>;
  deleteAssetLifecycle(id: number): Promise<boolean>;
  getAssetsNearRetirement(daysThreshold: number): Promise<SelectAssetLifecycle[]>;
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

  // User Management operations
  async getUserManagementUsers(): Promise<UserManagement[]> {
    return await db.select().from(userManagement).orderBy(desc(userManagement.createdAt));
  }

  async getUserManagementUser(id: number): Promise<UserManagement | undefined> {
    const [user] = await db.select().from(userManagement).where(eq(userManagement.id, id));
    return user;
  }

  async createUserManagementUser(insertUser: InsertUserManagement): Promise<UserManagement> {
    const [user] = await db
      .insert(userManagement)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserManagementUser(id: number, updatedUser: Partial<InsertUserManagement>): Promise<UserManagement | undefined> {
    const [user] = await db
      .update(userManagement)
      .set({ ...updatedUser, updatedAt: new Date() })
      .where(eq(userManagement.id, id))
      .returning();
    return user;
  }

  async deleteUserManagementUser(id: number): Promise<boolean> {
    const result = await db.delete(userManagement).where(eq(userManagement.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUserManagementUserByEmail(email: string): Promise<UserManagement | undefined> {
    const [user] = await db.select().from(userManagement).where(eq(userManagement.email, email));
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
    
    // If coordinates are default/generic, assign better ones
    if (insertDevice.latitude === '37.7749' && insertDevice.longitude === '-122.4194') {
      const coordinates = this.assignRealisticCoordinates(
        insertDevice.type,
        insertDevice.location || 'Agent-Reported',
        insertDevice.name
      );
      insertDevice.latitude = coordinates.latitude;
      insertDevice.longitude = coordinates.longitude;
    }
    
    const [device] = await db
      .insert(devices)
      .values({ ...insertDevice, lastUpdated: now })
      .returning();
    return device;
  }

  async updateDevice(id: number, updatedDevice: Partial<InsertDevice>): Promise<Device | undefined> {
    // Get current device state before update
    const currentDevice = await this.getDevice(id);
    const oldStatus = currentDevice?.status;

    const now = new Date();
    const [device] = await db
      .update(devices)
      .set({ ...updatedDevice, lastUpdated: now })
      .where(eq(devices.id, id))
      .returning();

    // Check if status changed and generate auto-ticket if needed
    if (device && updatedDevice.status && oldStatus !== updatedDevice.status) {
      await this.generateAutoTicket(
        id, 
        `status_change_${updatedDevice.status.toLowerCase()}`,
        oldStatus,
        updatedDevice.status
      );
    }

    return device;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning({ id: devices.id });
    
    return result.length > 0;
  }

  async getDeviceByName(name: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.name, name));
    return device;
  }

  async updateDeviceWarranty(id: number, warrantyData: Partial<InsertDevice>): Promise<Device | undefined> {
    const now = new Date();
    const [device] = await db
      .update(devices)
      .set({ ...warrantyData, lastUpdated: now })
      .where(eq(devices.id, id))
      .returning();
    
    return device;
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

  // Network Discovery operations
  async getNetworkDevices(): Promise<NetworkDevice[]> {
    return await db.select().from(networkDevices).orderBy(desc(networkDevices.lastSeen));
  }

  async getNetworkDeviceByMac(macAddress: string): Promise<NetworkDevice | undefined> {
    const [device] = await db.select().from(networkDevices).where(eq(networkDevices.macAddress, macAddress));
    return device;
  }

  async createNetworkDevice(insertDevice: InsertNetworkDevice): Promise<NetworkDevice> {
    const [device] = await db.insert(networkDevices).values(insertDevice).returning();
    return device;
  }

  async updateNetworkDevice(id: number, updates: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined> {
    const [device] = await db.update(networkDevices)
      .set({ ...updates, lastSeen: new Date() })
      .where(eq(networkDevices.id, id))
      .returning();
    return device;
  }

  async updateNetworkDeviceByMac(macAddress: string, updates: Partial<InsertNetworkDevice>): Promise<NetworkDevice | undefined> {
    const [device] = await db.update(networkDevices)
      .set({ ...updates, lastSeen: new Date() })
      .where(eq(networkDevices.macAddress, macAddress))
      .returning();
    return device;
  }

  // IP History operations
  async getIpHistoryByDevice(networkDeviceId: number): Promise<IpHistory[]> {
    return await db.select().from(ipHistory)
      .where(eq(ipHistory.networkDeviceId, networkDeviceId))
      .orderBy(desc(ipHistory.assignedAt));
  }

  async createIpHistory(entry: InsertIpHistory): Promise<IpHistory> {
    const [historyEntry] = await db.insert(ipHistory).values(entry).returning();
    return historyEntry;
  }

  async releaseIpAddress(networkDeviceId: number, ipAddress: string): Promise<void> {
    await db.update(ipHistory)
      .set({ releasedAt: new Date() })
      .where(and(
        eq(ipHistory.networkDeviceId, networkDeviceId),
        eq(ipHistory.ipAddress, ipAddress)
      ));
  }

  // Traffic Logs operations
  async getTrafficLogsByDevice(networkDeviceId: number): Promise<TrafficLog[]> {
    return await db.select().from(trafficLogs)
      .where(eq(trafficLogs.networkDeviceId, networkDeviceId))
      .orderBy(desc(trafficLogs.timestamp))
      .limit(100);
  }

  async createTrafficLog(log: InsertTrafficLog): Promise<TrafficLog> {
    const [trafficLog] = await db.insert(trafficLogs).values(log).returning();
    return trafficLog;
  }

  async analyzeTrafficBehavior(networkDeviceId: number): Promise<string> {
    const logs = await this.getTrafficLogsByDevice(networkDeviceId);
    
    // Analyze traffic patterns to determine behavior
    const protocolCounts = logs.reduce((acc, log) => {
      acc[log.protocol] = (acc[log.protocol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const portCounts = logs.reduce((acc, log) => {
      if (log.destinationPort) {
        acc[log.destinationPort] = (acc[log.destinationPort] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Behavior analysis logic
    if (portCounts[22] > 5) return "Linux Admin Device";
    if (portCounts[3389] > 3) return "Windows Remote Access";
    if (portCounts[1883] > 10 || portCounts[8883] > 5) return "IoT MQTT Device";
    if (portCounts[80] > 20 || portCounts[443] > 20) return "Web Client";
    if (portCounts[21] > 2 || portCounts[22] > 2) return "Server Device";
    if (protocolCounts["UDP"] > protocolCounts["TCP"]) return "IoT Sensor";
    if (logs.length > 50) return "High Activity Device";
    
    return "Standard Device";
  }

  // Initialize network discovery with sample devices
  async initNetworkDiscovery(): Promise<void> {
    const existingDevices = await this.getNetworkDevices();
    if (existingDevices.length === 0) {
      const sampleNetworkDevices = [
        {
          macAddress: "00:1B:44:11:3A:B7",
          deviceName: "LAPTOP-ADMIN01",
          currentIp: "192.168.1.45",
          vendor: "Dell Inc.",
          deviceType: "Laptop",
          behaviorTag: "Linux Admin Device",
          status: "Active"
        },
        {
          macAddress: "A4:C3:F0:85:AC:2D",
          deviceName: "IOT-SENSOR-01",
          currentIp: "192.168.1.156",
          vendor: "Raspberry Pi Foundation",
          deviceType: "IoT Device",
          behaviorTag: "IoT MQTT Device",
          status: "Active"
        },
        {
          macAddress: "B8:27:EB:A6:12:34",
          deviceName: "OFFICE-PRINTER",
          currentIp: "192.168.1.78",
          vendor: "HP Inc.",
          deviceType: "Printer",
          behaviorTag: "Network Printer",
          status: "Active"
        },
        {
          macAddress: "DC:A6:32:1F:B9:45",
          deviceName: "SECURITY-CAM-01",
          currentIp: "192.168.1.201",
          vendor: "Hikvision",
          deviceType: "Security Camera",
          behaviorTag: "IoT Sensor",
          status: "Active"
        }
      ];

      for (const device of sampleNetworkDevices) {
        const networkDevice = await this.createNetworkDevice(device);
        
        // Create initial IP history
        await this.createIpHistory({
          networkDeviceId: networkDevice.id,
          ipAddress: device.currentIp,
          leaseType: "DHCP"
        });

        // Create sample traffic logs
        await this.generateSampleTrafficLogs(networkDevice.id, device.behaviorTag);
      }
    }
  }

  private async generateSampleTrafficLogs(networkDeviceId: number, behaviorTag: string): Promise<void> {
    const protocols = ["TCP", "UDP", "ICMP"];
    const logs: InsertTrafficLog[] = [];

    // Generate traffic based on behavior tag
    for (let i = 0; i < 20; i++) {
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      let destinationPort: number | undefined;
      
      // Generate realistic ports based on behavior
      if (behaviorTag === "Linux Admin Device") {
        destinationPort = [22, 80, 443, 3000][Math.floor(Math.random() * 4)];
      } else if (behaviorTag === "IoT MQTT Device") {
        destinationPort = [1883, 8883, 80, 443][Math.floor(Math.random() * 4)];
      } else if (behaviorTag === "Windows Remote Access") {
        destinationPort = [3389, 80, 443, 445][Math.floor(Math.random() * 4)];
      } else {
        destinationPort = [80, 443, 53, 123][Math.floor(Math.random() * 4)];
      }

      logs.push({
        networkDeviceId,
        protocol,
        sourcePort: 1024 + Math.floor(Math.random() * 60000),
        destinationPort,
        dataSize: Math.floor(Math.random() * 1500) + 64,
        direction: Math.random() > 0.5 ? "outbound" : "inbound"
      });
    }

    for (const log of logs) {
      await this.createTrafficLog(log);
    }
  }

  // Website Blocking operations
  async getWebsiteBlocks(): Promise<WebsiteBlock[]> {
    return await db.select().from(websiteBlocks).orderBy(desc(websiteBlocks.createdAt));
  }

  async getWebsiteBlocksByDevice(deviceId: number): Promise<WebsiteBlock[]> {
    return await db.select().from(websiteBlocks)
      .where(eq(websiteBlocks.deviceId, deviceId))
      .orderBy(desc(websiteBlocks.createdAt));
  }

  async getWebsiteBlocksByNetworkDevice(networkDeviceId: number): Promise<WebsiteBlock[]> {
    return await db.select().from(websiteBlocks)
      .where(eq(websiteBlocks.networkDeviceId, networkDeviceId))
      .orderBy(desc(websiteBlocks.createdAt));
  }

  async createWebsiteBlock(insertBlock: InsertWebsiteBlock): Promise<WebsiteBlock> {
    const [block] = await db.insert(websiteBlocks).values(insertBlock).returning();
    
    // Create history entry
    await this.createBlockingHistoryEntry({
      websiteBlockId: block.id,
      action: "created",
      details: `Block request created for ${block.targetDomain}`,
      performedBy: block.createdBy
    });

    return block;
  }

  async updateWebsiteBlockStatus(id: number, status: string, errorMessage?: string, firewallRule?: string): Promise<WebsiteBlock | undefined> {
    const updateData: any = { status };
    
    if (status === "active") {
      updateData.activatedAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    if (firewallRule) {
      updateData.firewallRule = firewallRule;
    }

    const [block] = await db.update(websiteBlocks)
      .set(updateData)
      .where(eq(websiteBlocks.id, id))
      .returning();

    if (block) {
      // Create history entry
      await this.createBlockingHistoryEntry({
        websiteBlockId: id,
        action: status,
        details: errorMessage || `Status updated to ${status}`,
        performedBy: "system"
      });
    }

    return block;
  }

  async removeWebsiteBlock(id: number, performedBy: string): Promise<boolean> {
    const [block] = await db.update(websiteBlocks)
      .set({ status: "removed" })
      .where(eq(websiteBlocks.id, id))
      .returning();

    if (block) {
      // Create history entry
      await this.createBlockingHistoryEntry({
        websiteBlockId: id,
        action: "removed",
        details: `Block removed for ${block.targetDomain}`,
        performedBy
      });
      return true;
    }

    return false;
  }

  // Blocking History operations
  async getBlockingHistory(websiteBlockId: number): Promise<BlockingHistory[]> {
    return await db.select().from(blockingHistory)
      .where(eq(blockingHistory.websiteBlockId, websiteBlockId))
      .orderBy(desc(blockingHistory.timestamp));
  }

  async createBlockingHistoryEntry(entry: InsertBlockingHistory): Promise<BlockingHistory> {
    const [historyEntry] = await db.insert(blockingHistory).values(entry).returning();
    return historyEntry;
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

  // Ticket operations
  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async getTicketsByDevice(deviceId: number): Promise<Ticket[]> {
    return await db.select().from(tickets)
      .where(eq(tickets.deviceId, deviceId))
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values([ticket]).returning();
    return newTicket;
  }

  async updateTicket(id: number, ticket: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [updatedTicket] = await db.update(tickets)
      .set({ ...ticket, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updatedTicket;
  }

  async closeTicket(id: number, resolvedBy: string, notes?: string): Promise<Ticket | undefined> {
    const [closedTicket] = await db.update(tickets)
      .set({ 
        status: "Resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
        notes: notes || undefined
      })
      .where(eq(tickets.id, id))
      .returning();
    return closedTicket;
  }

  // Generate ticket number in format: TKT-YYYY-NNNN
  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `TKT-${year}-${random}`;
  }

  // Extract brand name from device model for email routing
  private extractBrandFromDeviceModel(model: string): string {
    const modelLower = model.toLowerCase();
    
    // Common brand patterns in device models
    const brandPatterns = [
      'hp', 'dell', 'apple', 'mac', 'macbook', 'lenovo', 'asus', 'acer',
      'microsoft', 'surface', 'samsung', 'lg', 'sony', 'toshiba', 'fujitsu',
      'huawei', 'xiaomi', 'redmi', 'mi', 'intel', 'cisco', 'netgear',
      'linksys', 'tp-link'
    ];
    
    for (const brand of brandPatterns) {
      if (modelLower.includes(brand)) {
        return brand;
      }
    }
    
    // Try to extract from the first word
    const firstWord = modelLower.split(' ')[0];
    if (brandPatterns.includes(firstWord)) {
      return firstWord;
    }
    
    return 'unknown';
  }

  // Auto-ticket generation based on device status changes
  async generateAutoTicket(deviceId: number, triggerEvent: string, oldStatus?: string, newStatus?: string): Promise<Ticket | undefined> {
    const device = await this.getDevice(deviceId);
    if (!device) return undefined;

    // Only generate tickets for problematic statuses
    const problematicStatuses = ['Inactive', 'Damage', 'Abnormal'];
    if (!newStatus || !problematicStatuses.includes(newStatus)) {
      return undefined;
    }

    // Check if there's already an open ticket for this device with the same issue
    const existingTickets = await db.select().from(tickets)
      .where(and(
        eq(tickets.deviceId, deviceId),
        eq(tickets.status, "Open"),
        eq(tickets.triggerEvent, triggerEvent)
      ));

    if (existingTickets.length > 0) {
      // Don't create duplicate tickets
      return undefined;
    }

    // Determine ticket details based on status
    let title: string;
    let description: string;
    let priority: "Low" | "Medium" | "High" | "Critical";
    let category: "Hardware" | "Software" | "Network" | "Security";

    switch (newStatus) {
      case 'Damage':
        title = `Hardware Damage Detected - ${device.name}`;
        description = `Device ${device.name} (${device.model}) has been marked as damaged. Immediate attention required for hardware assessment and potential replacement.`;
        priority = "High";
        category = "Hardware";
        break;
      case 'Inactive':
        title = `Device Inactive - ${device.name}`;
        description = `Device ${device.name} (${device.model}) has become inactive. This may indicate connectivity issues, power problems, or system failure.`;
        priority = "Medium";
        category = "Hardware";
        break;
      case 'Abnormal':
        title = `Abnormal Behavior Detected - ${device.name}`;
        description = `Device ${device.name} (${device.model}) is exhibiting abnormal behavior. Investigation needed to identify root cause and restore normal operation.`;
        priority = "High";
        category = "Security";
        break;
      default:
        return undefined;
    }

    const ticketData: InsertTicket = {
      ticketNumber: this.generateTicketNumber(),
      title,
      description,
      priority,
      status: "Open",
      category,
      deviceId,
      createdBy: "System",
      isAutoGenerated: true,
      triggerEvent,
      notes: oldStatus ? `Status changed from '${oldStatus}' to '${newStatus}'` : undefined
    };

    const createdTicket = await this.createTicket(ticketData);
    
    // Send email notification for auto-generated tickets only
    if (createdTicket && createdTicket.isAutoGenerated) {
      try {
        const emailData = {
          ticketNumber: createdTicket.ticketNumber,
          deviceName: device.name,
          deviceModel: device.model,
          deviceBrand: this.extractBrandFromDeviceModel(device.model),
          issueType: newStatus.toLowerCase() as 'damage' | 'inactive' | 'abnormal',
          timestamp: new Date().toISOString(),
          serialNumber: undefined // Add serial number if available in device data
        };

        // Send email notification asynchronously
        emailService.sendDeviceNotification(emailData).catch(error => {
          console.error(`📧 Failed to send email notification for ticket ${createdTicket.ticketNumber}:`, error);
        });
        
        console.log(`📧 Email notification queued for ticket ${createdTicket.ticketNumber} (${device.name} - ${newStatus})`);
      } catch (error) {
        console.error(`📧 Error preparing email notification for ticket ${createdTicket.ticketNumber}:`, error);
      }
    }

    return createdTicket;
  }

  // Notification History operations
  async getNotificationHistory(): Promise<NotificationHistory[]> {
    return await db.select().from(notificationHistory).orderBy(desc(notificationHistory.timestamp));
  }

  async createNotificationHistory(notification: InsertNotificationHistory): Promise<NotificationHistory> {
    const [created] = await db
      .insert(notificationHistory)
      .values(notification)
      .returning();
    return created;
  }

  async updateNotificationAction(id: number, action: string): Promise<NotificationHistory | undefined> {
    const [updated] = await db
      .update(notificationHistory)
      .set({ 
        action, 
        actionTimestamp: new Date() 
      })
      .where(eq(notificationHistory.id, id))
      .returning();
    return updated;
  }

  // Pending Device operations
  async getPendingDevices(): Promise<PendingDevice[]> {
    return await db.select().from(pendingDevices).orderBy(desc(pendingDevices.createdAt));
  }

  async getPendingDevice(id: number): Promise<PendingDevice | undefined> {
    const [device] = await db.select().from(pendingDevices).where(eq(pendingDevices.id, id));
    return device;
  }

  async createPendingDevice(device: InsertPendingDevice): Promise<PendingDevice> {
    const [created] = await db
      .insert(pendingDevices)
      .values(device)
      .returning();
    return created;
  }

  async approvePendingDevice(id: number): Promise<Device | undefined> {
    const pendingDevice = await this.getPendingDevice(id);
    if (!pendingDevice) return undefined;

    // Assign better geographic coordinates based on device type and location
    const coordinates = this.assignRealisticCoordinates(
      pendingDevice.type,
      pendingDevice.location,
      pendingDevice.name
    );

    // Create actual device from pending device
    const deviceData: InsertDevice = {
      name: pendingDevice.name,
      model: pendingDevice.model,
      type: pendingDevice.type,
      status: pendingDevice.status,
      location: pendingDevice.location,
      ipAddress: pendingDevice.ipAddress,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };

    const createdDevice = await this.createDevice(deviceData);

    // Mark pending device as approved
    await db
      .update(pendingDevices)
      .set({ 
        isApproved: true,
        approvedAt: new Date()
      })
      .where(eq(pendingDevices.id, id));

    return createdDevice;
  }

  async rejectPendingDevice(id: number): Promise<boolean> {
    const result = await db
      .update(pendingDevices)
      .set({ 
        isRejected: true,
        rejectedAt: new Date()
      })
      .where(eq(pendingDevices.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Assign realistic coordinates based on device type and location
  public assignRealisticCoordinates(
    deviceType: string,
    location: string,
    deviceName: string
  ): { latitude: string; longitude: string } {
    // Define location clusters for different types of devices
    const locationClusters = {
      // Chennai office locations
      'Agent-Reported': {
        'Workstation': [
          { lat: 13.0470, lng: 80.2574, name: 'Office Floor 1' },
          { lat: 13.0475, lng: 80.2580, name: 'Office Floor 2' },
          { lat: 13.0480, lng: 80.2585, name: 'Office Floor 3' },
          { lat: 13.0485, lng: 80.2590, name: 'Development Wing' },
          { lat: 13.0490, lng: 80.2595, name: 'Admin Wing' }
        ],
        'Server': [
          { lat: 13.0465, lng: 80.2570, name: 'Data Center' },
          { lat: 13.0467, lng: 80.2572, name: 'Server Room' },
          { lat: 13.0469, lng: 80.2574, name: 'Backup Center' }
        ],
        'Mobile Device': [
          { lat: 13.0475, lng: 80.2580, name: 'Mobile Devices' },
          { lat: 13.0480, lng: 80.2585, name: 'Executive Area' },
          { lat: 13.0485, lng: 80.2590, name: 'Meeting Rooms' }
        ]
      },
      // Auto-discovered network devices
      'Auto-Discovered': {
        'Workstation': [
          { lat: 13.0500, lng: 80.2600, name: 'Parking Area' },
          { lat: 13.0505, lng: 80.2605, name: 'Reception Area' },
          { lat: 13.0510, lng: 80.2610, name: 'Warehouse Entry' },
          { lat: 13.0515, lng: 80.2615, name: 'Loading Dock' },
          { lat: 13.0520, lng: 80.2620, name: 'Security Office' }
        ],
        'Network Device': [
          { lat: 13.0525, lng: 80.2625, name: 'Network Closet 1' },
          { lat: 13.0530, lng: 80.2630, name: 'Network Closet 2' },
          { lat: 13.0535, lng: 80.2635, name: 'Main Switch Room' }
        ],
        'Security Camera': [
          { lat: 13.0540, lng: 80.2640, name: 'Entrance Camera' },
          { lat: 13.0545, lng: 80.2645, name: 'Lobby Camera' },
          { lat: 13.0550, lng: 80.2650, name: 'Parking Camera' }
        ]
      }
    };

    // Get appropriate cluster based on location and device type
    const locationCluster = locationClusters[location as keyof typeof locationClusters];
    if (!locationCluster) {
      // Default to Chennai center if no cluster found
      return {
        latitude: '13.0827',
        longitude: '80.2707'
      };
    }

    // Determine device category for clustering
    let deviceCategory = 'Workstation';
    if (deviceType.toLowerCase().includes('server')) {
      deviceCategory = 'Server';
    } else if (deviceType.toLowerCase().includes('mobile') || deviceType.toLowerCase().includes('phone')) {
      deviceCategory = 'Mobile Device';
    } else if (deviceType.toLowerCase().includes('network') || deviceType.toLowerCase().includes('router') || deviceType.toLowerCase().includes('switch')) {
      deviceCategory = 'Network Device';
    } else if (deviceType.toLowerCase().includes('camera')) {
      deviceCategory = 'Security Camera';
    }

    // Get locations for this device category
    const locations = locationCluster[deviceCategory as keyof typeof locationCluster] || locationCluster['Workstation'];
    
    // Use device name to consistently assign the same location
    const locationIndex = Math.abs(deviceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % locations.length;
    const selectedLocation = locations[locationIndex];

    // Add small random offset to avoid exact overlap
    const latOffset = (Math.random() - 0.5) * 0.002; // ~200m radius
    const lngOffset = (Math.random() - 0.5) * 0.002;

    return {
      latitude: (selectedLocation.lat + latOffset).toFixed(6),
      longitude: (selectedLocation.lng + lngOffset).toFixed(6)
    };
  }

  // CMDB Configuration Item operations
  async getCmdbConfigurationItems(): Promise<CmdbConfigurationItem[]> {
    return await db.select().from(cmdbConfigurationItems).orderBy(desc(cmdbConfigurationItems.createdAt));
  }

  async getCmdbConfigurationItem(id: number): Promise<CmdbConfigurationItem | undefined> {
    const [item] = await db.select().from(cmdbConfigurationItems).where(eq(cmdbConfigurationItems.id, id));
    return item;
  }

  async getCmdbConfigurationItemsByDevice(deviceId: number): Promise<CmdbConfigurationItem[]> {
    return await db.select().from(cmdbConfigurationItems).where(eq(cmdbConfigurationItems.deviceId, deviceId));
  }

  async createCmdbConfigurationItem(item: InsertCmdbConfigurationItem): Promise<CmdbConfigurationItem> {
    const [newItem] = await db.insert(cmdbConfigurationItems).values(item).returning();
    return newItem;
  }

  async updateCmdbConfigurationItem(id: number, item: Partial<InsertCmdbConfigurationItem>): Promise<CmdbConfigurationItem | undefined> {
    const [updatedItem] = await db.update(cmdbConfigurationItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(cmdbConfigurationItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteCmdbConfigurationItem(id: number): Promise<boolean> {
    const result = await db.delete(cmdbConfigurationItems).where(eq(cmdbConfigurationItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // CMDB Change Record operations
  async getCmdbChangeRecords(): Promise<CmdbChangeRecord[]> {
    return await db.select().from(cmdbChangeRecords).orderBy(desc(cmdbChangeRecords.createdAt));
  }

  async getCmdbChangeRecordsByConfigurationItem(configurationItemId: number): Promise<CmdbChangeRecord[]> {
    return await db.select().from(cmdbChangeRecords)
      .where(eq(cmdbChangeRecords.configurationItemId, configurationItemId))
      .orderBy(desc(cmdbChangeRecords.createdAt));
  }

  async createCmdbChangeRecord(record: InsertCmdbChangeRecord): Promise<CmdbChangeRecord> {
    const [newRecord] = await db.insert(cmdbChangeRecords).values(record).returning();
    return newRecord;
  }

  async updateCmdbChangeRecord(id: number, record: Partial<InsertCmdbChangeRecord>): Promise<CmdbChangeRecord | undefined> {
    const [updatedRecord] = await db.update(cmdbChangeRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(cmdbChangeRecords.id, id))
      .returning();
    return updatedRecord;
  }

  // CMDB Relationship operations
  async getCmdbRelationships(): Promise<CmdbRelationship[]> {
    return await db.select().from(cmdbRelationships).orderBy(desc(cmdbRelationships.createdAt));
  }

  async getCmdbRelationshipsByConfigurationItem(configurationItemId: number): Promise<CmdbRelationship[]> {
    return await db.select().from(cmdbRelationships)
      .where(
        sql`${cmdbRelationships.sourceConfigurationItemId} = ${configurationItemId} OR ${cmdbRelationships.targetConfigurationItemId} = ${configurationItemId}`
      )
      .orderBy(desc(cmdbRelationships.createdAt));
  }

  async createCmdbRelationship(relationship: InsertCmdbRelationship): Promise<CmdbRelationship> {
    const [newRelationship] = await db.insert(cmdbRelationships).values(relationship).returning();
    return newRelationship;
  }

  async deleteCmdbRelationship(id: number): Promise<boolean> {
    const result = await db.delete(cmdbRelationships).where(eq(cmdbRelationships.id, id));
    return (result.rowCount || 0) > 0;
  }

  // CMDB Compliance Rule operations
  async getCmdbComplianceRules(): Promise<CmdbComplianceRule[]> {
    return await db.select().from(cmdbComplianceRules).orderBy(desc(cmdbComplianceRules.createdAt));
  }

  async getCmdbComplianceRule(id: number): Promise<CmdbComplianceRule | undefined> {
    const [rule] = await db.select().from(cmdbComplianceRules).where(eq(cmdbComplianceRules.id, id));
    return rule;
  }

  async createCmdbComplianceRule(rule: InsertCmdbComplianceRule): Promise<CmdbComplianceRule> {
    const [newRule] = await db.insert(cmdbComplianceRules).values(rule).returning();
    return newRule;
  }

  async updateCmdbComplianceRule(id: number, rule: Partial<InsertCmdbComplianceRule>): Promise<CmdbComplianceRule | undefined> {
    const [updatedRule] = await db.update(cmdbComplianceRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(cmdbComplianceRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteCmdbComplianceRule(id: number): Promise<boolean> {
    const result = await db.delete(cmdbComplianceRules).where(eq(cmdbComplianceRules.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Alert Management operations
  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.alertDate));
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async getAlertsByDevice(deviceId: number): Promise<Alert[]> {
    return await db.select().from(alerts)
      .where(eq(alerts.deviceId, deviceId))
      .orderBy(desc(alerts.alertDate));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    
    // Create alert history entry
    await this.createAlertHistory({
      alertId: newAlert.id,
      action: 'created',
      actionBy: 'system',
      notes: `Alert created: ${newAlert.alertTitle}`
    });
    
    return newAlert;
  }

  async updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined> {
    const [updatedAlert] = await db.update(alerts)
      .set({ ...alert, updatedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async updateAlertStatus(id: number, status: string, actionBy: string, notes?: string): Promise<Alert | undefined> {
    const now = new Date();
    const updateData: any = { status, updatedAt: now };
    
    if (status === 'Acknowledged') {
      updateData.acknowledgedBy = actionBy;
      updateData.acknowledgedAt = now;
    } else if (status === 'Resolved') {
      updateData.resolvedBy = actionBy;
      updateData.resolvedAt = now;
    }
    
    const [updatedAlert] = await db.update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();
    
    if (updatedAlert) {
      // Create alert history entry
      await this.createAlertHistory({
        alertId: id,
        action: status.toLowerCase(),
        actionBy,
        notes: notes || `Alert ${status.toLowerCase()}`
      });
    }
    
    return updatedAlert;
  }

  async deleteAlert(id: number): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Alert History operations
  async getAlertHistory(alertId: number): Promise<AlertHistory[]> {
    return await db.select().from(alertHistory)
      .where(eq(alertHistory.alertId, alertId))
      .orderBy(desc(alertHistory.actionDate));
  }

  async createAlertHistory(history: InsertAlertHistory): Promise<AlertHistory> {
    const [newHistory] = await db.insert(alertHistory).values(history).returning();
    return newHistory;
  }

  // Alert Template operations
  async getAlertTemplates(): Promise<AlertTemplate[]> {
    return await db.select().from(alertTemplates)
      .where(eq(alertTemplates.isActive, true))
      .orderBy(desc(alertTemplates.createdAt));
  }

  async getAlertTemplate(id: number): Promise<AlertTemplate | undefined> {
    const [template] = await db.select().from(alertTemplates).where(eq(alertTemplates.id, id));
    return template;
  }

  async createAlertTemplate(template: InsertAlertTemplate): Promise<AlertTemplate> {
    const [newTemplate] = await db.insert(alertTemplates).values(template).returning();
    return newTemplate;
  }

  async updateAlertTemplate(id: number, template: Partial<InsertAlertTemplate>): Promise<AlertTemplate | undefined> {
    const [updatedTemplate] = await db.update(alertTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(alertTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteAlertTemplate(id: number): Promise<boolean> {
    const result = await db.delete(alertTemplates).where(eq(alertTemplates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Asset Lifecycle operations
  async getAssetLifecycles(): Promise<SelectAssetLifecycle[]> {
    return await db.select().from(assetLifecycle).orderBy(desc(assetLifecycle.createdAt));
  }

  async getAssetLifecycle(id: number): Promise<SelectAssetLifecycle | undefined> {
    const [lifecycle] = await db.select().from(assetLifecycle).where(eq(assetLifecycle.id, id));
    return lifecycle;
  }

  async getAssetLifecycleByDeviceId(deviceId: number): Promise<SelectAssetLifecycle | undefined> {
    const [lifecycle] = await db.select().from(assetLifecycle)
      .where(eq(assetLifecycle.deviceId, deviceId));
    return lifecycle;
  }

  async createAssetLifecycle(lifecycle: InsertAssetLifecycle): Promise<SelectAssetLifecycle> {
    const [newLifecycle] = await db.insert(assetLifecycle).values(lifecycle).returning();
    return newLifecycle;
  }

  async updateAssetLifecycle(id: number, lifecycle: Partial<InsertAssetLifecycle>): Promise<SelectAssetLifecycle | undefined> {
    const [updatedLifecycle] = await db.update(assetLifecycle)
      .set({ ...lifecycle, updatedAt: new Date() })
      .where(eq(assetLifecycle.id, id))
      .returning();
    return updatedLifecycle;
  }

  async deleteAssetLifecycle(id: number): Promise<boolean> {
    const result = await db.delete(assetLifecycle).where(eq(assetLifecycle.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAssetsNearRetirement(daysThreshold: number): Promise<SelectAssetLifecycle[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return await db.select().from(assetLifecycle)
      .where(
        sql`${assetLifecycle.retirementDate} <= ${thresholdDate.toISOString()} AND ${assetLifecycle.isRetired} = false`
      )
      .orderBy(assetLifecycle.retirementDate);
  }
}

export const storage = new DatabaseStorage();
