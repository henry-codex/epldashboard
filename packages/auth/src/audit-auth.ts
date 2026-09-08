import { anonymousActor, auditActor, auditFailure, writeAudit, type AuditDatabase } from "@epl-fellows-platform/db/audit";
import type { AuditAction } from "@epl-fellows-platform/db/audit-policy";
const actions: Record<string, AuditAction> = {
  "/sign-in/email": "auth.sign_in", "/sign-out": "auth.sign_out", "/revoke-session": "auth.session_revoked",
  "/revoke-other-sessions": "auth.sessions_revoked", "/revoke-sessions": "auth.sessions_revoked",
  "/change-password": "auth.password_changed", "/reset-password": "auth.password_reset",
  "/request-password-reset": "auth.password_reset_requested", "/update-user": "auth.profile_updated",
  "/sign-up/email": "auth.signup_denied", "/two-factor/send-otp": "mfa.email_submitted", "/two-factor/email-enroll": "mfa.email_submitted",
};
export async function auditAuthOutcome(database: AuditDatabase, input: {
  path: string; userId?: string; sessionId?: string; beforeName?: string; name?: unknown;
  response?: unknown; restricted?: boolean; targetType?: string; targetId?: string; failed?: boolean; reasonCode?: string; locked?: boolean;
}) {
  const data = input.response && typeof input.response === "object" ? input.response as Record<string, unknown> : {};
  const verifying = ["/two-factor/verify-totp", "/two-factor/verify-backup-code", "/two-factor/verify-otp", "/passkey/verify-authentication"].includes(input.path);
  let action = actions[input.path] ?? (verifying ? "auth.verification" : input.failed ? "operation.failed" : undefined);
  if (!action) return;
  if (input.path === "/sign-in/email" && (data.twoFactorRedirect || input.restricted)) action = "auth.challenge_issued";
  const authenticatedManagement = Boolean(input.sessionId) && input.path !== "/sign-in/email" && !verifying;
  const actor = input.userId && (!input.failed || authenticatedManagement) && input.path !== "/request-password-reset"
    ? await auditActor(database, input.userId) : { ...anonymousActor };
  const method = input.path.includes("backup-code") ? "backup" : input.path.includes("totp") ? "authenticator" : input.path.includes("passkey") ? "passkey" : input.path.includes("otp") ? "email" : undefined;
  const failed = input.failed || data.sent === false;
  const event = { action, actor, targetType: input.targetType ?? "account",
    targetId: input.path === "/request-password-reset" ? null : input.targetId ?? input.userId,
    outcome: failed ? (["FORBIDDEN", "UNAUTHORIZED", "MFA_ACCOUNT_LOCKED"].includes(input.reasonCode ?? "") ? "denied" as const : "failed" as const) : "success" as const,
    details: { reasonCode: input.restricted ? "MFA_ENROLLMENT_REQUIRED" : input.reasonCode, method },
    before: action === "auth.profile_updated" ? { name: input.beforeName } : undefined,
    after: action === "auth.profile_updated" ? { name: input.name } : undefined };
  if (input.failed) await auditFailure(database, event); else await writeAudit(database, event);
  if (verifying && !failed && input.userId && !input.sessionId) await writeAudit(database, { action: "auth.sign_in", actor, targetType: "account", targetId: input.userId, details: { method } });
  if (input.locked) await auditFailure(database, { action: "auth.account_locked", actor: { ...anonymousActor }, outcome: "denied", targetType: "account", targetId: input.userId });
}
