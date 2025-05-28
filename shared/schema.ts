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
  "Maintenance"
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
