import { APIError } from "better-auth/api";
import { auditFailure, type AuditDatabase } from "@epl-fellows-platform/db/audit";
/** Invitation services own their commit boundaries; this records only denied attempts. */
export async function auditInvitationAttempt<T>(database: AuditDatabase, path: string, action: () => Promise<T>): Promise<T> {
  try {
    const result = await action();
    const status = result instanceof Response ? result.status : (result as { status?: number })?.status ?? 200;
    if (status >= 400) await auditFailure(database, { action: "operation.failed", category: "security", outcome: status === 401 || status === 403 ? "denied" : "failed",
      targetType: "invitation", details: { reasonCode: String(status) }, targetLabel: path.split("/").pop() });
    return result;
  } catch (error) {
    await auditFailure(database, { action: "operation.failed", category: "security", outcome: error instanceof APIError && [401,403].includes(error.statusCode) ? "denied" : "failed",
      targetType: "invitation", details: { reasonCode: error instanceof APIError ? String(error.statusCode) : "INTERNAL_SERVER_ERROR" }, targetLabel: path.split("/").pop() });
    throw error;
  }
}
