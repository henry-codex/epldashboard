import { randomUUID, randomBytes } from "node:crypto";
import { APIError, createAuthEndpoint, getSessionFromCtx, sessionMiddleware } from "better-auth/api";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { user, session, verification, twoFactor, mfaChallenge, mfaEmailSend } from "@epl-fellows-platform/db/schema/auth";
import { matchingTotpStep, type MfaRuntime } from "./mfa-runtime";
import { auditMfa, revokeMfaSessions } from "./mfa-store";
import { MFA_ISSUER } from "./mfa-policy";
import { accountStatus, acknowledgeCodes, base32, challengeIdentity, completeVerification, ensureBackupCodes, equalHash, invalidCode, maskEmail, newEmailCode, otpHash, prepareGrant, requireGrant, requirePassword, syncEnabled, type SecurityContext } from "./mfa-methods";

const passwordBody = z.object({ password: z.string().min(1).max(128) });
const codeBody = z.object({ code: z.string().max(64), backupCodesSaved: z.boolean().optional() });
const emailPurpose = z.enum(["login", "enrollment"]).default("login");
export type OtpSender = (data: { to: string; code: string; purpose: "login" | "enrollment" }) => Promise<unknown>;

export function mfaManagementPlugin(runtime: MfaRuntime, sendEmail: OtpSender) {
  async function beginTotp(ctx: SecurityContext, replace: boolean) {
    const identity = await getSessionFromCtx(ctx);
    if (!identity) throw new APIError("UNAUTHORIZED");
    const id = identity.user.id, db = runtime.current();
    await requirePassword(ctx, id);
    const { person } = await accountStatus(runtime, id, identity.session.id);
    if (person.totpEnabled && !replace) throw new APIError("BAD_REQUEST", { code: "MFA_ALREADY_ENABLED", message: "Use Replace authenticator to change this method." });
    if (replace) {
      await db.update(user).set({ totpEnabled: false }).where(eq(user.id, id));
      await db.update(session).set({ mfaVerifiedAt: null, mfaVerificationMethod: null }).where(eq(session.userId, id));
      await revokeMfaSessions(db, id, identity.session.id);
      await auditMfa(db, id, "mfa.replaced", { method: "authenticator" });
    }
    const secret = randomBytes(32).toString("base64url");
    await db.delete(twoFactor).where(eq(twoFactor.userId, id));
    await db.insert(twoFactor).values({ id: randomUUID(), userId: id, secret: await symmetricEncrypt({ key: ctx.context.secret, data: secret }), backupCodes: await symmetricEncrypt({ key: ctx.context.secret, data: "[]" }) });
    const backupCodes = await ensureBackupCodes(runtime, ctx, id);
    await prepareGrant(runtime, id, identity.session.id, "totp-enroll");
    await syncEnabled(runtime, id);
    const totpURI = "otpauth://totp/" + encodeURIComponent(MFA_ISSUER + ":" + person.email) + "?secret=" + base32(secret) + "&issuer=" + encodeURIComponent(MFA_ISSUER) + "&algorithm=SHA1&digits=6&period=30";
    return { totpURI, backupCodes };
  }
  async function sendOtp(ctx: SecurityContext, purpose: "login" | "enrollment") {
    const who = await challengeIdentity(runtime, ctx), db = runtime.current();
    const { person, status } = await accountStatus(runtime, who.userId, who.sessionId);
    if (status.required) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: "Administrators must use an authenticator or passkey." });
    if (purpose === "enrollment") {
      if (!who.identity) throw new APIError("UNAUTHORIZED");
      await requireGrant(runtime, who.userId, who.binding, "email-authorization");
    } else if (!person.emailOtpEnabled) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ENABLED", message: "Email codes are not enabled for this account." });
    const elapsed = person.mfaEmailLastSentAt ? Date.now() - person.mfaEmailLastSentAt.getTime() : Infinity;
    if (elapsed < 60000) throw new APIError("TOO_MANY_REQUESTS", { code: "OTP_RESEND_COOLDOWN", message: "Wait before requesting another code.", retryAfter: Math.ceil((60000 - elapsed) / 1000) });
    const recent = await db.select({ id: mfaEmailSend.id }).from(mfaEmailSend).where(and(eq(mfaEmailSend.userId, who.userId), gt(mfaEmailSend.createdAt, new Date(Date.now() - 3600000))));
    if (recent.length >= 10) throw new APIError("TOO_MANY_REQUESTS", { code: "OTP_ACCOUNT_SEND_LIMIT", message: "Email code limit reached. Try again in an hour or use another method." });
    await db.delete(mfaEmailSend).where(and(eq(mfaEmailSend.userId, who.userId), lt(mfaEmailSend.createdAt, new Date(Date.now() - 3600000))));
    await db.insert(mfaEmailSend).values({ id: randomUUID(), userId: who.userId });
    await db.update(user).set({ mfaEmailLastSentAt: new Date() }).where(eq(user.id, who.userId));
    const purposeKey = "email-" + purpose;
    const prior = await db.select().from(mfaChallenge).where(and(eq(mfaChallenge.userId, who.userId), eq(mfaChallenge.binding, who.binding), eq(mfaChallenge.purpose, purposeKey)));
    await db.delete(mfaChallenge).where(and(eq(mfaChallenge.userId, who.userId), eq(mfaChallenge.binding, who.binding), eq(mfaChallenge.purpose, purposeKey)));
    const data = { id: randomUUID(), userId: who.userId, binding: who.binding, purpose: purposeKey };
    let code = newEmailCode();
    while (prior.some((row) => row.codeHash && equalHash(row.codeHash, otpHash(ctx.context.secret, { ...row, userId: who.userId }, code)))) code = newEmailCode();
    await db.insert(mfaChallenge).values({ ...data, codeHash: otpHash(ctx.context.secret, data, code), deliveryStatus: "pending", expiresAt: new Date(Date.now() + 300000) });
    try {
      await sendEmail({ to: person.email, code, purpose });
      await db.update(mfaChallenge).set({ deliveryStatus: "accepted" }).where(eq(mfaChallenge.id, data.id));
      return { sent: true, destination: maskEmail(person.email), retryAfter: 60 };
    } catch {
      // Commit the reservation/cooldown and expose submission failure explicitly.
      await db.update(mfaChallenge).set({ deliveryStatus: "failed", codeHash: null }).where(eq(mfaChallenge.id, data.id));
      return { sent: false, code: "EMAIL_SEND_FAILED", message: "The email server could not accept your code. Retry in one minute or choose another method.", destination: maskEmail(person.email), retryAfter: 60 };
    }
  }
  return {
    id: "epl-mfa-management",
    endpoints: {
      mfaChallengeStatus: createAuthEndpoint("/two-factor/challenge-status", { method: "GET" }, async (ctx) => {
        ctx.setHeader("Cache-Control", "no-store");
        const identity = await getSessionFromCtx(ctx);
        if (!identity) {
          const cookie = await ctx.getSignedCookie(ctx.context.createAuthCookie("two_factor").name, ctx.context.secret);
          const [row] = cookie ? await runtime.current().select().from(verification).where(eq(verification.identifier, cookie)) : [];
          if (!row || row.expiresAt <= new Date()) return { available: false, authenticated: false, permittedMethods: [], destination: null, retryAfter: 0 };
        }
        const who = await challengeIdentity(runtime, ctx);
        const { person, status } = await accountStatus(runtime, who.userId, who.sessionId);
        return { available: status.enabled, authenticated: Boolean(identity), permittedMethods: status.permittedMethods, destination: status.permittedMethods.includes("email") ? maskEmail(person.email) : null,
          retryAfter: person.mfaEmailLastSentAt ? Math.max(0, Math.ceil((60000 - Date.now() + person.mfaEmailLastSentAt.getTime()) / 1000)) : 0 };
      }),
      enableTwoFactor: createAuthEndpoint("/two-factor/enable", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, (ctx) => beginTotp(ctx, false)),
      replaceAuthenticator: createAuthEndpoint("/two-factor/replace", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, (ctx) => beginTotp(ctx, true)),
      verifyTOTP: createAuthEndpoint("/two-factor/verify-totp", { method: "POST", body: codeBody }, async (ctx) => {
        const who = await challengeIdentity(runtime, ctx), db = runtime.current();
        const { person } = await accountStatus(runtime, who.userId, who.sessionId);
        if (!person.totpEnabled) {
          if (!who.identity) throw new APIError("FORBIDDEN", { message: "Finish setup while signed in." });
          await requireGrant(runtime, who.userId, who.binding, "totp-enroll");
          await acknowledgeCodes(runtime, who.userId, ctx.body.backupCodesSaved === true);
        }
        const [factor] = await db.select().from(twoFactor).where(eq(twoFactor.userId, who.userId));
        const step = factor ? matchingTotpStep(await symmetricDecrypt({ key: ctx.context.secret, data: factor.secret }), ctx.body.code) : null;
        if (step === null || (factor?.lastAcceptedTotpStep != null && step <= factor.lastAcceptedTotpStep)) return invalidCode();
        await db.update(twoFactor).set({ lastAcceptedTotpStep: step }).where(eq(twoFactor.userId, who.userId));
        await db.update(user).set({ totpEnabled: true }).where(eq(user.id, who.userId));
        await syncEnabled(runtime, who.userId);
        return completeVerification(runtime, ctx, who.userId, "authenticator", !person.totpEnabled);
      }),
      verifyBackupCode: createAuthEndpoint("/two-factor/verify-backup-code", { method: "POST", body: codeBody }, async (ctx) => {
        const who = await challengeIdentity(runtime, ctx);
        const { person, status } = await accountStatus(runtime, who.userId, who.sessionId);
        if (!status.permittedMethods.includes("backup") || !person.mfaBackupCodes) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: "Enroll an eligible method before using recovery codes." });
        const codes = JSON.parse(await symmetricDecrypt({ key: ctx.context.secret, data: person.mfaBackupCodes })) as string[];
        const index = codes.findIndex((code) => equalHash(code, ctx.body.code));
        if (index < 0) return invalidCode(true);
        codes.splice(index, 1);
        await runtime.current().update(user).set({ mfaBackupCodes: await symmetricEncrypt({ key: ctx.context.secret, data: JSON.stringify(codes) }) }).where(eq(user.id, who.userId));
        return completeVerification(runtime, ctx, who.userId, "backup");
      }),
      generateBackupCodes: createAuthEndpoint("/two-factor/generate-backup-codes", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, async (ctx) => {
        await requirePassword(ctx, ctx.context.session.user.id);
        const backupCodes = await ensureBackupCodes(runtime, ctx, ctx.context.session.user.id, true);
        await auditMfa(runtime.current(), ctx.context.session.user.id, "mfa.backup_codes_regenerated");
        return { backupCodes };
      }),
      acknowledgeBackupCodes: createAuthEndpoint("/two-factor/ack-backup-codes", { method: "POST", body: z.object({ saved: z.literal(true) }), use: [sessionMiddleware] }, async (ctx) => {
        await acknowledgeCodes(runtime, ctx.context.session.user.id, true);
        return { status: true };
      }),
      disableTwoFactor: createAuthEndpoint("/two-factor/disable", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, async (ctx) => {
        const id = ctx.context.session.user.id, db = runtime.current();
        await requirePassword(ctx, id);
        const { keys, status } = await accountStatus(runtime, id, ctx.context.session.session.id);
        if (status.required && !keys.length) throw new APIError("FORBIDDEN", { code: "MFA_REQUIRED_FOR_ROLE", message: "Keep at least one authenticator or passkey. Use Replace authenticator to recover setup." });
        await db.delete(twoFactor).where(eq(twoFactor.userId, id));
        await db.update(user).set({ totpEnabled: false }).where(eq(user.id, id));
        await syncEnabled(runtime, id);
        await revokeMfaSessions(db, id, ctx.context.session.session.id);
        await auditMfa(db, id, "mfa.disabled", { method: "authenticator" });
        return { status: true };
      }),
      enrollEmailOtp: createAuthEndpoint("/two-factor/email-enroll", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, async (ctx) => {
        const id = ctx.context.session.user.id;
        await requirePassword(ctx, id);
        const { person, status } = await accountStatus(runtime, id, ctx.context.session.session.id);
        if (status.required || person.emailOtpEnabled) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: status.required ? "Administrators must use an authenticator or passkey." : "Email codes are already enabled." });
        await prepareGrant(runtime, id, ctx.context.session.session.id, "email-authorization");
        const backupCodes = await ensureBackupCodes(runtime, ctx, id);
        return { ...await sendOtp(ctx, "enrollment"), backupCodes };
      }),
      sendTwoFactorOTP: createAuthEndpoint("/two-factor/send-otp", { method: "POST", body: z.object({ purpose: emailPurpose }) }, (ctx) => sendOtp(ctx, ctx.body.purpose)),
      verifyTwoFactorOTP: createAuthEndpoint("/two-factor/verify-otp", { method: "POST", body: codeBody.extend({ purpose: emailPurpose }) }, async (ctx) => {
        const who = await challengeIdentity(runtime, ctx), db = runtime.current();
        const { person, status } = await accountStatus(runtime, who.userId, who.sessionId);
        if (status.required) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: "Use an authenticator or passkey for administrator access." });
        const enrollment = ctx.body.purpose === "enrollment";
        if (enrollment) {
          if (!who.identity || person.emailOtpEnabled) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: "This code cannot be used for this account or purpose." });
          await requireGrant(runtime, who.userId, who.binding, "email-authorization");
          await acknowledgeCodes(runtime, who.userId, ctx.body.backupCodesSaved === true);
        } else if (!person.emailOtpEnabled) throw new APIError("FORBIDDEN", { code: "MFA_METHOD_NOT_ALLOWED", message: "This code cannot be used for this account or purpose." });
        const [record] = await db.select().from(mfaChallenge).where(and(eq(mfaChallenge.userId, who.userId), eq(mfaChallenge.binding, who.binding), eq(mfaChallenge.purpose, "email-" + ctx.body.purpose)));
        if (!record || record.expiresAt <= new Date()) throw new APIError("BAD_REQUEST", { code: "OTP_EXPIRED", message: "This email code has expired or was replaced. Request another code." });
        if (record.deliveryStatus !== "accepted" || !record.codeHash || !equalHash(record.codeHash, otpHash(ctx.context.secret, { ...record, userId: who.userId }, ctx.body.code))) return invalidCode();
        await db.delete(mfaChallenge).where(eq(mfaChallenge.id, record.id));
        if (enrollment) { await db.update(user).set({ emailOtpEnabled: true }).where(eq(user.id, who.userId)); await syncEnabled(runtime, who.userId); }
        return completeVerification(runtime, ctx, who.userId, "email", enrollment);
      }),
      disableEmailOtp: createAuthEndpoint("/two-factor/email-disable", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, async (ctx) => {
        const id = ctx.context.session.user.id, db = runtime.current();
        await requirePassword(ctx, id);
        await db.update(user).set({ emailOtpEnabled: false }).where(eq(user.id, id));
        await syncEnabled(runtime, id);
        await revokeMfaSessions(db, id, ctx.context.session.session.id);
        await auditMfa(db, id, "mfa.disabled", { method: "email" });
        return { status: true };
      }),
      preparePasskey: createAuthEndpoint("/two-factor/passkey-prepare", { method: "POST", body: passwordBody, use: [sessionMiddleware] }, async (ctx) => {
        const id = ctx.context.session.user.id;
        await requirePassword(ctx, id);
        const backupCodes = await ensureBackupCodes(runtime, ctx, id);
        await prepareGrant(runtime, id, ctx.context.session.session.id, "passkey-authorization");
        return { backupCodes };
      }),
    },
  };
}
