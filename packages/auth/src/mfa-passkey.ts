import { randomUUID } from "node:crypto";
import { passkey as createPasskey } from "@better-auth/passkey";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { APIError, createAuthEndpoint, getSessionFromCtx, sessionMiddleware } from "better-auth/api";
import { expireCookie } from "better-auth/cookies";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { mfaChallenge, passkey, verification } from "@epl-fellows-platform/db/schema/auth";
import { accountStatus, acknowledgeCodes, completeVerification, requireGrant, requirePassword, syncEnabled, type SecurityContext } from "./mfa-methods";
import { auditMfa, revokeMfaSessions } from "./mfa-store";
import { MFA_ISSUER } from "./mfa-policy";
import type { MfaRuntime } from "./mfa-runtime";

export function passkeyConfiguration(origin: string, rpID: string | undefined, production: boolean) {
  const url = new URL(origin);
  const resolved = rpID?.trim() || (production ? "" : "localhost");
  if (!resolved) throw new Error("Set PASSKEY_RP_ID to the stable production frontend domain before starting authentication.");
  if (resolved.includes("/") || resolved.includes(":") || (url.hostname !== resolved && !url.hostname.endsWith("." + resolved))) throw new Error("PASSKEY_RP_ID must match the frontend hostname or its parent domain.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Passkeys require HTTPS outside localhost.");
  return { rpID: resolved, rpName: MFA_ISSUER, origin: url.origin };
}
export function securePasskeyPlugin(runtime: MfaRuntime, config: ReturnType<typeof passkeyConfiguration>) {
  const plugin = createPasskey({ ...config, authenticatorSelection: { userVerification: "required", residentKey: "required" } });
  const nameSchema = z.string().trim().min(1).max(100);
  async function issue(ctx: SecurityContext, input: { userId: string | null; binding: string; purpose: string; challenge: string }) {
    const cookie = ctx.context.createAuthCookie("epl_passkey", { maxAge: 600 });
    const old = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
    if (old) await runtime.current().delete(mfaChallenge).where(eq(mfaChallenge.id, old));
    const id = randomUUID();
    await runtime.current().insert(mfaChallenge).values({ id, userId: input.userId, binding: input.binding, purpose: input.purpose, data: input.challenge, createdAt: new Date(), expiresAt: new Date(Date.now() + 600000) });
    await ctx.setSignedCookie(cookie.name, id, ctx.context.secret, cookie.attributes);
  }
  async function challenge(ctx: SecurityContext, purpose: string) {
    const cookie = ctx.context.createAuthCookie("epl_passkey");
    const id = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
    const [row] = id ? await runtime.current().select().from(mfaChallenge).where(eq(mfaChallenge.id, id)) : [];
    if (!row || row.purpose !== purpose || row.expiresAt <= new Date() || !row.data) throw new APIError("BAD_REQUEST", { code: "CHALLENGE_NOT_FOUND", message: "The passkey request expired or was used. Try again." });
    return row;
  }
  function failed(): never { throw new APIError("UNAUTHORIZED", { code: "PASSKEY_VERIFICATION_FAILED", message: "Passkey verification failed. Use your device PIN or biometrics and try again." }); }
  const endpoints = {
    generatePasskeyRegistrationOptions: createAuthEndpoint("/passkey/generate-register-options", { method: "GET", use: [sessionMiddleware], query: z.object({ name: nameSchema.optional(), authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional() }).optional() }, async (ctx) => {
      const who = ctx.context.session;
      await requireGrant(runtime, who.user.id, who.session.id, "passkey-authorization");
      await acknowledgeCodes(runtime, who.user.id, false);
      const { keys } = await accountStatus(runtime, who.user.id, who.session.id);
      const options = await generateRegistrationOptions({
        rpID: config.rpID, rpName: config.rpName, userID: new TextEncoder().encode(who.user.id), userName: who.user.email, userDisplayName: who.user.name,
        attestationType: "none", authenticatorSelection: { residentKey: "required", userVerification: "required", ...(ctx.query?.authenticatorAttachment ? { authenticatorAttachment: ctx.query.authenticatorAttachment } : {}) },
        excludeCredentials: keys.map((key) => ({ id: key.credentialID, transports: key.transports?.split(",") as AuthenticatorTransportFuture[] | undefined })),
      });
      await issue(ctx, { userId: who.user.id, binding: who.session.id, purpose: "passkey-register", challenge: options.challenge });
      return options;
    }),
    verifyPasskeyRegistration: createAuthEndpoint("/passkey/verify-registration", { method: "POST", use: [sessionMiddleware], body: z.object({ response: z.custom<RegistrationResponseJSON>((value) => Boolean(value && typeof value === "object" && "id" in value)), name: nameSchema.default("My passkey") }) }, async (ctx) => {
      const who = ctx.context.session, db = runtime.current();
      const request = await challenge(ctx, "passkey-register");
      if (request.userId !== who.user.id || request.binding !== who.session.id) throw new APIError("FORBIDDEN", { code: "WRONG_ACCOUNT", message: "Start passkey setup again with this account." });
      await requireGrant(runtime, who.user.id, who.session.id, "passkey-authorization");
      await acknowledgeCodes(runtime, who.user.id, false);
      let result: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
      try {
        result = await verifyRegistrationResponse({ response: ctx.body.response, expectedChallenge: request.data!, expectedOrigin: config.origin, expectedRPID: config.rpID, requireUserVerification: true });
      } catch { return failed(); }
      if (!result.verified || !result.registrationInfo?.userVerified) return failed();
      const info = result.registrationInfo, id = randomUUID();
      await db.insert(passkey).values({ id, userId: who.user.id, name: ctx.body.name, credentialID: info.credential.id, publicKey: Buffer.from(info.credential.publicKey).toString("base64"), counter: info.credential.counter, deviceType: info.credentialDeviceType, backedUp: info.credentialBackedUp, transports: ctx.body.response.response.transports?.join(","), aaguid: info.aaguid });
      await db.delete(mfaChallenge).where(eq(mfaChallenge.id, request.id));
      await syncEnabled(runtime, who.user.id);
      await completeVerification(runtime, ctx, who.user.id, "passkey", true);
      expireCookie(ctx, ctx.context.createAuthCookie("epl_passkey"));
      return { id, name: ctx.body.name, createdAt: new Date() };
    }),
    generatePasskeyAuthenticationOptions: createAuthEndpoint("/passkey/generate-authenticate-options", { method: "GET" }, async (ctx) => {
      const who = await getSessionFromCtx(ctx);
      let userId = who?.user.id ?? null, binding = who?.session.id ?? "";
      if (!who) {
        const token = await ctx.getSignedCookie(ctx.context.createAuthCookie("two_factor").name, ctx.context.secret);
        const [row] = token ? await runtime.current().select().from(verification).where(eq(verification.identifier, token)) : [];
        if (row && row.expiresAt > new Date()) { userId = row.value; binding = row.identifier; }
        else if (token) expireCookie(ctx, ctx.context.createAuthCookie("two_factor"));
      }
      const keys = userId ? (await accountStatus(runtime, userId)).keys : [];
      if (userId && !keys.length) throw new APIError("BAD_REQUEST", { code: "PASSKEY_NOT_FOUND", message: "This account has no passkey. Choose another method." });
      const options = await generateAuthenticationOptions({ rpID: config.rpID, userVerification: "required", ...(userId ? { allowCredentials: keys.map((key) => ({ id: key.credentialID, transports: key.transports?.split(",") as AuthenticatorTransportFuture[] | undefined })) } : {}) });
      await issue(ctx, { userId, binding, purpose: "passkey-authenticate", challenge: options.challenge });
      return options;
    }),
    verifyPasskeyAuthentication: createAuthEndpoint("/passkey/verify-authentication", { method: "POST", body: z.object({ response: z.custom<AuthenticationResponseJSON>((value) => Boolean(value && typeof value === "object" && "id" in value)) }) }, async (ctx) => {
      const request = await challenge(ctx, "passkey-authenticate"), db = runtime.current();
      const [key] = typeof ctx.body.response.id === "string" ? await db.select().from(passkey).where(eq(passkey.credentialID, ctx.body.response.id)) : [];
      if (!key) return failed();
      if (request.userId && request.userId !== key.userId) throw new APIError("FORBIDDEN", { code: "WRONG_ACCOUNT", message: "Use a passkey belonging to the signed-in account." });
      const { person } = await accountStatus(runtime, key.userId);
      if (person.mfaSecurityChangedAt >= request.createdAt) throw new APIError("BAD_REQUEST", { code: "CHALLENGE_NOT_FOUND", message: "Account security changed. Start a new passkey request." });
      const who = await getSessionFromCtx(ctx);
      if (request.binding) {
        if (request.binding.startsWith("2fa-")) {
          const token = await ctx.getSignedCookie(ctx.context.createAuthCookie("two_factor").name, ctx.context.secret);
          const [row] = token === request.binding ? await db.select().from(verification).where(and(eq(verification.identifier, token), eq(verification.value, key.userId))) : [];
          if (!row || row.expiresAt <= new Date()) throw new APIError("UNAUTHORIZED", { code: "INVALID_TWO_FACTOR_COOKIE", message: "Your password challenge expired. Sign in again." });
        } else if (!who || who.session.id !== request.binding) throw new APIError("UNAUTHORIZED", { code: "CHALLENGE_NOT_FOUND", message: "This browser session changed. Start again." });
      }
      const handle = ctx.body.response.response?.userHandle;
      if (handle && Buffer.from(handle, "base64url").toString() !== key.userId) return failed();
      let result: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
      try {
        result = await verifyAuthenticationResponse({ response: ctx.body.response, expectedChallenge: request.data!, expectedOrigin: config.origin, expectedRPID: config.rpID, requireUserVerification: true,
          credential: { id: key.credentialID, publicKey: new Uint8Array(Buffer.from(key.publicKey, "base64")), counter: key.counter, transports: key.transports?.split(",") as AuthenticatorTransportFuture[] | undefined } });
      } catch { return failed(); }
      if (!result.verified || !result.authenticationInfo.userVerified) return failed();
      await db.update(passkey).set({ counter: result.authenticationInfo.newCounter }).where(eq(passkey.id, key.id));
      await db.delete(mfaChallenge).where(eq(mfaChallenge.id, request.id));
      expireCookie(ctx, ctx.context.createAuthCookie("epl_passkey"));
      return completeVerification(runtime, ctx, key.userId, "passkey");
    }),
    listPasskeys: createAuthEndpoint("/passkey/list-user-passkeys", { method: "GET", use: [sessionMiddleware] }, async (ctx) => {
      return runtime.current().select({ id: passkey.id, name: passkey.name, createdAt: passkey.createdAt, deviceType: passkey.deviceType, backedUp: passkey.backedUp }).from(passkey).where(eq(passkey.userId, ctx.context.session.user.id));
    }),
    updatePasskey: createAuthEndpoint("/passkey/update-passkey", { method: "POST", use: [sessionMiddleware], body: z.object({ id: z.string(), name: nameSchema }) }, async (ctx) => {
      const [previous] = await runtime.current().select({ name: passkey.name }).from(passkey).where(and(eq(passkey.id, ctx.body.id), eq(passkey.userId, ctx.context.session.user.id)));
      const [key] = await runtime.current().update(passkey).set({ name: ctx.body.name }).where(and(eq(passkey.id, ctx.body.id), eq(passkey.userId, ctx.context.session.user.id))).returning({ id: passkey.id, name: passkey.name });
      if (!key) throw new APIError("NOT_FOUND", { code: "PASSKEY_NOT_FOUND", message: "This passkey is no longer available." });
      await auditMfa(runtime.current(), ctx.context.session.user.id, "mfa.passkey_renamed", { passkeyId: key.id, previousName: previous?.name, name: key.name });
      return { passkey: key };
    }),
    deletePasskey: createAuthEndpoint("/passkey/delete-passkey", { method: "POST", use: [sessionMiddleware], body: z.object({ id: z.string(), password: z.string().min(1).max(128) }) }, async (ctx) => {
      const id = ctx.context.session.user.id, db = runtime.current();
      await requirePassword(ctx, id);
      const { person, keys, status } = await accountStatus(runtime, id, ctx.context.session.session.id);
      if (!keys.some((key) => key.id === ctx.body.id)) throw new APIError("NOT_FOUND", { code: "PASSKEY_NOT_FOUND", message: "This passkey is no longer available." });
      if (status.required && !person.totpEnabled && keys.length <= 1) throw new APIError("FORBIDDEN", { code: "MFA_REQUIRED_FOR_ROLE", message: "Add another passkey or authenticator before removing your last strong method." });
      await db.delete(passkey).where(and(eq(passkey.id, ctx.body.id), eq(passkey.userId, id)));
      await syncEnabled(runtime, id);
      await revokeMfaSessions(db, id, ctx.context.session.session.id);
      await auditMfa(db, id, "mfa.disabled", { method: "passkey", passkeyId: ctx.body.id });
      return { status: true };
    }),
  };
  // Keep the pinned plugin schema/client contract, replacing unsafe 1.5.6 defaults.
  return { ...plugin, endpoints };
}
