import { AsyncLocalStorage } from "node:async_hooks";
import { auditAuthOutcome } from "./audit-auth";
import { auditInvitationAttempt } from "./audit-invitation";
import { auditStorage, requestAuditContext, withAuditContext } from "@epl-fellows-platform/db/audit";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { makeSignature } from "better-auth/crypto";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "@epl-fellows-platform/db/schema/auth";
import { session, user, verification, passkey, mfaChallenge } from "@epl-fellows-platform/db/schema/auth";
import { clearMfaChallenges, getMfaStatus, lockMfaAccount, type MfaDatabase } from "./mfa-store";

import { revokeRememberedBrowsers } from "@epl-fellows-platform/db/mfa-browsers";
type Scope = { rememberedMethod?: string; database: MfaDatabase; userId?: string; sessionId?: string; challenge?: string; afterCommit?: Array<() => void> };
type CookieConfig = { session: string; challenge: string; passkey: string };
type Outcome<T> = { value: T } | { error: unknown };
class FailedResponse { constructor(readonly value: unknown, readonly code?: string) {} }
const verificationPaths = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code", "/two-factor/verify-otp", "/passkey/verify-authentication", "/passkey/verify-registration"]);
const enrollmentPaths = new Set(["/two-factor/enable", "/two-factor/email-enroll", "/two-factor/passkey-prepare", "/two-factor/ack-backup-codes", "/passkey/generate-register-options", "/passkey/verify-registration"]);
const managedPaths = new Set(["/two-factor/disable", "/two-factor/replace", "/two-factor/generate-backup-codes", "/two-factor/email-disable", "/passkey/delete-passkey"]);
const restrictedAllowed = new Set(["/get-session", "/sign-out", "/two-factor/forget-browser", "/two-factor/challenge-status", "/two-factor/get-totp-uri", "/two-factor/send-otp", "/passkey/generate-authenticate-options", ...enrollmentPaths, ...verificationPaths]);

