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

// Gamification System Tables
export const userLearningProgress = pgTable("user_learning_progress", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  currentRole: text("current_role").notNull(), // "Admin", "Manager", "Viewer"
  experiencePoints: integer("experience_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  challengesCompleted: integer("challenges_completed").default(0).notNull(),
  achievementsUnlocked: integer("achievements_unlocked").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningChallenges = pgTable("learning_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "permission", "security", "device_management", "reporting"
  difficulty: text("difficulty").notNull(), // "beginner", "intermediate", "advanced"
  requiredRole: text("required_role").notNull(), // "Admin", "Manager", "Viewer", "Any"
  experienceReward: integer("experience_reward").default(10).notNull(),
  timeEstimate: integer("time_estimate_minutes").default(5).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeAttempts = pgTable("challenge_attempts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  challengeId: integer("challenge_id").references(() => learningChallenges.id).notNull(),
  status: text("status").notNull(), // "in_progress", "completed", "failed"
  score: integer("score").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  attemptsCount: integer("attempts_count").default(1).notNull(),
  hintsUsed: integer("hints_used").default(0).notNull(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  category: text("category").notNull(),
  requirement: text("requirement").notNull(), // JSON string describing requirements
  experienceReward: integer("experience_reward").default(50).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  rarity: text("rarity").default("common").notNull(), // "common", "rare", "epic", "legendary"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(100).notNull(), // Percentage completed
});

export const learningPathways = pgTable("learning_pathways", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetRole: text("target_role").notNull(),
  estimatedDuration: integer("estimated_duration_minutes").notNull(),
  challengeIds: text("challenge_ids").notNull(), // JSON array of challenge IDs
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for gamification
export const insertUserLearningProgressSchema = createInsertSchema(userLearningProgress)
  .omit({ id: true, createdAt: true, lastActivityAt: true });

export const insertLearningChallengeSchema = createInsertSchema(learningChallenges)
  .omit({ id: true, createdAt: true })
  .extend({
    category: z.enum(["permission", "security", "device_management", "reporting"]),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    requiredRole: z.enum(["Admin", "Manager", "Viewer", "Any"]),
  });

export const insertChallengeAttemptSchema = createInsertSchema(challengeAttempts)
  .omit({ id: true, startedAt: true, completedAt: true })
  .extend({
    status: z.enum(["in_progress", "completed", "failed"]),
  });

export const insertAchievementSchema = createInsertSchema(achievements)
  .omit({ id: true, createdAt: true })
  .extend({
    rarity: z.enum(["common", "rare", "epic", "legendary"]),
  });

export const insertUserAchievementSchema = createInsertSchema(userAchievements)
  .omit({ id: true, unlockedAt: true });

export const insertLearningPathwaySchema = createInsertSchema(learningPathways)
  .omit({ id: true, createdAt: true });

// Types for gamification
export type InsertUserLearningProgress = z.infer<typeof insertUserLearningProgressSchema>;
export type UserLearningProgress = typeof userLearningProgress.$inferSelect;

export type InsertLearningChallenge = z.infer<typeof insertLearningChallengeSchema>;
export type LearningChallenge = typeof learningChallenges.$inferSelect;

export type InsertChallengeAttempt = z.infer<typeof insertChallengeAttemptSchema>;
export type ChallengeAttempt = typeof challengeAttempts.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type InsertLearningPathway = z.infer<typeof insertLearningPathwaySchema>;
export type LearningPathway = typeof learningPathways.$inferSelect;
