import { experimental_standaloneMiddleware } from "@trpc/server";
import { transactionalDb } from "@epl-fellows-platform/db";
import { anonymousActor, auditedTransaction, auditFailure, requestAuditContext, withAuditContext, writeAudit, auditStorage } from "@epl-fellows-platform/db/audit";
import type { Context } from "../context";
export const auditMiddleware = experimental_standaloneMiddleware<{ ctx: Context }>().create(async ({ ctx, path, type, next }) => {
  const context = { ...(ctx.audit ?? requestAuditContext()), requestId: requestAuditContext().requestId, procedure: path,
    actor: ctx.session?.user ? { kind: "user" as const, id: ctx.session.user.id, name: ctx.session.user.name, role: ctx.role } : { ...anonymousActor } };
  // Authentication-state probes can finish after sign-out or session expiry.
  // They still return 401, but do not represent access to protected records.
  const expectedStatusPoll = (code: string) => type === "query" && path === "account.mfaStatus" && !ctx.session?.user && code === "UNAUTHORIZED";
  return withAuditContext(context, async () => {
    // These services already commit their own transactions before submitting email.
    const managed = path.startsWith("users.") || path === "tenants.createWithInvitation";
    const run = async () => {
      if (type !== "mutation" || managed) return next();
      return auditedTransaction(transactionalDb, async (tx) => {
        const result = await next();
        if (!result.ok) throw result.error;
        const data = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
        const failed = Array.isArray(data.errors) ? data.errors.length : 0;
        // Summary scope comes from committed trigger events, never a requested hub ID.
        const { auditEvents } = await import("@epl-fellows-platform/db/schema/audit");
        const { eq } = await import("drizzle-orm");
        const committed = await tx.select({ tenantId: auditEvents.tenantId, action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.requestId, context.requestId));
        const hubs = [...new Set(committed.map((row) => row.tenantId))];
        await writeAudit(tx, { action: "operation.completed", category: "records", outcome: failed ? "partial" : "success",
          tenantId: hubs.length === 1 ? hubs[0] : hubs.length === 0 ? auditStorage.getStore()?.resolvedTenantId : null, targetType: path.split(".")[0]!, targetLabel: path,
          details: { count: committed.length, created: committed.filter((row) => row.action.endsWith(".created")).length,
            updated: committed.filter((row) => [".updated", ".archived", ".status_changed"].some((suffix) => row.action.endsWith(suffix))).length, deleted: committed.filter((row) => row.action.endsWith(".deleted")).length,
            ...Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === "number")), failed } });
        return result;
      });
    };
    try {
      const result = await run();
      if (!result.ok && !expectedStatusPoll(result.error.code) && (type === "mutation" || ["FORBIDDEN", "UNAUTHORIZED"].includes(result.error.code))) {
        await auditFailure(transactionalDb, { action: "operation.failed", category: "security",
          outcome: ["FORBIDDEN", "UNAUTHORIZED"].includes(result.error.code) ? "denied" : "failed",
          targetType: "operation", targetLabel: path, details: { reasonCode: result.error.code } });
      }
      return result;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "INTERNAL_SERVER_ERROR";
      if (!expectedStatusPoll(code)) await auditFailure(transactionalDb, { action: "operation.failed", category: "security", outcome: ["FORBIDDEN", "UNAUTHORIZED"].includes(code) ? "denied" : "failed",
        targetType: "operation", targetLabel: path, details: { reasonCode: code } });
      throw error;
    }
  });
});
