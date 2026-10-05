import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import { symmetricDecrypt } from "better-auth/crypto";
import { transactionalDb as database, tenants, userTenants, activityLog } from "@epl-fellows-platform/db";
import { user, session, twoFactor, verification, mfaBrowser } from "@epl-fellows-platform/db/schema/auth";
import { createAuth } from "./create-auth";
import { getMfaStatus, resetMfaForRecovery } from "./mfa-store";
import * as store from "./mfa-store";
import { virtualCredential } from "./test-webauthn";
import * as auditWriter from "@epl-fellows-platform/db/audit";
import { sendOtpEmail } from "@epl-fellows-platform/email";

import { auditEvents } from "@epl-fellows-platform/db/schema/audit";
import { revokeRememberedBrowsers } from "@epl-fellows-platform/db/mfa-browsers";
import { revokeAccessSessions } from "@epl-fellows-platform/db/access-sessions";
const WEEK = 7 * 86400000;
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("seven-day remembered browsers with isolated PostgreSQL", { timeout: 180000 }, () => {
  const origin = "http://localhost:4301", baseURL = "http://localhost:4300", secret = "isolated-methods-test-secret-at-least-32", password = "Methods-test-password-123";
  const resetUrls = new Map<string, string>();
  const messages = new Map<string, string>(), ids: string[] = [];
  const sendEmail = vi.fn(async (data: { to: string; code: string; purpose: "login" | "enrollment" }) => { messages.set(data.to, data.code); });
  const options = { database, mfaDatabase: database, secret, baseURL, trustedOrigin: origin, production: false, sendPasswordResetEmail: async (data: { to: string; url: string }) => { resetUrls.set(data.to, data.url); }, sendOtpEmail: sendEmail };
  const auth = createAuth(options), provision = createAuth({ ...options, trustedAccountCreation: true });
  let globalId: string, createdGlobal = false;
  type Browser = Map<string, string>;
  async function request(path: string, body?: object, browser: Browser = new Map(), instance = auth, ip = "127.0.0.44", requestOrigin = origin) {
    const response = await instance.handler(new Request(baseURL + "/api/auth" + path, { method: body ? "POST" : "GET", headers: { origin: requestOrigin, "content-type": "application/json", "x-epl-client-ip": ip, cookie: [...browser].map(([key, value]) => key + "=" + value).join("; ") }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    for (const header of response.headers.getSetCookie()) { const first = header.split(";")[0]!, index = first.indexOf("="); if (/max-age=0/i.test(header)) browser.delete(first.slice(0, index)); else browser.set(first.slice(0, index), first.slice(index + 1)); }
    return { status: response.status, data: await response.json().catch(() => ({})) as Record<string, any>, browser };
  }
  async function account(role?: string) {
    const email = randomUUID() + "@example.test";
    const result = await provision.api.signUpEmail({ body: { name: "Methods test", email, password } }); ids.push(result.user.id);
    if (role) await database.insert(userTenants).values({ userId: result.user.id, tenantId: globalId, role });
    return { id: result.user.id, email, browser: (await request("/sign-in/email", { email, password })).browser };
  }
  async function cooldown(id: string) { await database.update(user).set({ mfaEmailLastSentAt: new Date(Date.now() - 61000) }).where(eq(user.id, id)); }
  async function emailEnrollment(person: Awaited<ReturnType<typeof account>>) {
    const setup = await request("/two-factor/email-enroll", { password }, person.browser); expect(setup.status).toBe(200); expect(setup.data.sent).toBe(true);
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: messages.get(person.email), backupCodesSaved: true }, person.browser)).status).toBe(200);
    await cooldown(person.id); return setup.data.backupCodes as string[];
  }
  async function keyEnrollment(person: Awaited<ReturnType<typeof account>>, name = "Test laptop") {
    const setup = await request("/two-factor/passkey-prepare", { password }, person.browser); expect(setup.status).toBe(200);
    expect((await request("/two-factor/ack-backup-codes", { saved: true }, person.browser)).status).toBe(200);
    const options = await request("/passkey/generate-register-options", undefined, person.browser); expect(options.status).toBe(200);
    const credential = virtualCredential();
    const result = await request("/passkey/verify-registration", { name, response: credential.register(options.data.challenge, options.data.user.id, origin) }, person.browser);
    expect(result.status).toBe(200); return { credential, id: result.data.id as string, backupCodes: setup.data.backupCodes as string[] };
  }
  async function passkeyLogin(credential: ReturnType<typeof virtualCredential>, browser: Browser = new Map()) {
    const options = await request("/passkey/generate-authenticate-options", undefined, browser);
    expect(options.status).toBe(200);
    expect(options.data.userVerification).toBe("required");
    return request("/passkey/verify-authentication", { response: credential.authenticate(options.data.challenge, origin) }, browser);
  }
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !["55432", "15432"].includes(parsed.port) || parsed.pathname !== "/epl_settings_test" || process.env.DATABASE_URL !== url) throw new Error("Use only the isolated MFA test database.");
    const ddl = await readFile(new URL("../../db/sql/add-mfa.sql", import.meta.url), "utf8");
    await database.transaction(async (tx) => { await tx.execute(sql`set local client_min_messages = warning`); await tx.execute(sql.raw(ddl)); await tx.execute(sql.raw(ddl)); });
    const [global] = await database.select().from(tenants).where(eq(tenants.countryCode, "GLOBAL")).limit(1); globalId = global?.id ?? randomUUID();
    if (!global) { createdGlobal = true; await database.insert(tenants).values({ id: globalId, name: "Methods Test Global", slug: "methods-" + randomUUID(), countryCode: "GLOBAL" }); }
  });
  afterAll(async () => {
    if (ids.length) {
      await database.delete(activityLog).where(sql`${activityLog.metadata}->>'userId' in ${ids}`);
      await database.delete(verification).where(inArray(verification.value, ids));
      await database.delete(user).where(inArray(user.id, ids));
    }
    if (createdGlobal) await database.delete(tenants).where(eq(tenants.id, globalId));
    await database.$client.end({ timeout: 3 });
  });

  async function browsers(id: string) { return database.select().from(mfaBrowser).where(eq(mfaBrowser.userId, id)); }
  async function age(person: Awaited<ReturnType<typeof account>>, millis: number) {
    const time = new Date(Date.now() - millis);
    await database.update(mfaBrowser).set({ verifiedAt: time, expiresAt: new Date(time.getTime() + WEEK) }).where(eq(mfaBrowser.userId, person.id));
    await database.update(session).set({ mfaVerifiedAt: time }).where(eq(session.userId, person.id));
  }
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer", undefined])("remembers email verification for %s across sign-out without sliding expiry", async (role) => {
    const person = await account(role); await emailEnrollment(person);
    if (role === "super_admin") await database.insert(userTenants).values({ userId: person.id, tenantId: globalId, role: "viewer" }).onConflictDoNothing();
    await age(person, 86400000);
    const [before] = await browsers(person.id);
    expect([...person.browser.keys()].some((key) => key.includes("epl_mfa_browser"))).toBe(true);
    expect((await request("/sign-out", {}, person.browser)).status).toBe(200);
    const login = await request("/sign-in/email", { email: person.email, password }, person.browser);
    expect(login.status).toBe(200); expect(login.data.twoFactorRedirect).not.toBe(true);
    const [device] = await database.select().from(session).where(eq(session.userId, person.id));
    expect(device!.mfaVerifiedAt).toEqual(before!.verifiedAt);
    expect(await getMfaStatus(database, person.id, device!.id)).toMatchObject({ required: false, verified: true, fresh: false, browserRememberedUntil: before!.expiresAt.toISOString() });
    expect((await browsers(person.id))[0]!.expiresAt).toEqual(before!.expiresAt);
    expect((await request("/two-factor/generate-backup-codes", { password }, person.browser)).data.code).toBe("MFA_FRESH_VERIFICATION_REQUIRED");
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).toBe(true);
    const log = await database.select().from(auditEvents).where(and(eq(auditEvents.targetId, person.id), eq(auditEvents.action, "auth.sign_in")));
    expect(log.some((row) => row.details?.remembered === true && row.details?.method === "email")).toBe(true);
    expect(JSON.stringify(login.data)).not.toContain("mfaBrowserId");
  });
  it("does not accept forged, missing, wrong-account or revoked browser tokens", async () => {
    const one = await account(), two = await account(); await emailEnrollment(one); await emailEnrollment(two);
    const cookie = [...one.browser].find(([key]) => key.includes("epl_mfa_browser"))!;
    for (const browser of [new Map(), new Map([[cookie[0], "forged"]]), new Map([cookie])]) {
      const result = await request("/sign-in/email", { email: two.email, password }, browser);
      expect(result.data.twoFactorRedirect).toBe(true);
    }
    const [record] = await browsers(one.id);
    expect(record!.tokenHash).not.toContain(decodeURIComponent(cookie[1]).split(".")[0]);
    await database.transaction(async (tx) => { await store.lockMfaAccount(tx, one.id); await revokeRememberedBrowsers(tx, one.id, { reason: "TEST_REVOKED" }); });
    expect((await request("/update-user", { name: "Denied" }, one.browser)).data.code).toBe("MFA_VERIFICATION_REQUIRED");
    expect((await request("/sign-in/email", { email: one.email, password }, one.browser)).data.twoFactorRedirect).toBe(true);
  });
  it("expires continuously active sessions and remembered password sign-ins after seven days", async () => {
    const person = await account(); await emailEnrollment(person); await age(person, WEEK + 1);
    expect((await request("/update-user", { name: "Expired" }, person.browser)).data.code).toBe("MFA_VERIFICATION_REQUIRED");
    const [device] = await database.select().from(session).where(eq(session.userId, person.id));
    expect(await getMfaStatus(database, person.id, device!.id)).toMatchObject({ verified: false, fresh: false, browserRememberedUntil: null });
    expect((await request("/sign-in/email", { email: person.email, password }, person.browser)).data.twoFactorRedirect).toBe(true);
  });
  it("remembers a passkey and backup code only after actual successful verification", async () => {
    const person = await account(); const key = await keyEnrollment(person);
    expect((await browsers(person.id)).some((row) => row.verificationMethod === "passkey" && !row.revokedAt)).toBe(true);
    const signed = await passkeyLogin(key.credential); expect(signed.status).toBe(200);
    await request("/sign-out", {}, signed.browser);
    expect((await request("/sign-in/email", { email: person.email, password }, signed.browser)).data.twoFactorRedirect).not.toBe(true);
    const challenge = await request("/sign-in/email", { email: person.email, password });
    expect((await request("/two-factor/verify-backup-code", { code: key.backupCodes[0] }, challenge.browser)).status).toBe(200);
    expect((await browsers(person.id)).some((row) => row.verificationMethod === "backup" && !row.revokedAt)).toBe(true);
    await request("/sign-out", {}, challenge.browser);
    expect((await request("/sign-in/email", { email: person.email, password }, challenge.browser)).data.twoFactorRedirect).not.toBe(true);
  });
  it("forgets the browser, ends its sessions and rejects cross-origin forgetting", async () => {
    const person = await account(); await emailEnrollment(person);
    expect((await request("/two-factor/forget-browser", {}, person.browser, auth, "127.0.0.44", "https://evil.test")).status).toBe(403);
    expect((await request("/two-factor/forget-browser", {}, person.browser)).status).toBe(200);
    expect((await browsers(person.id)).every((row) => row.revokedAt)).toBe(true);
    expect([...person.browser.keys()].some((key) => key.includes("epl_mfa_browser"))).toBe(false);
    expect((await request("/sign-in/email", { email: person.email, password }, person.browser)).data.twoFactorRedirect).toBe(true);
  });
  it("bulk revocation keeps only the current browser and individual revocation rejects another user's session", async () => {
    const person = await account(); const codes = await emailEnrollment(person);
    const other = await request("/sign-in/email", { email: person.email, password });
    await request("/two-factor/verify-backup-code", { code: codes[0] }, other.browser);
    const devices = await database.select().from(session).where(eq(session.userId, person.id));
    const backup = devices.find((row) => row.mfaVerificationMethod === "backup")!;
    const outsider = await account();
    await request("/revoke-session", { token: backup.token }, outsider.browser);
    expect((await getMfaStatus(database, person.id, backup.id))?.verified).toBe(true);
    expect((await browsers(person.id)).filter((row) => !row.revokedAt)).toHaveLength(2);
    expect((await request("/revoke-other-sessions", {}, person.browser)).status).toBe(200);
    expect((await browsers(person.id)).filter((row) => !row.revokedAt)).toHaveLength(1);
    expect((await request("/sign-in/email", { email: person.email, password }, other.browser)).data.twoFactorRedirect).toBe(true);
    const fresh = await request("/sign-in/email", { email: person.email, password });
    await request("/two-factor/verify-backup-code", { code: codes[1] }, fresh.browser);
    const [target] = await database.select().from(session).where(and(eq(session.userId, person.id), eq(session.mfaVerificationMethod, "backup")));
    expect((await request("/revoke-session", { token: target!.token }, person.browser)).status).toBe(200);
    expect((await request("/sign-in/email", { email: person.email, password }, fresh.browser)).data.twoFactorRedirect).toBe(true);
  });
  it.each(["password", "codes", "disable", "access", "recovery"])("invalidates allowances on %s changes", async (change) => {
    const person = await account(); await emailEnrollment(person);
    if (change === "password") expect((await request("/change-password", { currentPassword: password, newPassword: password + "-new" }, person.browser)).status).toBe(200);
    if (change === "codes") expect((await request("/two-factor/generate-backup-codes", { password }, person.browser)).status).toBe(200);
    if (change === "disable") expect((await request("/two-factor/email-disable", { password }, person.browser)).status).toBe(200);
    if (change === "access") await database.transaction((tx) => revokeAccessSessions(tx, person.id));
    if (change === "recovery") await resetMfaForRecovery(database, { userId: person.id, operator: "weekly-test", reason: "Verified test identity" });
    expect((await browsers(person.id)).every((row) => row.revokedAt)).toBe(true);
    if (change === "password" || change === "codes") expect((await request("/update-user", { name: "Current session retained" }, person.browser)).status).toBe(200);
  });
  it("rolls back code consumption and browser grants with the enclosing transaction", async () => {
    const person = await account(); const codes = await emailEnrollment(person);
    const challenge = await request("/sign-in/email", { email: person.email, password });
    const before = await browsers(person.id);
    const stop = new Error("Intentional rollback");
    await expect(database.transaction(async (tx) => {
      const instance = createAuth({ ...options, mfaDatabase: tx });
      expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, new Map(challenge.browser), instance)).status).toBe(200);
      throw stop;
    })).rejects.toBe(stop);
    expect(await browsers(person.id)).toEqual(before);
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, challenge.browser)).status).toBe(200);
  });

  it("remembers authenticator enrollment and preserves its real verification time", async () => {
    const person = await account();
    expect((await request("/two-factor/enable", { password }, person.browser)).status).toBe(200);
    const [factor] = await database.select().from(twoFactor).where(eq(twoFactor.userId, person.id));
    const secretValue = await symmetricDecrypt({ key: secret, data: factor!.secret });
    const otp = await auth.api.generateTOTP({ body: { secret: secretValue } });
    expect((await request("/two-factor/verify-totp", { code: otp.code, backupCodesSaved: true }, person.browser)).status).toBe(200);
    expect((await browsers(person.id))[0]!.verificationMethod).toBe("authenticator");
    await request("/sign-out", {}, person.browser);
    expect((await request("/sign-in/email", { email: person.email, password }, person.browser)).data.twoFactorRedirect).not.toBe(true);
  });
  it("invalidates remembering on password recovery without disabling email protection", async () => {
    const person = await account(); await emailEnrollment(person);
    expect((await request("/request-password-reset", { email: person.email, redirectTo: origin + "/reset-password" })).status).toBe(200);
    const token = new URL(resetUrls.get(person.email)!).pathname.split("/").pop();
    expect((await request("/reset-password", { token, newPassword: password + "-reset" })).status).toBe(200);
    expect((await browsers(person.id)).every((row) => row.revokedAt)).toBe(true);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.emailOtpEnabled).toBe(true);
    expect((await request("/sign-in/email", { email: person.email, password: password + "-reset" }, person.browser)).data.twoFactorRedirect).toBe(true);
  });
  it("submits real email through isolated Mailpit and stores only a browser token hash", async () => {
    const person = await account();
    const live = createAuth({ ...options, sendOtpEmail: async (data) => { await sendEmail(data); await sendOtpEmail(data); } });
    await request("/two-factor/email-enroll", { password }, person.browser, live);
    const inbox = await fetch("http://127.0.0.1:18025/api/v1/search?query=" + encodeURIComponent("to:" + person.email)).then((response) => response.json()) as { messages: unknown[] };
    expect(inbox.messages.length).toBeGreaterThan(0);
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: messages.get(person.email), backupCodesSaved: true }, person.browser, live)).status).toBe(200);
    expect((await browsers(person.id))[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify((await request("/list-sessions", undefined, person.browser)).data)).not.toContain("mfaBrowserId");
  });
  it("cannot issue two browser grants by consuming the same backup code concurrently", async () => {
    const person = await account(); const codes = await emailEnrollment(person);
    const challenge = await request("/sign-in/email", { email: person.email, password });
    const before = (await browsers(person.id)).length;
    const results = await Promise.all([1,2].map(() => request("/two-factor/verify-backup-code", { code: codes[0] }, new Map(challenge.browser))));
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(await browsers(person.id)).toHaveLength(before + 1);
  });
  it("serializes remembered sign-in against access revocation", async () => {
    const person = await account(); await emailEnrollment(person); await request("/sign-out", {}, person.browser);
    await Promise.all([
      request("/sign-in/email", { email: person.email, password }, person.browser),
      database.transaction((tx) => revokeAccessSessions(tx, person.id)),
    ]);
    expect((await browsers(person.id)).every((row) => row.revokedAt)).toBe(true);
    const devices = await database.select().from(session).where(eq(session.userId, person.id));
    for (const device of devices) expect((await getMfaStatus(database, person.id, device.id))?.verified).toBe(false);
  });
  it("does not consume a code or emit browser cookies when the success audit fails", async () => {
    const person = await account(); const codes = await emailEnrollment(person);
    const challenge = await request("/sign-in/email", { email: person.email, password });
    const before = await browsers(person.id), original = auditWriter.writeAudit;
    const mock = vi.spyOn(auditWriter, "writeAudit").mockImplementation(async (db, event) => {
      if (event.action === "mfa.browser_remembered" && event.actorId === person.id) throw new Error("Intentional audit failure");
      return original(db, event);
    });
    try {
      const result = await request("/two-factor/verify-backup-code", { code: codes[0] }, challenge.browser);
      expect(result.status).toBe(503);
      expect([...challenge.browser.keys()].some((key) => key.includes("epl_mfa_browser"))).toBe(false);
      expect(await browsers(person.id)).toEqual(before);
    } finally { mock.mockRestore(); }
    expect((await request("/two-factor/verify-backup-code", { code: codes[0] }, challenge.browser)).status).toBe(200);
  });
});
