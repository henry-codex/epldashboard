import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import { symmetricDecrypt } from "better-auth/crypto";
import { transactionalDb as database, tenants, userTenants, activityLog } from "@epl-fellows-platform/db";
import { user, session, twoFactor, verification } from "@epl-fellows-platform/db/schema/auth";
import { createAuth } from "./create-auth";
import { getMfaStatus, resetMfaForRecovery } from "./mfa-store";
import * as mfaStore from "./mfa-store";
import { assertMfaSchema } from "./mfa-schema";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("MFA with isolated PostgreSQL", { timeout: 90000 }, () => {
  const ids: string[] = [];
  const secret = "isolated-mfa-test-secret-at-least-32-characters";
  const password = "Mfa-test-password-123";
  const origin = "http://localhost:4301";
  const options = { database, mfaDatabase: database, secret, baseURL: "http://localhost:4300", trustedOrigin: origin, production: false, sendPasswordResetEmail: async () => {} };
  const auth = createAuth(options);
  const provision = createAuth({ ...options, trustedAccountCreation: true });
  let globalId: string;
  let createdGlobal = false;
  async function request(path: string, body: object | undefined, browser = new Map<string, string>(), instance = auth, ip = "127.0.0.1") {
    const response = await instance.handler(new Request(options.baseURL + "/api/auth" + path, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", "x-epl-client-ip": ip, cookie: [...browser].map(([key, value]) => key + "=" + value).join("; ") },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
    for (const header of response.headers.getSetCookie()) {
      const first = header.split(";")[0]!; const index = first.indexOf("=");
      if (/max-age=0/i.test(header)) browser.delete(first.slice(0, index));
      else browser.set(first.slice(0, index), first.slice(index + 1));
    }
    return { status: response.status, data: await response.json().catch(() => ({})) as Record<string, any>, browser };
  }
  async function account(role?: string) {
    const email = randomUUID() + "@example.test";
    const result = await provision.api.signUpEmail({ body: { name: "MFA Test", email, password } });
    ids.push(result.user.id);
    if (role) await database.insert(userTenants).values({ userId: result.user.id, tenantId: globalId, role });
    const login = await request("/sign-in/email", { email, password });
    expect(login.status).toBe(200);
    return { id: result.user.id, email, browser: login.browser };
  }
  async function code(id: string) {
    const [row] = await database.select().from(twoFactor).where(eq(twoFactor.userId, id));
    const plain = await symmetricDecrypt({ key: secret, data: row!.secret });
    return (await auth.api.generateTOTP({ body: { secret: plain } })).code;
  }
  async function enroll(person: Awaited<ReturnType<typeof account>>) {
    const setup = await request("/two-factor/enable", { password }, person.browser);
    expect(setup.status).toBe(200);
    const result = await request("/two-factor/verify-totp", { code: await code(person.id), backupCodesSaved: true }, person.browser);
    expect(result.status).toBe(200);
    return setup.data.backupCodes as string[];
  }
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !["55432", "15432"].includes(parsed.port) || parsed.pathname !== "/epl_settings_test" || process.env.DATABASE_URL !== url) throw new Error("MFA tests require the isolated loopback database on port 55432 or 15432.");
    const ddl = await readFile(new URL("../../db/sql/add-mfa.sql", import.meta.url), "utf8");
    await database.transaction(async (tx) => { await tx.execute(sql`set local client_min_messages = warning`); await tx.execute(sql.raw(ddl)); await tx.execute(sql.raw(ddl)); });
    await assertMfaSchema(database);
    const [global] = await database.select().from(tenants).where(eq(tenants.countryCode, "GLOBAL")).limit(1);
    globalId = global?.id ?? randomUUID();
    if (!global) { createdGlobal = true; await database.insert(tenants).values({ id: globalId, name: "MFA Test Global", slug: "mfa-" + randomUUID(), countryCode: "GLOBAL" }); }
  });
  afterAll(async () => {
    if (ids.length) {
      await database.delete(activityLog).where(sql`${activityLog.metadata}->>'userId' in ${ids}`);
      await database.delete(userTenants).where(inArray(userTenants.userId, ids));
      await database.delete(verification).where(inArray(verification.value, ids));
      await database.delete(user).where(inArray(user.id, ids));
    }
    if (createdGlobal) await database.delete(tenants).where(eq(tenants.id, globalId));
    await database.$client.end({ timeout: 3 });
  });

  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer", undefined])("allows password-only access without enrollment for %s", async (role) => {
    const person = await account(role);
    const [device] = await database.select().from(session).where(eq(session.userId, person.id));
    const status = await getMfaStatus(database, person.id, device!.id);
    expect(status).toMatchObject({ required: false, enabled: false, reason: null });
    expect((await request("/update-user", { name: "Updated MFA Test" }, person.browser)).status).toBe(200);
  });
  it("requires a saved-code acknowledgment, activates only after verification, rotates the current session and revokes others", async () => {
    const person = await account("country_admin");
    const other = await request("/sign-in/email", { email: person.email, password });
    const setup = await request("/two-factor/enable", { password }, person.browser);
    expect(setup.status).toBe(200);
    expect(setup.data.backupCodes).toHaveLength(10);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.twoFactorEnabled).toBe(false);
    expect((await request("/update-user", { name: "Setup is optional" }, person.browser)).status).toBe(200);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).not.toBe(true);
    const otp = await code(person.id);
    expect((await request("/two-factor/verify-totp", { code: otp }, person.browser)).status).toBe(400);
    expect((await request("/two-factor/verify-totp", { code: otp, backupCodesSaved: true }, person.browser)).status).toBe(200);
    const devices = await database.select().from(session).where(eq(session.userId, person.id));
    expect(devices).toHaveLength(1); expect(devices[0]!.mfaVerifiedAt).not.toBeNull();
    expect((await request("/update-user", { name: "Verified Admin" }, person.browser)).status).toBe(200);
    expect((await request("/update-user", { name: "Revoked" }, other.browser)).status).toBe(401);
    expect((await request("/two-factor/verify-totp", { code: otp }, person.browser)).status).toBe(401);
    expect((await request("/two-factor/get-totp-uri", { password }, person.browser)).status).toBe(400);
  });
  it("does not grant a session after the password step and consumes a backup code once under concurrent requests", async () => {
    const person = await account(); const codes = await enroll(person);
    const login = await request("/sign-in/email", { email: person.email, password });
    expect(login.data.twoFactorRedirect).toBe(true);
    expect((await request("/update-user", { name: "Bypass" }, login.browser)).status).toBe(401);
    const [first, second] = await Promise.all([
      request("/two-factor/verify-backup-code", { code: codes[0] }, new Map(login.browser)),
      request("/two-factor/verify-backup-code", { code: codes[0] }, new Map(login.browser)),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 401]);
    const again = await request("/sign-in/email", { email: person.email, password });
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, again.browser)).status).toBe(401);
    expect((await request("/two-factor/verify-backup-code", { code: codes[1] }, again.browser)).status).toBe(200);
  });
  it("enforces challenge expiry, rejects trusted devices and keeps failure counts across challenges", async () => {
    const person = await account(); const codes = await enroll(person);
    let login = await request("/sign-in/email", { email: person.email, password });
    expect((await request("/two-factor/verify-backup-code", { code: codes[0], trustDevice: true }, login.browser)).status).toBe(400);
    await database.update(verification).set({ expiresAt: new Date(Date.now() - 1000) }).where(and(eq(verification.value, person.id), sql`${verification.identifier} like '2fa-%'`));
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, login.browser)).status).toBe(401);
    login = await request("/sign-in/email", { email: person.email, password });
    for (let attempt = 0; attempt < 10; attempt++) {
      if (attempt === 5) login = await request("/sign-in/email", { email: person.email, password });
      expect((await request("/two-factor/verify-backup-code", { code: "incorrect" }, login.browser)).status).toBe(401);
    }
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, login.browser)).status).toBe(429);
    await database.update(user).set({ mfaLockedUntil: new Date(Date.now() - 1) }).where(eq(user.id, person.id));
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, login.browser)).status).toBe(200);
  });
  it("allows an optional authenticator replacement without forcing incomplete enrollment", async () => {
    const person = await account("tenant_admin"); await enroll(person);
    expect((await request("/two-factor/replace", { password: "incorrect" }, person.browser)).status).toBe(400);
    const replaced = await request("/two-factor/replace", { password }, person.browser);
    expect(replaced.status).toBe(200);
    expect((await request("/update-user", { name: "Replacement pending" }, person.browser)).status).toBe(200);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).not.toBe(true);
    expect((await request("/two-factor/verify-totp", { code: await code(person.id), backupCodesSaved: true }, person.browser)).status).toBe(200);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).toBe(true);
  });
  it("rejects untrusted origins before consuming attempts and fixes the issuer", async () => {
    const person = await account();
    const setup = await request("/two-factor/enable", { password, issuer: "Untrusted issuer" }, person.browser);
    expect(new URL(setup.data.totpURI).searchParams.get("issuer")).toBe("EPL Global Platform");
    const limited = createAuth({ ...options, rateLimit: true });
    const ip = randomUUID();
    for (let index = 0; index < 6; index++) {
      const response = await limited.handler(new Request(options.baseURL + "/api/auth/two-factor/verify-totp", { method: "POST", headers: {
        origin: "https://untrusted.example", "content-type": "application/json", "x-epl-client-ip": ip,
        cookie: [...person.browser].map(([key, value]) => key + "=" + value).join("; "),
      }, body: JSON.stringify({ code: "invalid" }) }));
      expect(response.status).toBe(403);
    }
    const get = await request("/two-factor/verify-totp", undefined, person.browser, limited, ip);
    expect(get.status).not.toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.mfaFailedAttempts).toBe(0);
    expect((await request("/two-factor/verify-totp", { code: await code(person.id), backupCodesSaved: true }, person.browser, limited, ip)).status).toBe(200);
  });
  it("limits both verification methods together per IP across auth instances", async () => {
    const person = await account(); await enroll(person);
    const pending = await request("/sign-in/email", { email: person.email, password });
    const limited = createAuth({ ...options, rateLimit: true });
    const secondInstance = createAuth({ ...options, rateLimit: true });
    const ip = randomUUID();
    for (let index = 0; index < 5; index++) {
      const result = await request(index % 2 ? "/two-factor/verify-totp" : "/two-factor/verify-backup-code", { code: "invalid" }, pending.browser, index % 2 ? limited : secondInstance, ip);
      expect(result.status).toBe(401);
    }
    const denied = await request("/two-factor/verify-backup-code", { code: "invalid" }, pending.browser, limited, ip);
    expect(denied.status).toBe(429); expect(denied.data.code).toBe("MFA_RATE_LIMITED");
  });
  it.each(["super_admin", "tenant_admin", "country_admin", undefined])("requires password and fresh proof before removing the last authenticator for %s", async (role) => {
    const person = await account(role); const old = await enroll(person);
    expect((await request("/two-factor/generate-backup-codes", { password: "wrong-password" }, person.browser)).status).toBe(400);
    const generated = await request("/two-factor/generate-backup-codes", { password }, person.browser);
    expect(generated.status).toBe(200);
    expect((await request("/two-factor/ack-backup-codes", { saved: true }, person.browser)).status).toBe(200);
    const login = await request("/sign-in/email", { email: person.email, password });
    expect((await request("/two-factor/verify-backup-code", { code: old[0] }, login.browser)).status).toBe(401);
    expect((await request("/two-factor/verify-backup-code", { code: generated.data.backupCodes[0] }, login.browser)).status).toBe(200);
    await database.update(session).set({ mfaVerifiedAt: new Date(Date.now() - 301000) }).where(eq(session.userId, person.id));
    expect((await request("/two-factor/disable", { password }, login.browser)).status).toBe(403);
    expect((await request("/two-factor/verify-backup-code", { code: generated.data.backupCodes[1] }, login.browser)).status).toBe(200);
    const pending = await request("/sign-in/email", { email: person.email, password });
    expect((await request("/two-factor/disable", { password: "incorrect" }, login.browser)).status).toBe(400);
    expect((await request("/two-factor/disable", { password }, login.browser)).status).toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.twoFactorEnabled).toBe(false);
    expect(await database.select().from(session).where(eq(session.userId, person.id))).toHaveLength(1);
    expect((await request("/update-user", { name: "Revoked session" }, person.browser)).status).toBe(401);
    expect((await request("/two-factor/challenge-status", undefined, pending.browser)).data.available).toBe(false);
    expect((await request("/two-factor/verify-backup-code", { code: generated.data.backupCodes[2] }, login.browser)).status).toBe(403);
    const passwordOnly = await request("/sign-in/email", { email: person.email, password });
    expect(passwordOnly.data.twoFactorRedirect).not.toBe(true);
    expect((await request("/update-user", { name: "MFA turned off" }, passwordOnly.browser)).status).toBe(200);
  });
  it("preserves MFA during password changes and recovery and invalidates pending challenges", async () => {
    const person = await account("country_admin"); await enroll(person);
    const pending = await request("/sign-in/email", { email: person.email, password });
    const changed = "Changed-mfa-password-123";
    expect((await request("/change-password", { currentPassword: password, newPassword: changed }, person.browser)).status).toBe(200);
    expect((await request("/update-user", { name: "Still verified" }, person.browser)).status).toBe(200);
    expect((await request("/two-factor/challenge-status", undefined, pending.browser)).data.available).toBe(false);
    let resetURL = "";
    const recovery = createAuth({ ...options, sendPasswordResetEmail: async (message: { to: string; url: string }) => { resetURL = message.url; } });
    const pendingReset = await request("/sign-in/email", { email: person.email, password: changed });
    expect((await request("/request-password-reset", { email: person.email, redirectTo: origin + "/reset-password" }, person.browser, recovery)).status).toBe(200);
    await vi.waitFor(() => expect(resetURL).not.toBe(""));
    const token = new URL(resetURL).pathname.split("/").pop()!;
    expect((await request("/reset-password", { token, newPassword: password }, person.browser, recovery)).status).toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.twoFactorEnabled).toBe(true);
    expect(await database.select().from(session).where(eq(session.userId, person.id))).toHaveLength(0);
    expect((await request("/two-factor/challenge-status", undefined, pendingReset.browser)).data.available).toBe(false);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).toBe(true);
  });
  it("rolls back enrollment, session rotation and code consumption when auditing fails", async () => {
    const person = await account(); await request("/two-factor/enable", { password }, person.browser);
    const otp = await code(person.id);
    const audit = vi.spyOn(mfaStore, "auditMfa").mockRejectedValueOnce(new Error("Isolated audit failure"));
    try {
      expect((await request("/two-factor/verify-totp", { code: otp, backupCodesSaved: true }, person.browser)).status).toBe(503);
      expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.twoFactorEnabled).toBe(false);
      expect((await database.select().from(twoFactor).where(eq(twoFactor.userId, person.id)))[0]!.lastAcceptedTotpStep).toBeNull();
    } finally { audit.mockRestore(); }
    expect((await request("/two-factor/verify-totp", { code: await code(person.id), backupCodesSaved: true }, person.browser)).status).toBe(200);
  });
  it("operator recovery preserves the account, revokes sessions and leaves re-enrollment optional", async () => {
    const person = await account("super_admin"); await enroll(person);
    await resetMfaForRecovery(database, { userId: person.id, operator: "Test operator", reason: "Verified identity in isolated test" });
    expect(await database.select().from(twoFactor).where(eq(twoFactor.userId, person.id))).toHaveLength(0);
    expect(await database.select().from(session).where(eq(session.userId, person.id))).toHaveLength(0);
    const login = await request("/sign-in/email", { email: person.email, password });
    expect(login.status).toBe(200);
    expect(login.data.twoFactorRedirect).not.toBe(true);
    expect((await request("/update-user", { name: "Recovered account" }, login.browser)).status).toBe(200);
  });
});
