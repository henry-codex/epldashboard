import { and, eq, like, ne, or, sql } from "drizzle-orm";
import { activityLog, tenants, userTenants, type AccessTransaction, type TransactionalDatabase } from "@epl-fellows-platform/db";
import { session, user, verification, twoFactor, passkey, mfaChallenge } from "@epl-fellows-platform/db/schema/auth";
import { mfaStatus } from "./mfa-policy";
import { writeAudit, withAuditContext, requestAuditContext } from "@epl-fellows-platform/db/audit";
import type { AuditAction } from "@epl-fellows-platform/db/audit-policy";

export type MfaDatabase = TransactionalDatabase | AccessTransaction;
export async function getMfaStatus(database: MfaDatabase, userId: string, sessionId: string) {
  const [person] = await database.select().from(user).where(eq(user.id, userId));
  const [device] = await database.select().from(session).where(and(eq(session.id, sessionId), eq(session.userId, userId)));
  if (!person || !device || device.expiresAt <= new Date()) return null;
  const memberships = await database.select({ role: userTenants.role }).from(userTenants).where(eq(userTenants.userId, userId));
  const keys = await database.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, userId));
  return mfaStatus({ roles: memberships.map((row) => row.role), enabled: person.twoFactorEnabled,
    totpEnabled: person.totpEnabled, emailOtpEnabled: person.emailOtpEnabled, passkeyCount: keys.length,
    backupCodes: Boolean(person.mfaBackupCodes && person.mfaBackupCodesConfirmed),
    verifiedAt: device.mfaVerifiedAt, verificationMethod: device.mfaVerificationMethod });
}
export async function lockMfaAccount(database: MfaDatabase, userId: string) {
  await database.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'epl-mfa:' + userId}, 0))`);
}
export async function clearMfaChallenges(database: MfaDatabase, userId: string) {
  await database.delete(mfaChallenge).where(eq(mfaChallenge.userId, userId));
  await database.update(user).set({ mfaSecurityChangedAt: new Date() }).where(eq(user.id, userId));
  await database.delete(verification).where(and(eq(verification.value, userId), or(like(verification.identifier, "2fa-%"), like(verification.identifier, "trust-device-%"))));
}
export async function revokeMfaSessions(database: MfaDatabase, userId: string, keepId?: string) {
  await database.delete(session).where(and(eq(session.userId, userId), keepId ? ne(session.id, keepId) : undefined));
  await clearMfaChallenges(database, userId);
}
export async function auditMfa(database: MfaDatabase, userId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  const [global] = await database.select({ id: tenants.id }).from(tenants).where(eq(tenants.countryCode, "GLOBAL")).limit(1);
  if (!global) throw new Error("MFA audit requires the Global hub. Run the trusted bootstrap first.");
  const [legacy] = await database.insert(activityLog).values({ tenantId: global.id, eventType, description: eventType, metadata: { userId, ...metadata } }).returning({ id: activityLog.id });
  await writeAudit(database, { action: eventType as AuditAction, actorId: metadata.operator ? undefined : userId,
    ...(metadata.operator ? { actor: { kind: "operator" as const, id: String(metadata.operator), name: null, role: null } } : {}),
    targetType: metadata.passkeyId ? "passkey" : "account", targetId: metadata.passkeyId ? String(metadata.passkeyId) : userId,
    before: eventType === "mfa.passkey_renamed" ? { name: metadata.previousName } : undefined, after: eventType === "mfa.passkey_renamed" ? { name: metadata.name } : undefined,
    legacyId: legacy?.id, details: { method: metadata.method, operatorReason: metadata.reason } });
}
export async function resetMfaForRecovery(database: TransactionalDatabase, input: { userId: string; operator: string; reason: string }) {
  if (!input.userId.trim() || !input.operator.trim() || !input.reason.trim()) throw new Error("User ID, operator identity and recovery reason are required.");
  await withAuditContext({ ...requestAuditContext({ source: "cli" }), actor: { kind: "operator", id: input.operator, name: null, role: null }, procedure: "mfa.operator_recovery" }, () => database.transaction(async (tx) => {
    await lockMfaAccount(tx, input.userId);
    const [person] = await tx.select({ id: user.id }).from(user).where(eq(user.id, input.userId));
    if (!person) throw new Error("The exact user ID was not found.");
    await tx.delete(twoFactor).where(eq(twoFactor.userId, input.userId));
    await tx.delete(passkey).where(eq(passkey.userId, input.userId));
    await tx.update(user).set({ twoFactorEnabled: false, totpEnabled: false, emailOtpEnabled: false, mfaBackupCodes: null, mfaBackupCodesConfirmed: false, mfaFailedAttempts: 0, mfaLockedUntil: null }).where(eq(user.id, input.userId));
    await revokeMfaSessions(tx, input.userId);
    await auditMfa(tx, input.userId, "mfa.operator_recovery", { operator: input.operator, reason: input.reason });
  }));
}
