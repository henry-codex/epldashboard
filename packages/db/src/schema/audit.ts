import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
export type AuditActor = { kind: "user" | "anonymous" | "operator" | "system"; id: string | null; name: string | null; role: string | null };
export type AuditChange = { field: string; before?: unknown; after?: unknown; redacted?: boolean };
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  action: text("action").notNull(), category: text("category").notNull(),
  outcome: text("outcome").notNull().default("success"),
  actor: jsonb("actor").$type<AuditActor>().notNull(),
  tenantId: text("tenant_id"), tenantName: text("tenant_name"),
  targetType: text("target_type").notNull(), targetId: text("target_id"), targetLabel: text("target_label"),
  changes: jsonb("changes").$type<AuditChange[]>().notNull().default([]),
  details: jsonb("details").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  requestId: uuid("request_id").notNull(), source: text("source").notNull(),
  clientIp: text("client_ip"), userAgent: text("user_agent"), procedure: text("procedure"),
  legacyId: uuid("legacy_id"),
}, (t) => [
  index("audit_time_idx").on(t.occurredAt, t.id),
  index("audit_hub_time_idx").on(t.tenantId, t.occurredAt, t.id),
  index("audit_action_time_idx").on(t.action, t.occurredAt),
  index("audit_target_idx").on(t.targetType, t.targetId, t.occurredAt),
  uniqueIndex("audit_legacy_idx").on(t.legacyId),
]);
