import { eq, isNull } from "drizzle-orm";
import { activityLog } from "./schema/epl";
import { auditEvents } from "./schema/audit";
import { auditActions, type AuditAction } from "./audit-policy";
import { writeAudit, type AuditDatabase } from "./audit";
export async function backfillAudit(database: AuditDatabase) {
  const rows = await database.select({ legacy: activityLog }).from(activityLog)
    .leftJoin(auditEvents, eq(auditEvents.legacyId, activityLog.id)).where(isNull(auditEvents.id));
  let count = 0;
  for (const { legacy: row } of rows) {
    if (!auditActions.includes(row.eventType)) continue;
    const data = row.metadata as Record<string, unknown> ?? {};
    const operator = typeof data.operator === "string" ? data.operator : null;
    const actorId = typeof data.actorId === "string" ? data.actorId : null;
    // Existing MFA userId identifies the subject; do not invent a historical actor.
    await writeAudit(database, {
      action: row.eventType as AuditAction, category: row.eventType.startsWith("mfa.") ? "security" : "access",
      actor: { kind: operator ? "operator" : actorId ? "user" : "system", id: operator ?? actorId, name: null, role: null },
      tenantId: row.eventType.startsWith("mfa.") ? null : row.tenantId,
      targetType: row.eventType.split(".")[0]!, targetId: [data.invitationId, data.membershipId, data.userId].find((v) => typeof v === "string") as string | undefined,
      occurredAt: row.createdAt, legacyId: row.id, details: { legacy: true },
      before: typeof data.previousRole === "string" ? { role: data.previousRole } : undefined,
      after: typeof data.role === "string" ? { role: data.role } : undefined,
    }); count++;
  }
  return count;
}
