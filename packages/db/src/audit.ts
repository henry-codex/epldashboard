import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { eq, sql } from "drizzle-orm";
import { auditEvents, type AuditActor } from "./schema/audit";
import { user } from "./schema/auth";
import { tenants, userTenants } from "./schema/epl";
import { auditChanges, auditText, type AuditAction } from "./audit-policy";
import type { AccessTransaction, TransactionalDatabase } from "./index";
export type AuditDatabase = AccessTransaction | TransactionalDatabase;
export type AuditContext = {
  requestId: string; source: "web" | "api" | "cli" | "system"; actor: AuditActor;
  clientIp: string | null; userAgent: string | null; procedure?: string;
  transaction?: AccessTransaction;
  resolvedTenantId?: string;
};
export const auditStorage = new AsyncLocalStorage<AuditContext>();
export const anonymousActor: AuditActor = { kind: "anonymous", id: null, name: null, role: null };
export function requestAuditContext(input: { ip?: string; userAgent?: string; source?: AuditContext["source"] } = {}): AuditContext {
  return { requestId: randomUUID(), source: input.source ?? "api", actor: { ...anonymousActor },
    clientIp: input.ip && isIP(input.ip) ? input.ip : null, userAgent: auditText(input.userAgent, 512) };
}
export function withAuditContext<T>(context: AuditContext, action: () => T): T { return auditStorage.run(context, action); }
export async function auditActor(database: AuditDatabase, id: string): Promise<AuditActor> {
  const [person] = await database.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, id));
  if (!person) return { kind: "user", id, name: null, role: null };
  const memberships = await database.select({ role: userTenants.role, countryCode: tenants.countryCode, isActive: tenants.isActive }).from(userTenants).innerJoin(tenants, eq(userTenants.tenantId, tenants.id)).where(eq(userTenants.userId, id));
  const rank = ["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer"];
  const roles = memberships.filter(m => m.isActive && (m.role !== "tenant_admin" || m.countryCode === "GLOBAL")).map((m) => m.role).sort((a, b) => rank.indexOf(a) - rank.indexOf(b));
  return { kind: "user", id: person.id, name: auditText(person.name), role: roles[0] ?? null };
}
export async function configureAuditTransaction(database: AuditDatabase) {
  const context = auditStorage.getStore();
  if (!context) return;
  const { transaction: _transaction, ...value } = context;
  await database.execute(sql`select set_config('epl.audit_context', ${JSON.stringify(value)}, true)`);
}
type EventInput = {
  action: AuditAction; category?: "security" | "access" | "records" | "system";
  outcome?: "success" | "failed" | "denied" | "partial"; actor?: AuditActor; actorId?: string;
  tenantId?: string | null; targetType: string; targetId?: string | null; targetLabel?: string | null;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
  details?: Record<string, unknown>; occurredAt?: Date; legacyId?: string;
};
const detailKeys = new Set(["method", "reasonCode", "operatorReason", "count", "created", "updated", "deleted", "cancelled", "failed", "skipped", "partnersCreated", "partnersUpdated", "cohortsCreated", "cohortsUpdated", "unavailableSources", "legacy", "cutoff", "issuerId"]);
export async function writeAudit(database: AuditDatabase, event: EventInput) {
  const context = auditStorage.getStore() ?? requestAuditContext({ source: "system" });
  const actor = event.actor ?? (event.actorId ? await auditActor(database, event.actorId) : context.actor);
  const [hub] = event.tenantId ? await database.select({ name: tenants.name, countryCode: tenants.countryCode }).from(tenants).where(eq(tenants.id, event.tenantId)) : [];
  const details: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(event.details ?? {})) if (detailKeys.has(key)) {
    if (typeof value === "string") details[key] = auditText(value, key === "operatorReason" ? 500 : 200);
    else if (typeof value === "number" && Number.isFinite(value) || typeof value === "boolean" || value === null) details[key] = value as number | boolean | null;
  }
  if (event.category === "records") details.scope = hub?.countryCode === "GLOBAL" ? "global" : hub ? "country" : "unavailable";
  await database.insert(auditEvents).values({
    action: event.action, category: event.category ?? "security", outcome: event.outcome ?? "success",
    actor: { kind: actor.kind, id: auditText(actor.id), name: auditText(actor.name), role: auditText(actor.role, 40) },
    tenantId: hub && hub.countryCode !== "GLOBAL" ? event.tenantId : null, tenantName: hub?.name ?? null,
    targetType: auditText(event.targetType, 60) ?? "unknown", targetId: auditText(event.targetId), targetLabel: auditText(event.targetLabel),
    changes: auditChanges(event.before, event.after), details, requestId: context.requestId,
    source: context.source, clientIp: context.clientIp, userAgent: context.userAgent, procedure: auditText(context.procedure, 150),
    ...(event.occurredAt ? { occurredAt: event.occurredAt } : {}), legacyId: event.legacyId,
  });
}
export async function auditFailure(database: AuditDatabase, event: EventInput) {
  try { await database.transaction((tx) => writeAudit(tx, event)); } catch { console.error("Audit event could not be recorded", { requestId: auditStorage.getStore()?.requestId ?? null }); }
}
export async function auditSavepoint<T>(action: () => Promise<T>): Promise<T> {
  const context = auditStorage.getStore();
  if (!context?.transaction) return action();
  return context.transaction.transaction((tx) => withAuditContext({ ...context, transaction: tx }, action));
}
export async function auditedTransaction<T>(database: TransactionalDatabase, action: (tx: AccessTransaction) => Promise<T>): Promise<T> {
  return database.transaction(async (tx) => {
    const context = auditStorage.getStore() ?? requestAuditContext({ source: "system" });
    return withAuditContext({ ...context, transaction: tx }, async () => { await configureAuditTransaction(tx); return action(tx); });
  });
}
