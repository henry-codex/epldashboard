import { randomBytes, randomInt, randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { expireCookie, setSessionCookie } from "better-auth/cookies";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { user, session, verification, passkey, mfaChallenge } from "@epl-fellows-platform/db/schema/auth";
import { userTenants } from "@epl-fellows-platform/db";
import type { MfaRuntime } from "./mfa-runtime";
import { mfaStatus, type MfaMethod } from "./mfa-policy";
import { auditMfa, revokeMfaSessions } from "./mfa-store";

export type SecurityContext = Parameters<typeof getSessionFromCtx>[0];
export function expiredChallenge(): never {
  throw new APIError("UNAUTHORIZED", { code: "INVALID_TWO_FACTOR_COOKIE", message: "This verification has expired. Sign in again." });
}
export function invalidCode(backup = false): never {
  throw new APIError("UNAUTHORIZED", { code: backup ? "INVALID_BACKUP_CODE" : "INVALID_CODE", message: "Invalid or already-used code. Try again." });
}
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return (local?.slice(0, 1) ?? "") + "***@" + domain;
}
export function otpHash(secret: string, data: { id: string; userId: string; binding: string; purpose: string }, code: string) {
  return createHmac("sha256", secret).update(JSON.stringify(["epl-email-otp-v1", data.id, data.userId, data.binding, data.purpose, code])).digest("hex");
}
export function equalHash(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function newEmailCode() { return randomInt(0, 1000000).toString().padStart(6, "0"); }

export async function accountStatus(runtime: MfaRuntime, userId: string, sessionId?: string) {
  const db = runtime.current();
  const [person] = await db.select().from(user).where(eq(user.id, userId));
  if (!person) return expiredChallenge();
  const roles = await db.select({ role: userTenants.role }).from(userTenants).where(eq(userTenants.userId, userId));
  const keys = await db.select().from(passkey).where(eq(passkey.userId, userId));
  const [device] = sessionId ? await db.select().from(session).where(and(eq(session.id, sessionId), eq(session.userId, userId))) : [];
  return { person, keys, status: mfaStatus({
    roles: roles.map((row) => row.role), enabled: person.twoFactorEnabled, totpEnabled: person.totpEnabled,
    emailOtpEnabled: person.emailOtpEnabled, passkeyCount: keys.length,
    backupCodes: Boolean(person.mfaBackupCodes && person.mfaBackupCodesConfirmed),
    verifiedAt: device?.mfaVerifiedAt, verificationMethod: device?.mfaVerificationMethod,
  }) };
}
export async function challengeIdentity(runtime: MfaRuntime, ctx: SecurityContext) {
  const identity = await getSessionFromCtx(ctx);
  if (identity) return { userId: identity.user.id, sessionId: identity.session.id, binding: identity.session.id, identity };
  const name = ctx.context.createAuthCookie("two_factor").name;
  const token = await ctx.getSignedCookie(name, ctx.context.secret);
  const [row] = token ? await runtime.current().select().from(verification).where(eq(verification.identifier, token)) : [];
  if (!row || row.expiresAt <= new Date()) return expiredChallenge();
  return { userId: row.value, sessionId: undefined, binding: row.identifier, identity: null };
}
export async function requirePassword(ctx: SecurityContext, userId: string) {
  const body = ctx.body as { password?: unknown } | undefined;
  if (typeof body?.password !== "string" || !body.password || body.password.length > 128) throw new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Enter your current password." });
  await ctx.context.password.checkPassword(userId, ctx);
}
export async function ensureBackupCodes(runtime: MfaRuntime, ctx: SecurityContext, userId: string, regenerate = false) {
  const db = runtime.current();
  const [person] = await db.select().from(user).where(eq(user.id, userId));
  if (!person) return expiredChallenge();
  if (person.mfaBackupCodes && !regenerate) {
    return person.mfaBackupCodesConfirmed ? [] : JSON.parse(await symmetricDecrypt({ key: ctx.context.secret, data: person.mfaBackupCodes })) as string[];
  }
  const codes = Array.from({ length: 10 }, () => { const raw = randomBytes(8).toString("hex"); return raw.slice(0, 8) + "-" + raw.slice(8); });
  await db.update(user).set({ mfaBackupCodes: await symmetricEncrypt({ key: ctx.context.secret, data: JSON.stringify(codes) }), mfaBackupCodesConfirmed: false }).where(eq(user.id, userId));
  return codes;
}
export async function acknowledgeCodes(runtime: MfaRuntime, userId: string, saved: boolean) {
  const [person] = await runtime.current().select().from(user).where(eq(user.id, userId));
  if (!person?.mfaBackupCodesConfirmed && !saved) throw new APIError("BAD_REQUEST", { code: "BACKUP_CODES_NOT_SAVED", message: "Save your backup codes and confirm before enabling protection." });
  if (saved) await runtime.current().update(user).set({ mfaBackupCodesConfirmed: true }).where(eq(user.id, userId));
}
export async function syncEnabled(runtime: MfaRuntime, userId: string) {
  const { person, keys } = await accountStatus(runtime, userId);
  await runtime.current().update(user).set({ twoFactorEnabled: person.totpEnabled || person.emailOtpEnabled || keys.length > 0 }).where(eq(user.id, userId));
}
export async function completeVerification(runtime: MfaRuntime, ctx: SecurityContext, userId: string, method: MfaMethod, enrollment = false) {
  const identity = await getSessionFromCtx(ctx);
  if (identity && identity.user.id !== userId) throw new APIError("FORBIDDEN", { code: "WRONG_ACCOUNT", message: "Switch to the account that owns this method." });
  const db = runtime.current();
  let device = identity?.session;
  if (!device || enrollment) {
    const created = await ctx.context.internalAdapter.createSession(userId);
    if (!created) throw new Error("Could not create verified session");
    device = created;
    if (identity) await ctx.context.internalAdapter.deleteSession(identity.session.token);
  }
  await db.update(session).set({ mfaVerifiedAt: new Date(), mfaVerificationMethod: method }).where(eq(session.id, device.id));
  const person = await ctx.context.internalAdapter.findUserById(userId);
  if (!person) return expiredChallenge();
  await setSessionCookie(ctx, { session: device, user: person });
  const challengeCookie = ctx.context.createAuthCookie("two_factor");
  const challenge = await ctx.getSignedCookie(challengeCookie.name, ctx.context.secret);
  if (challenge) {
    await db.delete(verification).where(and(eq(verification.identifier, challenge), eq(verification.value, userId)));
    await db.delete(mfaChallenge).where(and(eq(mfaChallenge.userId, userId), eq(mfaChallenge.binding, challenge)));
  }
  expireCookie(ctx, challengeCookie);
  if (enrollment) {
    await revokeMfaSessions(db, userId, device.id);
    await auditMfa(db, userId, "mfa.enabled", { method });
  }
  return { status: true };
}
export function base32(value: string) {
  let bits = 0, buffer = 0, result = "";
  for (const byte of Buffer.from(value)) {
    buffer = (buffer << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; result += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(buffer >>> bits) & 31]; }
  }
  if (bits) result += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(buffer << (5 - bits)) & 31];
  return result;
}
export async function prepareGrant(runtime: MfaRuntime, userId: string, binding: string, purpose: string, data?: string) {
  await runtime.current().delete(mfaChallenge).where(and(eq(mfaChallenge.userId, userId), eq(mfaChallenge.binding, binding), eq(mfaChallenge.purpose, purpose)));
  const id = randomUUID();
  await runtime.current().insert(mfaChallenge).values({ id, userId, binding, purpose, data, expiresAt: new Date(Date.now() + 600000) });
  return id;
}
export async function requireGrant(runtime: MfaRuntime, userId: string, binding: string, purpose: string) {
  const [grant] = await runtime.current().select().from(mfaChallenge).where(and(eq(mfaChallenge.userId, userId), eq(mfaChallenge.binding, binding), eq(mfaChallenge.purpose, purpose)));
  if (!grant || grant.expiresAt <= new Date()) throw new APIError("UNAUTHORIZED", { code: "ENROLLMENT_EXPIRED", message: "Setup expired. Confirm your password and start again." });
  return grant;
}
