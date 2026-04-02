import { relations } from "drizzle-orm";
import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, date, numeric, index } from "drizzle-orm/pg-core";

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  countryCode: text("country_code"),
  domain: text("domain"),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// User-Tenant relationship for multi-tenant access
export const userTenants = pgTable("user_tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  role: text("role").notNull(), // 'super_admin', 'tenant_admin', 'country_admin', 'fellow', 'viewer'
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_tenants_user_idx").on(table.userId),
  index("user_tenants_tenant_idx").on(table.tenantId)
]);

// Fellows table
export const fellows = pgTable("fellows", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  profileId: text("profile_id"), // Links to auth user
  
  // Personal information  
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  nationality: text("nationality"),
  countryOfOrigin: text("country_of_origin"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  linkedinUrl: text("linkedin_url"),
  
  // Visibility settings
  publicProfile: boolean("public_profile").default(true),
  showContact: boolean("show_contact").default(false),
  shareable: boolean("shareable").default(true),
  
  // EPL Program details
  cohortYear: integer("cohort_year").notNull(),
  program: text("program").notNull(), // 'Public Service Fellowship' | 'Women on the Rise' | 'PEACE'
  status: text("status").notNull(), // 'active' | 'alumni' | 'inactive'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("fellows_tenant_idx").on(table.tenantId),
  index("fellows_email_idx").on(table.email)
]);

// Placements table
export const placements = pgTable("placements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  fellowId: uuid("fellow_id").references(() => fellows.id).notNull(),
  
  institution: text("institution").notNull(),
  department: text("department"),
  roleTitle: text("role_title").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = current
  isCurrent: boolean("is_current").default(true),
  
  supervisorName: text("supervisor_name"),
  supervisorEmail: text("supervisor_email"),
  supervisorVerified: boolean("supervisor_verified").default(false),
  supervisorToken: uuid("supervisor_token").defaultRandom(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("placements_tenant_idx").on(table.tenantId),
  index("placements_fellow_idx").on(table.fellowId)
]);

// Check-ins table (monthly reports)
export const checkIns = pgTable("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  fellowId: uuid("fellow_id").references(() => fellows.id).notNull(),
  placementId: uuid("placement_id").references(() => placements.id),
  
  periodMonth: integer("period_month").notNull(), // 1-12
  periodYear: integer("period_year").notNull(),
  submittedAt: timestamp("submitted_at"),
  status: text("status").default("pending"), // 'pending' | 'submitted' | 'overdue'
  
  // Check-in fields
  stillAtPlacement: boolean("still_at_placement"),
  locationConfirmed: text("location_confirmed"),
  mainActivities: text("main_activities"),
  highlights: text("highlights"),
  challenges: text("challenges"),
  supportNeeded: text("support_needed"),
  careerMilestone: boolean("career_milestone").default(false),
  milestoneDescription: text("milestone_description"),
  daysWorked: integer("days_worked"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("checkins_tenant_idx").on(table.tenantId),
  index("checkins_fellow_idx").on(table.fellowId),
  index("checkins_period_idx").on(table.periodYear, table.periodMonth)
]);

// Activity log for system events
export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  fellowId: uuid("fellow_id").references(() => fellows.id),
  eventType: text("event_type").notNull(),
  description: text("description"),
  country: text("country"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_tenant_idx").on(table.tenantId),
  index("activity_type_idx").on(table.eventType)
]);

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  fellows: many(fellows),
  placements: many(placements),
  checkIns: many(checkIns),
  activityLog: many(activityLog),
}));

export const fellowsRelations = relations(fellows, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [fellows.tenantId],
    references: [tenants.id],
  }),
  placements: many(placements),
  checkIns: many(checkIns),
}));

export const placementsRelations = relations(placements, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [placements.tenantId],
    references: [tenants.id],
  }),
  fellow: one(fellows, {
    fields: [placements.fellowId],
    references: [fellows.id],
  }),
  checkIns: many(checkIns),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [checkIns.tenantId],
    references: [tenants.id],
  }),
  fellow: one(fellows, {
    fields: [checkIns.fellowId],
    references: [fellows.id],
  }),
  placement: one(placements, {
    fields: [checkIns.placementId],
    references: [placements.id],
  }),
}));