import { betterAuth } from "better-auth";
import { auditFailure, auditStorage, requestAuditContext, withAuditContext } from "@epl-fellows-platform/db/audit";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { randomUUID } from "node:crypto";
import { deleteSessionCookie, expireCookie } from "better-auth/cookies";
import { securePasskeyPlugin, passkeyConfiguration } from "./mfa-passkey";
import { and, eq } from "drizzle-orm";
import { session } from "@epl-fellows-platform/db/schema/auth";
import { readRememberedBrowser } from "./mfa-browser";
import { accountStatus } from "./mfa-methods";
import { trustedSecurityOrigin } from "./mfa-origin";
import { createMfaRuntime } from "./mfa-runtime";
import { mfaManagementPlugin, type OtpSender } from "./mfa-plugin";
import { MFA_ISSUER, MFA_REMEMBER_SECONDS } from "./mfa-policy";
import type { MfaDatabase } from "./mfa-store";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { profileNameSchema } from "./account-policy";
import { invitationPlugin, type InvitationEndpoints } from "./invitation-plugin";

type AuthOptions = {
  database: Parameters<typeof drizzleAdapter>[0];
  mfaDatabase?: MfaDatabase;
  secret: string;
  baseURL: string;
  trustedOrigin: string;
  production: boolean;
  sendPasswordResetEmail: (data: { to: string; url: string }) => Promise<unknown>;
  sendOtpEmail?: OtpSender;
  passkeyRpId?: string;
  rateLimit?: boolean;
  invitations?: InvitationEndpoints;
  /** Private server provisioning only. Never expose this instance as an HTTP handler. */
  trustedAccountCreation?: boolean;
};

