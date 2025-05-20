import { 
  users, 
  type User, 
  type InsertUser, 
  devices, 
  type Device, 
  type InsertDevice 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
          name: "NTW-SW-003",
          model: "Cisco Catalyst 9300",
          type: "Network",
          status: "Maintenance",
          location: "Branch Office",
          ipAddress: "192.168.2.1",
          latitude: "37.3352",
          longitude: "-121.8811"
        },
        {
          name: "LT-MKT-007",
          model: "MacBook Pro 13\"",
          type: "Laptop",
          status: "Active",
          location: "Headquarters",
          ipAddress: "192.168.1.120",
          latitude: "37.7749",
          longitude: "-122.4194"
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
        {
          name: "WS-HR-002",
          model: "HP EliteDesk 800",
          type: "Workstation",
          status: "Active",
          location: "Headquarters",
          ipAddress: "192.168.1.102",
          latitude: "37.7749",
          longitude: "-122.4194"
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
          name: "MB-CEO-001",
          model: "iPhone 13 Pro",
          type: "Mobile",
          status: "Active",
          location: "Remote",
          ipAddress: "192.168.1.150",
          latitude: "37.7833",
          longitude: "-122.4167"
        },
        {
          name: "LT-DEV-005",
          model: "Dell XPS 15",
          type: "Laptop",
          status: "Maintenance",
          location: "Branch Office",
          ipAddress: "192.168.2.101",
          latitude: "37.3352",
          longitude: "-121.8811"
        },
        {
          name: "NTW-FW-001",
          model: "Cisco Firepower 2110",
          type: "Network",
          status: "Active",
          location: "Data Center",
          ipAddress: "10.0.0.2",
          latitude: "37.7790",
          longitude: "-122.4200"
        }
      ];
      
      for (const device of sampleDevices) {
        await this.createDevice(device);
      }
    }
  }
}

export const storage = new DatabaseStorage();
