import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
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
  // Warranty and asset tracking fields
  serialNumber: text("serial_number"),
  assetTag: text("asset_tag"),
  manufacturer: text("manufacturer"),
  purchaseDate: timestamp("purchase_date"),
  warrantyStartDate: timestamp("warranty_start_date"),
  warrantyEndDate: timestamp("warranty_end_date"),
  warrantyType: text("warranty_type"), // "Standard", "Extended", "On-Site", "Next Business Day"
  warrantyProvider: text("warranty_provider"), // "Manufacturer", "Third Party", "Internal"
  cost: text("cost"),
  supplier: text("supplier"),
  owner: text("owner"),
  department: text("department"),
  endOfLifeDate: timestamp("end_of_life_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  warrantyAutoDetected: boolean("warranty_auto_detected").notNull().default(false),
  warrantyLastChecked: timestamp("warranty_last_checked"),
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

// CMDB Configuration Items schema
export const cmdbConfigurationItems = pgTable("cmdb_configuration_items", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  ciType: text("ci_type").notNull().default("Hardware"), // "Hardware", "Software", "Network", "Service"
  ciName: text("ci_name").notNull(),
  ciDescription: text("ci_description"),
  category: text("category").notNull(), // "Server", "Workstation", "Network Device", etc.
  subCategory: text("sub_category"), // "Physical Server", "Virtual Machine", "Router", etc.
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  assetTag: text("asset_tag"),
  purchaseDate: timestamp("purchase_date"),
  warrantyEndDate: timestamp("warranty_end_date"),
  cost: text("cost"),
  supplier: text("supplier"),
  owner: text("owner"),
  custodian: text("custodian"),
  businessService: text("business_service"),
  environment: text("environment").notNull().default("Production"), // "Production", "Development", "Testing", "Staging"
  operatingSystem: text("operating_system"),
  osVersion: text("os_version"),
  configuration: json("configuration"), // JSON object for flexible configuration data
  relationships: json("relationships"), // JSON array for CI relationships
  changeHistory: json("change_history"), // JSON array for change tracking
  complianceStatus: text("compliance_status").notNull().default("Compliant"), // "Compliant", "Non-Compliant", "Unknown"
  riskLevel: text("risk_level").notNull().default("Low"), // "Low", "Medium", "High", "Critical"
  lifecycleStatus: text("lifecycle_status").notNull().default("Active"), // "Planning", "Active", "Retiring", "Retired"
  maintenanceSchedule: text("maintenance_schedule"),
  backupSchedule: text("backup_schedule"),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  automatedManagement: boolean("automated_management").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMDB Change Records schema
export const cmdbChangeRecords = pgTable("cmdb_change_records", {
  id: serial("id").primaryKey(),
  configurationItemId: integer("configuration_item_id").notNull(),
  changeType: text("change_type").notNull(), // "Create", "Update", "Delete", "Move", "Backup", "Restore"
  changeDescription: text("change_description").notNull(),
  changeReason: text("change_reason"),
  requestedBy: text("requested_by"),
  implementedBy: text("implemented_by"),
  changeDate: timestamp("change_date").defaultNow(),
  plannedDate: timestamp("planned_date"),
  previousValue: json("previous_value"),
  newValue: json("new_value"),
  approvalStatus: text("approval_status").notNull().default("Pending"), // "Pending", "Approved", "Rejected"
  implementationStatus: text("implementation_status").notNull().default("Planned"), // "Planned", "In Progress", "Completed", "Failed", "Rolled Back"
  riskAssessment: text("risk_assessment"),
  rollbackPlan: text("rollback_plan"),
  testingResults: text("testing_results"),
  businessImpact: text("business_impact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMDB Relationships schema
export const cmdbRelationships = pgTable("cmdb_relationships", {
  id: serial("id").primaryKey(),
  sourceConfigurationItemId: integer("source_configuration_item_id").notNull(),
  targetConfigurationItemId: integer("target_configuration_item_id").notNull(),
  relationshipType: text("relationship_type").notNull(), // "Depends On", "Used By", "Connects To", "Installed On", "Hosts"
  relationshipDescription: text("relationship_description"),
  strength: text("strength").notNull().default("Strong"), // "Strong", "Weak", "Critical"
  direction: text("direction").notNull().default("Bidirectional"), // "Unidirectional", "Bidirectional"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMDB Compliance Rules schema
export const cmdbComplianceRules = pgTable("cmdb_compliance_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleDescription: text("rule_description"),
  category: text("category").notNull(), // "Security", "Performance", "Availability", "Configuration"
  ruleType: text("rule_type").notNull(), // "Mandatory", "Recommended", "Optional"
  applicableCITypes: json("applicable_ci_types"), // JSON array of CI types this rule applies to
  complianceCheck: text("compliance_check").notNull(), // SQL or JSON query to check compliance
  remediation: text("remediation"), // Steps to remediate non-compliance
  severity: text("severity").notNull().default("Medium"), // "Low", "Medium", "High", "Critical"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertCmdbConfigurationItemSchema = createInsertSchema(cmdbConfigurationItems)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    ciType: z.enum(["Hardware", "Software", "Network", "Service"]).default("Hardware"),
    environment: z.enum(["Production", "Development", "Testing", "Staging"]).default("Production"),
    complianceStatus: z.enum(["Compliant", "Non-Compliant", "Unknown"]).default("Compliant"),
    riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).default("Low"),
    lifecycleStatus: z.enum(["Planning", "Active", "Retiring", "Retired"]).default("Active"),
    monitoringEnabled: z.boolean().default(true),
    automatedManagement: z.boolean().default(false),
  });

export const insertCmdbChangeRecordSchema = createInsertSchema(cmdbChangeRecords)
  .omit({ id: true, createdAt: true, updatedAt: true, changeDate: true })
  .extend({
    changeType: z.enum(["Create", "Update", "Delete", "Move", "Backup", "Restore"]),
    approvalStatus: z.enum(["Pending", "Approved", "Rejected"]).default("Pending"),
    implementationStatus: z.enum(["Planned", "In Progress", "Completed", "Failed", "Rolled Back"]).default("Planned"),
  });

export const insertCmdbRelationshipSchema = createInsertSchema(cmdbRelationships)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    relationshipType: z.enum(["Depends On", "Used By", "Connects To", "Installed On", "Hosts"]),
    strength: z.enum(["Strong", "Weak", "Critical"]).default("Strong"),
    direction: z.enum(["Unidirectional", "Bidirectional"]).default("Bidirectional"),
  });

export const insertCmdbComplianceRuleSchema = createInsertSchema(cmdbComplianceRules)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    category: z.enum(["Security", "Performance", "Availability", "Configuration"]),
    ruleType: z.enum(["Mandatory", "Recommended", "Optional"]),
    severity: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    isActive: z.boolean().default(true),
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

export type InsertCmdbConfigurationItem = z.infer<typeof insertCmdbConfigurationItemSchema>;
export type CmdbConfigurationItem = typeof cmdbConfigurationItems.$inferSelect;

export type InsertCmdbChangeRecord = z.infer<typeof insertCmdbChangeRecordSchema>;
export type CmdbChangeRecord = typeof cmdbChangeRecords.$inferSelect;

export type InsertCmdbRelationship = z.infer<typeof insertCmdbRelationshipSchema>;
export type CmdbRelationship = typeof cmdbRelationships.$inferSelect;

export type InsertCmdbComplianceRule = z.infer<typeof insertCmdbComplianceRuleSchema>;
export type CmdbComplianceRule = typeof cmdbComplianceRules.$inferSelect;

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

// Notification History Table
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  deviceName: text("device_name").notNull(),
  deviceModel: text("device_model").notNull(),
  deviceType: text("device_type").notNull(),
  deviceStatus: text("device_status").notNull(),
  deviceLocation: text("device_location").notNull(),
  notificationType: text("notification_type").notNull(), // 'DEVICE_ADDED' | 'DEVICE_UPDATED'
  timestamp: timestamp("timestamp").defaultNow(),
  action: text("action"), // 'accepted' | 'dismissed' | null
  actionTimestamp: timestamp("action_timestamp"),
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory)
  .omit({ id: true, timestamp: true });

export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;

// Pending Devices schema for approval workflow
export const pendingDevices = pgTable("pending_devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  location: text("location").notNull(),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  discoveryMethod: text("discovery_method").notNull(), // 'agent' or 'auto-discovery'
  discoveryData: text("discovery_data"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  isApproved: boolean("is_approved").default(false),
  isRejected: boolean("is_rejected").default(false),
});

export const insertPendingDeviceSchema = createInsertSchema(pendingDevices)
  .omit({ id: true, createdAt: true, approvedAt: true, rejectedAt: true });

export type InsertPendingDevice = z.infer<typeof insertPendingDeviceSchema>;
export type PendingDevice = typeof pendingDevices.$inferSelect;

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
    ticketNumber: z.string(), // Required field for database
    priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
    status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
    category: z.enum(["Hardware", "Software", "Network", "Security"]).default("Hardware"),
    isAutoGenerated: z.boolean().default(false),
  });

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Alert Management System
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').references(() => devices.id),
  alertType: text('alert_type').notNull(), // 'warranty_expiration', 'end_of_life', 'compliance_violation', 'security_risk', 'maintenance_due'
  alertTitle: text('alert_title').notNull(),
  alertDescription: text('alert_description'),
  severity: text('severity').notNull(), // 'Low', 'Medium', 'High', 'Critical'
  alertDate: timestamp('alert_date').notNull(),
  expirationDate: timestamp('expiration_date'),
  warrantyExpirationDate: timestamp('warranty_expiration_date'),
  endOfLifeDate: timestamp('end_of_life_date'),
  maintenanceDueDate: timestamp('maintenance_due_date'),
  status: text('status').notNull().default('Active'), // 'Active', 'Acknowledged', 'Resolved', 'Dismissed'
  acknowledgedBy: text('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  isRecurring: boolean('is_recurring').default(false),
  recurringInterval: integer('recurring_interval'), // days
  nextAlertDate: timestamp('next_alert_date'),
  emailNotificationSent: boolean('email_notification_sent').default(false),
  escalationLevel: integer('escalation_level').default(1),
  assignedTo: text('assigned_to'),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Alert Templates for creating standardized alerts
export const alertTemplates = pgTable('alert_templates', {
  id: serial('id').primaryKey(),
  templateName: text('template_name').notNull(),
  alertType: text('alert_type').notNull(),
  alertTitle: text('alert_title').notNull(),
  alertDescription: text('alert_description'),
  severity: text('severity').notNull(),
  daysBeforeExpiration: integer('days_before_expiration').default(30),
  isActive: boolean('is_active').default(true),
  emailTemplate: text('email_template'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Alert History for tracking alert actions
export const alertHistory = pgTable('alert_history', {
  id: serial('id').primaryKey(),
  alertId: integer('alert_id').references(() => alerts.id),
  action: text('action').notNull(), // 'created', 'acknowledged', 'resolved', 'dismissed', 'escalated'
  actionBy: text('action_by').notNull(),
  actionDate: timestamp('action_date').defaultNow(),
  notes: text('notes'),
  metadata: jsonb('metadata')
});

// Relations for alerts
export const alertsRelations = relations(alerts, ({ one, many }) => ({
  device: one(devices, {
    fields: [alerts.deviceId],
    references: [devices.id]
  }),
  history: many(alertHistory)
}));

export const alertHistoryRelations = relations(alertHistory, ({ one }) => ({
  alert: one(alerts, {
    fields: [alertHistory.alertId],
    references: [alerts.id]
  })
}));

// Export insert and select schemas for alerts
export const insertAlertSchema = createInsertSchema(alerts)
  .omit({ id: true, createdAt: true, updatedAt: true, acknowledgedAt: true, resolvedAt: true })
  .extend({
    alertType: z.enum(['warranty_expiration', 'end_of_life', 'compliance_violation', 'security_risk', 'maintenance_due']),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    status: z.enum(['Active', 'Acknowledged', 'Resolved', 'Dismissed']).default('Active'),
    alertDate: z.union([z.string(), z.date()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
    expirationDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
    warrantyExpirationDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
    endOfLifeDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
    maintenanceDueDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
    nextAlertDate: z.union([z.string(), z.date()]).optional().transform((val) => val ? (typeof val === 'string' ? new Date(val) : val) : undefined),
    isRecurring: z.boolean().default(false),
    emailNotificationSent: z.boolean().default(false),
    escalationLevel: z.number().default(1),
    tags: z.array(z.string()).default([])
  });

export const selectAlertSchema = createSelectSchema(alerts);
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export const insertAlertTemplateSchema = createInsertSchema(alertTemplates);
export const selectAlertTemplateSchema = createSelectSchema(alertTemplates);
export type InsertAlertTemplate = z.infer<typeof insertAlertTemplateSchema>;
export type AlertTemplate = typeof alertTemplates.$inferSelect;

export const insertAlertHistorySchema = createInsertSchema(alertHistory);
export const selectAlertHistorySchema = createSelectSchema(alertHistory);
export type InsertAlertHistory = z.infer<typeof insertAlertHistorySchema>;
export type AlertHistory = typeof alertHistory.$inferSelect;

// Asset Lifecycle Management schema
export const assetLifecycle = pgTable("asset_lifecycle", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  deviceName: text("device_name").notNull(),
  acquiredDate: timestamp("acquired_date").notNull(),
  retirementDate: timestamp("retirement_date").notNull(),
  notificationDays: integer("notification_days").notNull().default(30), // Days before retirement to notify
  dailyNotifications: boolean("daily_notifications").notNull().default(false),
  lastNotificationDate: timestamp("last_notification_date"),
  isRetired: boolean("is_retired").notNull().default(false),
  retiredDate: timestamp("retired_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Asset Lifecycle relations
export const assetLifecycleRelations = relations(assetLifecycle, ({ one }) => ({
  device: one(devices, {
    fields: [assetLifecycle.deviceId],
    references: [devices.id]
  })
}));

// Insert and select schemas
export const insertAssetLifecycleSchema = createInsertSchema(assetLifecycle, {
  acquiredDate: z.string().transform((val) => new Date(val)),
  retirementDate: z.string().transform((val) => new Date(val)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastNotificationDate: true,
  isRetired: true,
  retiredDate: true
});

export const selectAssetLifecycleSchema = createSelectSchema(assetLifecycle);

export type InsertAssetLifecycle = z.infer<typeof insertAssetLifecycleSchema>;
export type SelectAssetLifecycle = z.infer<typeof selectAssetLifecycleSchema>;
