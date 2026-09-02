import { relations } from "drizzle-orm";
import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, date, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";

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
  email: text("email").notNull(),
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
  isMcf: boolean("is_mcf").default(false),
  customFields: jsonb("custom_fields").default({}).notNull(),

  // Sync hooks for Sheets / external sources
  externalId: text("external_id"),
  source: text("source").default("manual").notNull(), // manual | csv | sheets
  lastSyncedAt: timestamp("last_synced_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("fellows_tenant_idx").on(table.tenantId),
  index("fellows_email_idx").on(table.email),
  index("fellows_external_id_idx").on(table.tenantId, table.externalId),
  uniqueIndex("fellows_tenant_email_idx").on(table.tenantId, table.email),
]);

// Country hub programs (Public Service Fellowship, WOR, PEACE, etc.)
export const hubPrograms = pgTable("hub_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active | completed | planned
  targetFellows: integer("target_fellows").default(0),
  startYear: integer("start_year"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hub_programs_tenant_idx").on(table.tenantId),
  uniqueIndex("hub_programs_tenant_slug_idx").on(table.tenantId, table.slug),
  uniqueIndex("hub_programs_tenant_title_idx").on(table.tenantId, table.title),
]);

// Country hub cohorts (Cohort 7, etc.) — manual stats + optional live link via cohortYear
export const hubCohorts = pgTable("hub_cohorts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  label: text("label").notNull(),
  cohortNumber: integer("cohort_number"),
  cohortYear: integer("cohort_year"),
  status: text("status").notNull().default("in_progress"), // in_progress | completed
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  startedCount: integer("started_count"),
  graduatedCount: integer("graduated_count"),
  placedCount: integer("placed_count"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hub_cohorts_tenant_idx").on(table.tenantId),
  uniqueIndex("hub_cohorts_tenant_label_idx").on(table.tenantId, table.label),
]);

// Country hub organizations: placement institutions (where fellows serve) and partners (funders, etc.)
export const hubPartners = pgTable("hub_partners", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("placement"), // placement | partner
  partnerType: text("partner_type"), // funder | government | ngo | corporate | other
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  region: text("region"),
  fellowCount: integer("fellow_count").default(0).notNull(),
  status: text("status").notNull().default("active"), // active | inactive | archived
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hub_partners_tenant_idx").on(table.tenantId),
  index("hub_partners_tenant_status_idx").on(table.tenantId, table.status),
  index("hub_partners_tenant_kind_idx").on(table.tenantId, table.kind),
  uniqueIndex("hub_partners_tenant_kind_name_idx").on(table.tenantId, table.kind, table.name),
]);

// Featured alumni leaders and country representatives
export const hubAlumniLeaders = pgTable("hub_alumni_leaders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  organization: text("organization"),
  cohortId: uuid("cohort_id").references(() => hubCohorts.id),
  cohortYear: integer("cohort_year"),
  program: text("program"),
  region: text("region"),
  parentId: uuid("parent_id"),
  tier: integer("tier").default(0),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  isRepresentative: boolean("is_representative").default(false).notNull(),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hub_alumni_leaders_tenant_idx").on(table.tenantId),
  index("hub_alumni_leaders_tenant_status_idx").on(table.tenantId, table.status),
]);

// Continental Alumni Executive Board (created in Super Admin Settings)
export const alumniExecutives = pgTable("alumni_executives", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  organization: text("organization"),
  cohortLabel: text("cohort_label"),
  parentId: uuid("parent_id"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  sortOrder: integer("sort_order").default(0),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("alumni_executives_status_idx").on(table.status),
  index("alumni_executives_parent_idx").on(table.parentId),
  index("alumni_executives_tenant_idx").on(table.tenantId),
]);

// Country hub events (orientations, workshops, alumni gatherings, global sessions)
export const hubEvents = pgTable("hub_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  venue: text("venue"),
  onlineUrl: text("online_url"),
  sortOrder: integer("sort_order").default(0),
  isGlobal: boolean("is_global").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("hub_events_tenant_idx").on(table.tenantId),
  index("hub_events_tenant_starts_idx").on(table.tenantId, table.startsAt),
  index("hub_events_is_global_idx").on(table.isGlobal),
]);
export const networkFieldDefs = pgTable("network_field_defs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(), // text | number | date | select | boolean
  options: jsonb("options").default([]),
  required: boolean("required").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("network_field_defs_tenant_idx").on(table.tenantId),
  uniqueIndex("network_field_defs_tenant_key_idx").on(table.tenantId, table.key),
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
  index("checkins_period_idx").on(table.periodYear, table.periodMonth),
  uniqueIndex("check_ins_fellow_period_idx").on(table.tenantId, table.fellowId, table.periodMonth, table.periodYear),
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
  hubPrograms: many(hubPrograms),
  hubCohorts: many(hubCohorts),
  hubPartners: many(hubPartners),
  hubAlumniLeaders: many(hubAlumniLeaders),
  alumniExecutives: many(alumniExecutives),
  hubEvents: many(hubEvents),
  networkFieldDefs: many(networkFieldDefs),
  placements: many(placements),
  checkIns: many(checkIns),
  activityLog: many(activityLog),
}));

export const hubProgramsRelations = relations(hubPrograms, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hubPrograms.tenantId],
    references: [tenants.id],
  }),
}));

export const hubCohortsRelations = relations(hubCohorts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hubCohorts.tenantId],
    references: [tenants.id],
  }),
}));

export const hubPartnersRelations = relations(hubPartners, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hubPartners.tenantId],
    references: [tenants.id],
  }),
}));

export const hubAlumniLeadersRelations = relations(hubAlumniLeaders, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hubAlumniLeaders.tenantId],
    references: [tenants.id],
  }),
  cohort: one(hubCohorts, {
    fields: [hubAlumniLeaders.cohortId],
    references: [hubCohorts.id],
  }),
}));

export const alumniExecutivesRelations = relations(alumniExecutives, ({ one }) => ({
  tenant: one(tenants, {
    fields: [alumniExecutives.tenantId],
    references: [tenants.id],
  }),
}));

export const hubEventsRelations = relations(hubEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [hubEvents.tenantId],
    references: [tenants.id],
  }),
}));

export const networkFieldDefsRelations = relations(networkFieldDefs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [networkFieldDefs.tenantId],
    references: [tenants.id],
  }),
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