export function createAuth(options: AuthOptions) {
  const runtime = createMfaRuntime(options.mfaDatabase ?? options.database as MfaDatabase, options.secret, options.rateLimit ?? options.production);
  const originalFactor = twoFactor({ issuer: MFA_ISSUER, twoFactorCookieMaxAge: 600, totpOptions: { digits: 6, period: 30 }, backupCodeOptions: { amount: 10, storeBackupCodes: "encrypted" } });
  const management = mfaManagementPlugin(runtime, options.sendOtpEmail ?? (async () => { throw new Error("Email code delivery is not configured"); }));
  const factor = { ...originalFactor, endpoints: { ...originalFactor.endpoints, ...management.endpoints }, hooks: { after: [{
    matcher: (ctx: { path?: string }) => ctx.path === "/sign-in/email",
    handler: createAuthMiddleware(async (ctx) => {
      const data = ctx.context.newSession;
      if (!data) return;
      const { status, person } = await accountStatus(runtime, data.user.id, data.session.id);
      if (!status.enabled) return;
      const remembered = await readRememberedBrowser(runtime.current(), ctx, data.user.id);
      if (remembered && (!person.mfaLockedUntil || person.mfaLockedUntil <= new Date()) && status.permittedMethods.some((method) => method === remembered.verificationMethod)
        && remembered.verifiedAt.getTime() <= Date.now() && Date.now() < remembered.verifiedAt.getTime() + MFA_REMEMBER_SECONDS * 1000) {
        await runtime.current().update(session).set({ mfaVerifiedAt: remembered.verifiedAt, mfaVerificationMethod: remembered.verificationMethod, mfaBrowserId: remembered.id })
          .where(and(eq(session.id, data.session.id), eq(session.userId, data.user.id)));
        runtime.markRemembered(remembered.verificationMethod);
        return;
      }
      deleteSessionCookie(ctx, true);
      expireCookie(ctx, ctx.context.createAuthCookie("trust_device"));
      await ctx.context.internalAdapter.deleteSession(data.session.token);
      const cookie = ctx.context.createAuthCookie("two_factor", { maxAge: 600 });
      const identifier = "2fa-" + randomUUID();
      await ctx.context.internalAdapter.createVerificationValue({ identifier, value: data.user.id, expiresAt: new Date(Date.now() + 600000) });
      await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes);
      return ctx.json({ twoFactorRedirect: true });
    }),
  }] }, rateLimit: [{ pathMatcher: (path: string) => ["/two-factor/enable", "/two-factor/replace", "/two-factor/passkey-prepare", "/two-factor/generate-backup-codes"].includes(path), window: 60, max: 10 }] };
  const passkeys = securePasskeyPlugin(runtime, passkeyConfiguration(options.trustedOrigin, options.passkeyRpId, options.production));
  const instance = betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    appName: MFA_ISSUER,
    database: runtime.adapter(options.database),
    trustedOrigins: [options.trustedOrigin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.trustedAccountCreation,
      autoSignIn: !options.trustedAccountCreation,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // Respond identically for known and unknown addresses without waiting on SMTP.
        // The long-lived Nest process finishes delivery; handle failures explicitly.
        runtime.afterCommit(() => {
          void options.sendPasswordResetEmail({ to: user.email, url }).then(
            () => auditFailure(options.mfaDatabase ?? options.database as MfaDatabase, { action: "auth.email_submitted", actor: { kind: "system", id: null, name: null, role: null }, targetType: "account", targetId: user.id }),
            () => { console.error("Password reset email delivery failed"); return auditFailure(options.mfaDatabase ?? options.database as MfaDatabase, { action: "auth.email_submitted", outcome: "failed", actor: { kind: "system", id: null, name: null, role: null }, targetType: "account", targetId: user.id }); },
          );
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!options.trustedAccountCreation) {
          const identity = await getSessionFromCtx(ctx);
          await runtime.authorize(ctx.path ?? "", ctx.body ?? {}, identity);
        }
        if (ctx.path === "/two-factor/enable") return { context: { ...ctx, body: { ...ctx.body, issuer: MFA_ISSUER } } };
        if (ctx.path === "/request-password-reset") {
          let destination: URL;
          try { destination = new URL(ctx.body?.redirectTo ?? "/reset-password", options.trustedOrigin); }
          catch { throw new APIError("FORBIDDEN", { message: "Invalid recovery destination" }); }
          if (destination.origin !== new URL(options.trustedOrigin).origin || destination.username || destination.password) {
            throw new APIError("FORBIDDEN", { message: "Invalid recovery destination" });
          }
          return { context: { ...ctx, body: { ...ctx.body, redirectTo: destination.toString() } } };
        }
        if (ctx.path === "/update-user" && ctx.body?.name !== undefined) {
          const result = profileNameSchema.safeParse(ctx.body.name);
          if (!result.success) throw new APIError("BAD_REQUEST", { message: result.error.issues[0]?.message ?? "Invalid name" });
          return { context: { ...ctx, body: { ...ctx.body, name: result.data } } };
        }
        if (ctx.path === "/change-password") {
          return { context: { ...ctx, body: { ...ctx.body, revokeOtherSessions: true } } };
        }
      }),
    },
    rateLimit: {
      enabled: options.rateLimit ?? options.production,
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 10 },
        "/invitations/preview": { window: 60, max: 30 },
        "/invitations/accept": { window: 60, max: 5 },
      },
    },
    onAPIError: { throw: true },
    // Better Auth's default logger includes submitted emails on failed recovery requests.
    logger: { log(level) {
      if (level === "error") console.error("Authentication request failed");
      else if (level === "warn") console.warn("Authentication warning");
    } },
    session: { cookieCache: { enabled: false }, additionalFields: { mfaBrowserId: { type: "string", required: false, input: false, returned: false }, mfaVerifiedAt: { type: "date", required: false, input: false, returned: false }, mfaVerificationMethod: { type: "string", required: false, input: false, returned: false } } },
    advanced: {
      defaultCookieAttributes: {
        sameSite: options.production ? "none" : "lax",
        secure: options.production,
        httpOnly: true,
      },
    },
    plugins: [factor, passkeys, ...(options.invitations ? [invitationPlugin(options.invitations, options.trustedOrigin)] : [])],
  });
  const ready = instance.$context.then((context) => runtime.setCookies({
    session: context.authCookies.sessionToken.name,
    challenge: context.createAuthCookie("two_factor").name,
    passkey: context.createAuthCookie("epl_passkey").name,
  }));
  const api = new Proxy(instance.api, { get(target, property) {
    const endpoint = Reflect.get(target, property);
    if (typeof endpoint !== "function" || options.trustedAccountCreation) return endpoint;
    return Object.assign(async (input: { body?: Record<string, unknown>; query?: Record<string, unknown>; headers?: ConstructorParameters<typeof Headers>[0] } = {}) => {
      await ready;
      return runtime.run(endpoint.path ?? "", { ...input.query, ...input.body }, input.headers ? new Headers(input.headers) : undefined, async () => Reflect.apply(endpoint, target, [input]));
    }, endpoint);
  } });
  return { ...instance, api, handler: async function handler(request: Request): Promise<Response> {
    if (!auditStorage.getStore()) return withAuditContext(requestAuditContext({ userAgent: request.headers.get("user-agent") ?? undefined }), () => handler(request));
    await ready;
    const url = new URL(request.url);
    const path = (url.pathname.startsWith("/api/auth") ? url.pathname.slice(9) : url.pathname).replace(/\/+$/, "");
    const parsed = request.method === "POST" ? await request.clone().json().catch(() => ({})) : {};
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    try {
      // Reject cross-origin requests before rate counters or MFA verification
      // run. Better Auth also performs its own origin validation afterward.
      if ((path.startsWith("/two-factor/") || path.startsWith("/passkey/")) && !trustedSecurityOrigin(request, options.trustedOrigin, options.baseURL)) {
        await auditFailure(options.mfaDatabase ?? options.database as MfaDatabase, { action: "operation.failed", outcome: "denied", targetType: "authentication", details: { reasonCode: "INVALID_ORIGIN" } });
        throw new APIError("FORBIDDEN", { code: "INVALID_ORIGIN", message: "Invalid request origin." });
      }
      const response = request.method === "POST" || path.startsWith("/passkey/") || path.startsWith("/invitations/") || path === "/two-factor/challenge-status"
        ? await runtime.run(path, { ...Object.fromEntries(url.searchParams), ...body }, request.headers, () => instance.handler(request))
        : await instance.handler(request);
      if (path.startsWith("/two-factor/") || path.startsWith("/passkey/")) response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof APIError && error.statusCode < 500) return Response.json(error.body ?? { code: "AUTHENTICATION_FAILED", message: "This authentication request could not be completed." }, { status: error.statusCode, headers: { "Cache-Control": "no-store" } });
      console.error("Authentication transaction failed");
      return Response.json({ code: "MFA_UNAVAILABLE", message: "Account security is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } };
}
