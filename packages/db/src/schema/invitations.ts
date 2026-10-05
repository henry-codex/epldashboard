import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./epl";
import { user } from "./auth";

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  issuerId: text("issuer_id").references(() => user.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").$type<"pending" | "accepted" | "cancelled" | "expired">().notNull().default("pending"),
  deliveryStatus: text("delivery_status").$type<"pending" | "sent" | "failed">().notNull().default("pending"),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: text("accepted_by").references(() => user.id),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("invitations_tenant_idx").on(table.tenantId),
  uniqueIndex("invitations_pending_email_idx").on(table.email).where(sql`${table.status} = 'pending'`),
]);