export async function signedCookie(headers: Headers | undefined, name: string, secret: string) {
  const part = headers?.get("cookie")?.split(";").map((p) => p.trim()).find((p) => p.startsWith(name + "="));
  if (!part) return null;
  try {
    const raw = decodeURIComponent(part.slice(name.length + 1)), dot = raw.lastIndexOf(".");
    if (dot < 1) return null;
    const value = raw.slice(0, dot), actual = Buffer.from(raw.slice(dot + 1)), expected = Buffer.from(await makeSignature(value, secret));
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? value : null;
  } catch { return null; }
}
/** RFC 6238; Better Auth's decrypted secret is the original UTF-8 key. */
export function matchingTotpStep(secret: string, code: unknown, now = Date.now()) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30000);
  for (const step of [current, current - 1, current + 1]) {
    const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac("sha1", secret).update(counter).digest(), offset = digest[digest.length - 1]! & 15;
    const expected = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return step;
  }
  return null;
}
export function createMfaRuntime(database: MfaDatabase, secret: string, rateLimit = false) {
  const storage = new AsyncLocalStorage<Scope>();
  const current = () => storage.getStore()?.database ?? database;
  let cookies: CookieConfig = { session: "better-auth.session_token", challenge: "better-auth.two_factor", passkey: "better-auth.epl_passkey" };
  function adapter(base: Parameters<typeof drizzleAdapter>[0]) {
    const factory = drizzleAdapter(base, { provider: "pg", schema: authSchema });
    return (config: Parameters<typeof factory>[0]) => {
      const original = factory(config), adapters = new WeakMap<object, typeof original>();
      return new Proxy(original, { get(target, property) {
        const value = Reflect.get(target, property);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          const scoped = storage.getStore()?.database;
          if (!scoped) return Reflect.apply(value, target, args);
          let active = adapters.get(scoped);
          if (!active) { active = drizzleAdapter(scoped, { provider: "pg", schema: authSchema })(config); adapters.set(scoped, active); }
          return Reflect.apply(Reflect.get(active, property), active, args);
        };
      } });
    };
  }
  async function identify(headers: Headers | undefined, body: Record<string, unknown>, path: string): Promise<Omit<Scope, "database">> {
    const db = current();
    if (path === "/passkey/verify-authentication") {
      const response = body.response as { id?: unknown } | undefined;
      const [key] = typeof response?.id === "string" ? await db.select({ userId: passkey.userId }).from(passkey).where(eq(passkey.credentialID, response.id)) : [];
      const token = await signedCookie(headers, cookies.passkey, secret);
      const [challenge] = token ? await db.select({ userId: mfaChallenge.userId }).from(mfaChallenge).where(eq(mfaChallenge.id, token)) : [];
      return { userId: challenge?.userId ?? key?.userId };
    }
    const token = await signedCookie(headers, cookies.session, secret);
    if (token && !["/sign-in/email", "/reset-password"].includes(path)) {
      const [device] = await db.select().from(session).where(eq(session.token, token));
      if (device && device.expiresAt > new Date()) return { userId: device.userId, sessionId: device.id };
    }
    if (path === "/sign-in/email" && typeof body.email === "string") {
      const [person] = await db.select({ id: user.id }).from(user).where(eq(user.email, body.email.trim().toLowerCase()));
      return { userId: person?.id };
    }
    if (path === "/reset-password" && typeof body.token === "string") {
      const [record] = await db.select().from(verification).where(eq(verification.identifier, "reset-password:" + body.token));
      return { userId: record?.value };
    }
    const challenge = await signedCookie(headers, cookies.challenge, secret);
    if (challenge) {
      const [record] = await db.select().from(verification).where(eq(verification.identifier, challenge));
      return { userId: record?.value, challenge };
    }
    return {};
  }
  async function authorize(path: string, body: Record<string, unknown>, identity: { user: { id: string }; session: { id: string } } | null) {
    if (body.trustDevice === true) throw new APIError("BAD_REQUEST", { code: "TRUSTED_DEVICES_DISABLED", message: "This browser is remembered automatically after verification; custom trust requests are not supported." });
    if (body.disableSession === true) throw new APIError("BAD_REQUEST", { message: "Session-free verification is not supported." });
    if (path === "/two-factor/get-totp-uri") throw new APIError("BAD_REQUEST", { message: "Start authenticator setup to obtain a setup key." });
    if (path === "/two-factor/view-backup-codes") throw new APIError("NOT_FOUND", { message: "Backup codes are shown only when generated." });
    if (!identity || ["/sign-in/email", "/request-password-reset", "/reset-password", "/sign-up/email", "/invitations/preview"].includes(path) || path.startsWith("/reset-password/")) return;
    const status = await getMfaStatus(current(), identity.user.id, identity.session.id);
    if (!status) throw new APIError("UNAUTHORIZED", { message: "Sign in again." });
    if (status.reason && !restrictedAllowed.has(path)) throw new APIError("FORBIDDEN", { code: status.reason, message: status.reason === "MFA_ENROLLMENT_REQUIRED" ? "Set up an authenticator or passkey before continuing." : "Verify before continuing." });
    if ((managedPaths.has(path) || (enrollmentPaths.has(path) && path !== "/two-factor/ack-backup-codes" && status.enabled)) && !status.fresh) {
      throw new APIError("FORBIDDEN", { code: "MFA_FRESH_VERIFICATION_REQUIRED", message: "Verify an eligible method before changing account security." });
    }
  }
  async function consumeIpLimit(tx: MfaDatabase, headers: Headers | undefined, sending: boolean) {
    const identifier = (sending ? "mfa-send-rate:" : "mfa-rate:") + createHash("sha256").update(headers?.get("x-epl-client-ip") ?? "unknown").digest("hex");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${identifier}, 0))`);
    const [limit] = await tx.select().from(verification).where(eq(verification.identifier, identifier));
    const count = limit && limit.expiresAt > new Date() ? Number(limit.value) : 0;
    if (count >= (sending ? 3 : 5)) throw new APIError("TOO_MANY_REQUESTS", { code: "MFA_RATE_LIMITED", message: "Too many attempts. Wait one minute and try again." });
    await tx.delete(verification).where(eq(verification.identifier, identifier));
    await tx.insert(verification).values({ id: randomUUID(), identifier, value: String(count + 1), expiresAt: count ? limit!.expiresAt : new Date(Date.now() + 60000) });
  }
  async function run<T>(path: string, body: Record<string, unknown>, headers: Headers | undefined, action: () => Promise<T>): Promise<T> {
    if (auditStorage.getStore()?.procedure !== path) return withAuditContext({ ...(auditStorage.getStore() ?? requestAuditContext({ userAgent: headers?.get("user-agent") ?? undefined })), procedure: path }, () => run(path, body, headers, action));
    if (path.startsWith("/invitations/") && !storage.getStore()) return auditInvitationAttempt(database, path, action);
    if (storage.getStore() || (!path.startsWith("/two-factor/") && !path.startsWith("/passkey/") && !["/sign-in/email", "/reset-password", "/change-password", "/sign-out", "/revoke-session", "/revoke-other-sessions", "/revoke-sessions", "/request-password-reset", "/update-user", "/sign-up/email"].includes(path))) return action();
    const afterCommit: Array<() => void> = [];
    const outcome: Outcome<T> = await database.transaction(async (tx) => storage.run({ database: tx, afterCommit }, async () => {
      const scope = storage.getStore()!, verifying = verificationPaths.has(path);
      if (rateLimit && (verifying || ["/two-factor/send-otp", "/two-factor/email-enroll"].includes(path))) await consumeIpLimit(tx, headers, !verifying);
      // Serialize consumption even when an anonymous challenge is submitted with different credentials.
      if (path.startsWith("/passkey/verify-")) {
        const challenge = await signedCookie(headers, cookies.passkey, secret);
        if (challenge) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"epl-passkey:" + challenge}, 0))`);
      }
      Object.assign(scope, await identify(headers, body, path));
      if (scope.userId) {
        await lockMfaAccount(tx, scope.userId);
        Object.assign(scope, { userId: undefined, sessionId: undefined, challenge: undefined }, await identify(headers, body, path));
      }
      const person = scope.userId ? (await tx.select().from(user).where(eq(user.id, scope.userId)))[0] : null;
      const [revokedDevice] = path === "/revoke-session" && scope.userId && typeof body.token === "string"
        ? await tx.select({ id: session.id, browserId: session.mfaBrowserId }).from(session).where(and(eq(session.token, body.token), eq(session.userId, scope.userId))) : [];
      const previous = scope.userId && path === "/change-password" ? await tx.select().from(session).where(eq(session.userId, scope.userId)) : [];
      try {
        const value = await tx.transaction(async (savepoint) => {
          scope.database = savepoint;
          if (verifying && person?.mfaLockedUntil && person.mfaLockedUntil > new Date()) throw new APIError("TOO_MANY_REQUESTS", { code: "MFA_ACCOUNT_LOCKED", message: "Too many incorrect attempts. Try again in 15 minutes." });
          const result = await action();
          const envelope = result as { response?: unknown; status?: number };
          const response = result instanceof Response ? await result.clone().json().catch(() => ({})) : envelope?.response ?? result;
          const status = result instanceof Response ? result.status : envelope?.status ?? 200;
          if (status >= 400) {
            // A savepoint rollback must not replace the browser's valid session
            // with cookies for a session that never committed.
            let failure: unknown = result;
            if (result instanceof Response) {
              const headers = new Headers(result.headers); headers.delete("set-cookie");
              failure = status >= 500
                ? Response.json({ code: "MFA_UNAVAILABLE", message: "Account security is temporarily unavailable. Please try again." }, { status: 503, headers })
                : new Response(result.body, { status, headers });
            }
            throw new FailedResponse(failure, (response as { code?: string })?.code);
          }
          if (scope.userId) {
            if (verifying) await savepoint.update(user).set({ mfaFailedAttempts: 0, mfaLockedUntil: null }).where(eq(user.id, scope.userId));
            if (path === "/change-password") {
              const proof = previous.find((row) => row.id === scope.sessionId);
              const devices = await savepoint.select().from(session).where(eq(session.userId, scope.userId));
              const device = devices.find((row) => !previous.some((old) => old.id === row.id)) ?? devices.find((row) => row.id === scope.sessionId);
              if (device && proof) await savepoint.update(session).set({ mfaVerifiedAt: proof.mfaVerifiedAt, mfaVerificationMethod: proof.mfaVerificationMethod, mfaBrowserId: null }).where(eq(session.id, device.id));
              await revokeRememberedBrowsers(savepoint, scope.userId, { reason: "PASSWORD_CHANGED", keepSessionId: device?.id });
            }
            if (path === "/reset-password" || path === "/revoke-sessions") await revokeRememberedBrowsers(savepoint, scope.userId, { reason: path === "/reset-password" ? "PASSWORD_RESET" : "SESSIONS_REVOKED" });
            if (path === "/revoke-other-sessions") {
              const [currentSession] = await savepoint.select().from(session).where(eq(session.id, scope.sessionId!));
              await revokeRememberedBrowsers(savepoint, scope.userId, { exceptId: currentSession?.mfaBrowserId, keepSessionId: scope.sessionId, reason: "OTHER_SESSIONS_REVOKED" });
            }
            if (revokedDevice?.browserId) await revokeRememberedBrowsers(savepoint, scope.userId, { onlyId: revokedDevice.browserId, reason: "SESSION_REVOKED" });
            if (["/change-password", "/reset-password", "/sign-out", "/revoke-other-sessions", "/revoke-sessions"].includes(path)) await clearMfaChallenges(savepoint, scope.userId);
          }
          let restricted = false;
          if (path === "/sign-in/email" && scope.userId && !(response as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
            const [device] = await savepoint.select({ id: session.id }).from(session).where(eq(session.userId, scope.userId)).orderBy(desc(session.createdAt)).limit(1);
            restricted = device ? Boolean((await getMfaStatus(savepoint, scope.userId, device.id))?.reason) : false;
          }
          await auditAuthOutcome(savepoint, { path, userId: scope.userId, sessionId: scope.sessionId, beforeName: person?.name, name: body.name, response, restricted, rememberedMethod: scope.rememberedMethod,
            targetType: revokedDevice || path === "/sign-out" ? "session" : undefined,
            targetId: revokedDevice?.id ?? (path === "/sign-out" ? scope.sessionId : undefined) });
          return result;
        });
        return { value };
      } catch (error) {
        scope.database = tx;
        const code = error instanceof FailedResponse ? error.code : error instanceof APIError ? error.body?.code : undefined;
        if (verifying && scope.userId && ["INVALID_CODE", "INVALID_BACKUP_CODE", "PASSKEY_VERIFICATION_FAILED"].includes(code ?? "")) {
          const attempts = person?.mfaLockedUntil && person.mfaLockedUntil <= new Date() ? 1 : (person?.mfaFailedAttempts ?? 0) + 1;
          await tx.update(user).set({ mfaFailedAttempts: attempts, mfaLockedUntil: attempts >= 10 ? new Date(Date.now() + 900000) : null }).where(eq(user.id, scope.userId));
        }
        await auditAuthOutcome(tx, { path, userId: scope.userId, sessionId: scope.sessionId, failed: true, reasonCode: code,
          locked: verifying && (person?.mfaFailedAttempts ?? 0) === 9 && ["INVALID_CODE", "INVALID_BACKUP_CODE", "PASSKEY_VERIFICATION_FAILED"].includes(code ?? "") });
        afterCommit.length = 0;
        return error instanceof FailedResponse ? { value: error.value as T } : { error };
      } finally { scope.database = tx; }
    })).catch(async (error) => {
      await auditAuthOutcome(database, { path, failed: true, reasonCode: error instanceof APIError ? error.body?.code : "INTERNAL_SERVER_ERROR" });
      throw error;
    });
    if ("error" in outcome) throw outcome.error;
    for (const callback of afterCommit) callback();
    return outcome.value;
  }
  return { adapter, current, authorize, run, markRemembered: (method: string) => { const scope = storage.getStore(); if (scope) scope.rememberedMethod = method; }, afterCommit: (callback: () => void) => { const scope = storage.getStore(); if (scope?.afterCommit) scope.afterCommit.push(callback); else callback(); }, scope: () => storage.getStore(), setCookies: (config: CookieConfig) => { cookies = config; } };
}
export type MfaRuntime = ReturnType<typeof createMfaRuntime>;
