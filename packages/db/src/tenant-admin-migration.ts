import { eq, sql } from "drizzle-orm";
import { tenants, userTenants } from "./schema/epl";
import { invitations } from "./schema/invitations";
import { user } from "./schema/auth";
import { configureAuditTransaction, requestAuditContext, withAuditContext, writeAudit } from "./audit";
import { auditSchemaSql } from "./audit-schema";
import { auditText } from "./audit-policy";
import { revokeAccessSessions } from "./access-sessions";
import type { TransactionalDatabase } from "./index";

type Hub = { id: string; name: string; countryCode: string | null; isActive: boolean | null };
type Membership = { id: string; userId: string; tenantId: string; role: string };
type Invite = { id: string; tenantId: string; role: string; status: string; email: string };
export function tenantAdminMigrationPlan(hubs: Hub[], memberships: Membership[], pending: Invite[]) {
  const globals = hubs.filter(h => h.countryCode === "GLOBAL");
  const global = globals.length === 1 ? globals[0] : undefined;
  const moves = memberships.filter(m => m.role === "tenant_admin" && !globals.some(g => g.id === m.tenantId)).map(({ id, userId, tenantId, role }) => ({ id, userId, tenantId, role }));
  const cancel = pending.filter(i => i.role === "tenant_admin" && i.status === "pending" && !globals.some(g => g.id === i.tenantId)).map(({ id, tenantId, role, status, email }) => ({ id, tenantId, role, status, email }));
  const blockers: string[] = [];
  if (!global?.isActive) blockers.push("Exactly one active EPL Global Platform (GLOBAL) workspace is required.");
  for (const m of moves) {
    const hub = hubs.find(h => h.id === m.tenantId);
    if (hub?.isActive && !memberships.some(other => other.tenantId === m.tenantId && other.role === "country_admin"))
      blockers.push(`Hub ${hub.name} (${hub.id}) needs a Country Admin before membership ${m.id} can move.`);
    if (memberships.some(other => other.id !== m.id && other.userId === m.userId && (other.tenantId === global?.id || moves.some(candidate => candidate.id === other.id))))
      blockers.push(`Account ${m.userId} has conflicting destination memberships. Resolve them before moving ${m.id}.`);
  }
  return { globalId: global?.id ?? null, moves, cancel, blockers: [...new Set(blockers)] };
}
export async function assertTenantAdminAssignments(database: TransactionalDatabase) {
  const hubs = await database.select().from(tenants);
  const members = await database.select().from(userTenants).where(eq(userTenants.role, "tenant_admin"));
  const pending = await database.select().from(invitations).where(eq(invitations.role, "tenant_admin"));
  const globals = hubs.filter(h => h.countryCode === "GLOBAL");
  if (!members.length && !pending.some(i => i.status === "pending")) return;
  if (globals.length !== 1 || !globals[0]?.isActive || members.some(m => m.tenantId !== globals[0]?.id) || pending.some(i => i.status === "pending" && i.tenantId !== globals[0]?.id))
    throw new Error("Tenant Admin assignments require migration. Run pnpm --filter @epl-fellows-platform/db db:migrate-tenant-admins for a dry run; resolve blockers, then rerun with --apply --operator YOUR_ID.");
}
export async function migrateTenantAdmins(database: TransactionalDatabase, input: { apply?: boolean; operator?: string }) {
  const operator = auditText(input.operator);
  if (input.apply && !operator) throw new Error("Supply --operator ID when applying the Tenant Admin migration.");
  const context = { ...requestAuditContext({ source: "cli" }), actor: { kind: "operator" as const, id: operator, name: null, role: null }, procedure: "system.tenant_admin_migration" };
  return withAuditContext(context, () => database.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(158610, 2026)`);
    const hubs = await tx.select().from(tenants).for("update");
    const memberships = await tx.select().from(userTenants);
    const pending = await tx.select().from(invitations).where(eq(invitations.status, "pending"));
    const plan = tenantAdminMigrationPlan(hubs, memberships, pending);
    const people = await tx.select({ id: user.id, name: user.name, email: user.email }).from(user);
    const report = { dryRun: !input.apply, operationId: context.requestId, ...plan,
      moves: plan.moves.map(m => ({ ...m, name: people.find(p => p.id === m.userId)?.name ?? null, hubName: hubs.find(h => h.id === m.tenantId)?.name ?? null })) };
    if (!input.apply || plan.blockers.length) return { ...report, applied: false };
    // Refresh the repeatable audit trigger definition, including explicit global record scope.
    await tx.execute(sql.raw(auditSchemaSql));
    if (!plan.moves.length && !plan.cancel.length) return { ...report, applied: true };
    await configureAuditTransaction(tx);
    for (const m of [...plan.moves].sort((a,b) => a.userId.localeCompare(b.userId))) {
      await revokeAccessSessions(tx, m.userId);
      await tx.update(userTenants).set({ tenantId: plan.globalId!, permissions: {} }).where(eq(userTenants.id, m.id));
      await writeAudit(tx, { action: "membership.role_changed", category: "access", tenantId: plan.globalId,
        targetType: "membership", targetId: m.id, targetLabel: people.find(p => p.id === m.userId)?.name,
        before: { role: m.role, tenantId: m.tenantId }, after: { role: m.role, tenantId: plan.globalId } });
    }
    for (const i of plan.cancel) {
      await tx.update(invitations).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(invitations.id, i.id));
      await writeAudit(tx, { action: "invitation.cancelled", category: "access", tenantId: plan.globalId, targetType: "invitation", targetId: i.id,
        before: { role: i.role, tenantId: i.tenantId, status: "pending" }, after: { status: "cancelled" } });
    }
    await writeAudit(tx, { action: "system.tenant_admin_migration", category: "system", targetType: "membership",
      details: { count: plan.moves.length + plan.cancel.length, updated: plan.moves.length, cancelled: plan.cancel.length } });
    return { ...report, applied: true };
  }));
}
