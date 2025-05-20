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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
export type DeviceType = typeof deviceTypes[number];
export type DeviceStatus = typeof deviceStatuses[number];
export type DeviceLocation = typeof deviceLocations[number];
