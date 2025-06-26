import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Device types
export const deviceTypes = [
  "Workstation",
  "Server",
  "Network",
  "Router",
  "Laptop",
  "Mobile",
  "Other"
] as const;

// Device statuses
export const deviceStatuses = [
  "Active",
  "Inactive", 
  "Maintenance",
  "Damage",
  "Abnormal"
] as const;

// Device locations
export const deviceLocations = [
  "Headquarters",
  "Branch Office",
  "Data Center",
  "Remote",
  "Other"
] as const;

// Users schema (keeping the original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Devices schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  location: text("location").notNull(),
  ipAddress: text("ip_address"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Prohibited Software schema
export const prohibitedSoftware = pgTable("prohibited_software", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  executableName: text("executable_name").notNull(),
  version: text("version"),
  category: text("category").notNull().default("General"),
  riskLevel: text("risk_level").notNull().default("Medium"),
  blockExecution: boolean("block_execution").notNull().default(true),
  autoUninstall: boolean("auto_uninstall").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Software Detection Log schema
export const softwareDetectionLog = pgTable("software_detection_log", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  prohibitedSoftwareId: integer("prohibited_software_id").notNull(),
  detectedVersion: text("detected_version"),
  detectionDate: timestamp("detection_date").defaultNow(),
  actionTaken: text("action_taken").notNull(), // "Blocked", "Uninstalled", "Flagged", "Ignored"
  status: text("status").notNull().default("Active"), // "Active", "Resolved", "Ignored"
  notes: text("notes"),
});

// Software Scan Results schema
export const softwareScanResults = pgTable("software_scan_results", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  scanDate: timestamp("scan_date").defaultNow(),
  totalSoftwareFound: integer("total_software_found").notNull().default(0),
  prohibitedSoftwareCount: integer("prohibited_software_count").notNull().default(0),
  scanStatus: text("scan_status").notNull().default("Completed"), // "Completed", "Failed", "In Progress"
  scanDuration: integer("scan_duration_seconds"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceSchema = createInsertSchema(devices)
  .omit({ id: true, lastUpdated: true })
  .extend({
    type: z.enum(deviceTypes),
    status: z.enum(deviceStatuses),
    location: z.enum(deviceLocations),
    ipAddress: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
  });

export const insertProhibitedSoftwareSchema = createInsertSchema(prohibitedSoftware)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    category: z.string().default("General"),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    blockExecution: z.boolean().default(true),
    autoUninstall: z.boolean().default(false),
  });

export const insertSoftwareDetectionLogSchema = createInsertSchema(softwareDetectionLog)
  .omit({ id: true, detectionDate: true })
  .extend({
    actionTaken: z.enum(["Blocked", "Uninstalled", "Flagged", "Ignored"]),
    status: z.enum(["Active", "Resolved", "Ignored"]).default("Active"),
  });

export const insertSoftwareScanResultsSchema = createInsertSchema(softwareScanResults)
  .omit({ id: true, scanDate: true })
  .extend({
    scanStatus: z.enum(["Completed", "Failed", "In Progress"]).default("Completed"),
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
export type DeviceType = typeof deviceTypes[number];
export type DeviceStatus = typeof deviceStatuses[number];
export type DeviceLocation = typeof deviceLocations[number];

export type InsertProhibitedSoftware = z.infer<typeof insertProhibitedSoftwareSchema>;
export type ProhibitedSoftware = typeof prohibitedSoftware.$inferSelect;

export type InsertSoftwareDetectionLog = z.infer<typeof insertSoftwareDetectionLogSchema>;
export type SoftwareDetectionLog = typeof softwareDetectionLog.$inferSelect;

export type InsertSoftwareScanResults = z.infer<typeof insertSoftwareScanResultsSchema>;
export type SoftwareScanResults = typeof softwareScanResults.$inferSelect;

// Network Discovery Tables
export const networkDevices = pgTable("network_devices", {
  id: serial("id").primaryKey(),
  macAddress: text("mac_address").unique().notNull(),
  deviceName: text("device_name"),
  currentIp: text("current_ip"),
  vendor: text("vendor"),
  deviceType: text("device_type"),
  behaviorTag: text("behavior_tag"),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  status: text("status").default("Active").notNull(),
});

export const ipHistory = pgTable("ip_history", {
  id: serial("id").primaryKey(),
  networkDeviceId: integer("network_device_id").references(() => networkDevices.id).notNull(),
  ipAddress: text("ip_address").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  releasedAt: timestamp("released_at"),
  leaseType: text("lease_type").default("DHCP").notNull(),
});

export const trafficLogs = pgTable("traffic_logs", {
  id: serial("id").primaryKey(),
  networkDeviceId: integer("network_device_id").references(() => networkDevices.id).notNull(),
  protocol: text("protocol").notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  dataSize: integer("data_size"),
  direction: text("direction").notNull(), // "inbound" or "outbound"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertNetworkDeviceSchema = createInsertSchema(networkDevices)
  .omit({ id: true, firstSeen: true, lastSeen: true });

export const insertIpHistorySchema = createInsertSchema(ipHistory)
  .omit({ id: true, assignedAt: true });

export const insertTrafficLogSchema = createInsertSchema(trafficLogs)
  .omit({ id: true, timestamp: true });

export type InsertNetworkDevice = z.infer<typeof insertNetworkDeviceSchema>;
export type NetworkDevice = typeof networkDevices.$inferSelect;

export type InsertIpHistory = z.infer<typeof insertIpHistorySchema>;
export type IpHistory = typeof ipHistory.$inferSelect;

export type InsertTrafficLog = z.infer<typeof insertTrafficLogSchema>;
export type TrafficLog = typeof trafficLogs.$inferSelect;

// Website Blocking Tables
export const websiteBlocks = pgTable("website_blocks", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => devices.id),
  networkDeviceId: integer("network_device_id").references(() => networkDevices.id),
  targetDomain: text("target_domain").notNull(),
  blockType: text("block_type").default("domain").notNull(), // "domain", "url", "ip"
  status: text("status").default("pending").notNull(), // "pending", "active", "failed", "removed"
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  reason: text("reason"),
  firewallRule: text("firewall_rule"), // Stores the actual firewall rule applied
  errorMessage: text("error_message"),
});

export const blockingHistory = pgTable("blocking_history", {
  id: serial("id").primaryKey(),
  websiteBlockId: integer("website_block_id").references(() => websiteBlocks.id).notNull(),
  action: text("action").notNull(), // "created", "activated", "failed", "removed"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: text("details"),
  performedBy: text("performed_by"),
});

export const insertWebsiteBlockSchema = createInsertSchema(websiteBlocks)
  .omit({ id: true, createdAt: true, activatedAt: true });

export const insertBlockingHistorySchema = createInsertSchema(blockingHistory)
  .omit({ id: true, timestamp: true });

export type InsertWebsiteBlock = z.infer<typeof insertWebsiteBlockSchema>;
export type WebsiteBlock = typeof websiteBlocks.$inferSelect;

export type InsertBlockingHistory = z.infer<typeof insertBlockingHistorySchema>;
export type BlockingHistory = typeof blockingHistory.$inferSelect;

// Support Tickets Table for Auto-Generated Issues
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("Medium"), // "Low", "Medium", "High", "Critical"
  status: text("status").notNull().default("Open"), // "Open", "In Progress", "Resolved", "Closed"
  category: text("category").notNull().default("Hardware"), // "Hardware", "Software", "Network", "Security"
  deviceId: integer("device_id").references(() => devices.id),
  assignedTo: text("assigned_to"),
  createdBy: text("created_by").notNull().default("System"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  isAutoGenerated: boolean("is_auto_generated").notNull().default(false),
  triggerEvent: text("trigger_event"), // What caused the auto-generation
  notes: text("notes"),
});

export const insertTicketSchema = createInsertSchema(tickets)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
    category: z.enum(["Hardware", "Software", "Network", "Security"]).default("Hardware"),
    isAutoGenerated: z.boolean().default(false),
  });

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
