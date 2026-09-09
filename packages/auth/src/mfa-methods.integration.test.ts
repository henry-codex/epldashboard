import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import { symmetricDecrypt } from "better-auth/crypto";
import { transactionalDb as database, tenants, userTenants, activityLog } from "@epl-fellows-platform/db";
import { user, session, twoFactor, verification, mfaChallenge, passkey, mfaEmailSend } from "@epl-fellows-platform/db/schema/auth";
import { createAuth } from "./create-auth";
import { getMfaStatus, resetMfaForRecovery } from "./mfa-store";
import * as store from "./mfa-store";
import { virtualCredential } from "./test-webauthn";
import { sendOtpEmail } from "@epl-fellows-platform/email";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("email OTP and passkeys with isolated PostgreSQL", { timeout: 90000 }, () => {
  const origin = "http://localhost:4301", baseURL = "http://localhost:4300", secret = "isolated-methods-test-secret-at-least-32", password = "Methods-test-password-123";
  const messages = new Map<string, string>(), ids: string[] = [];
  const sendEmail = vi.fn(async (data: { to: string; code: string; purpose: "login" | "enrollment" }) => { messages.set(data.to, data.code); });
  const options = { database, mfaDatabase: database, secret, baseURL, trustedOrigin: origin, production: false, sendPasswordResetEmail: async () => {}, sendOtpEmail: sendEmail };
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
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer", undefined])("enforces email enrollment policy for %s", async (role) => {
    const person = await account(role);
    const result = await request("/two-factor/email-enroll", { password }, person.browser);
    expect(result.status).toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.emailOtpEnabled).toBe(false);
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: messages.get(person.email), backupCodesSaved: true }, person.browser)).status).toBe(200);
    expect((await request("/update-user", { name: "Email protected" }, person.browser)).status).toBe(200);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).toBe(true);
  });
  it("enrolls with password, code and saved recovery codes, rotates sessions, and sends real Mailpit email", async () => {
    const person = await account();
    const real = createAuth({ ...options, sendOtpEmail: async (data) => { await sendEmail(data); await sendOtpEmail(data); } });
    expect((await request("/two-factor/email-enroll", { password: "incorrect" }, person.browser, real)).status).toBe(400);
    const setup = await request("/two-factor/email-enroll", { password }, person.browser, real);
    expect(setup.data).toMatchObject({ sent: true, retryAfter: 60 }); expect(setup.data.backupCodes).toHaveLength(10);
    expect(setup.data.destination).not.toBe(person.email);
    const inbox = await fetch("http://127.0.0.1:18025/api/v1/search?query=" + encodeURIComponent("to:" + person.email)).then((response) => response.json()) as { messages: { ID: string }[] };
    expect(inbox.messages.length).toBeGreaterThan(0);
    const mail = await fetch("http://127.0.0.1:18025/api/v1/message/" + inbox.messages[0]!.ID).then((response) => response.json()) as { Text: string; HTML: string };
    expect(mail.Text.includes(messages.get(person.email)!)).toBe(true); expect(mail.HTML.includes(messages.get(person.email)!)).toBe(true);
    const otp = messages.get(person.email), before = [...person.browser];
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: otp }, person.browser)).status).toBe(400);
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: otp, backupCodesSaved: true }, person.browser)).status).toBe(200);
    expect([...person.browser]).not.toEqual(before);
    const [device] = await database.select().from(session).where(eq(session.userId, person.id));
    expect(device!.mfaVerificationMethod).toBe("email");
    expect((await getMfaStatus(database, person.id, device!.id))?.verified).toBe(true);
  });
  it("binds OTP to purpose, browser and account; expires, rotates, and atomically consumes it", async () => {
    const person = await account(); await emailEnrollment(person);
    const one = await request("/sign-in/email", { email: person.email, password }), two = await request("/sign-in/email", { email: person.email, password });
    expect(one.data.twoFactorRedirect).toBe(true);
    expect((await request("/two-factor/send-otp", { purpose: "login" }, one.browser)).data.sent).toBe(true);
    const oldCode = messages.get(person.email)!;
    const rows = await database.select().from(mfaChallenge).where(eq(mfaChallenge.userId, person.id));
    expect(rows.some((row) => row.codeHash === oldCode || row.data?.includes(oldCode))).toBe(false);
    expect((await request("/two-factor/verify-otp", { purpose: "enrollment", code: oldCode }, one.browser)).status).toBe(403);
    expect((await request("/two-factor/verify-otp", { code: oldCode }, two.browser)).status).not.toBe(200);
    const other = await account(); expect((await request("/two-factor/verify-otp", { code: oldCode }, other.browser)).status).not.toBe(200);
    expect((await request("/two-factor/send-otp", {}, one.browser)).status).toBe(429);
    await cooldown(person.id);
    expect((await request("/two-factor/send-otp", {}, one.browser)).data.sent).toBe(true);
    const currentCode = messages.get(person.email)!;
    if (oldCode !== currentCode) expect((await request("/two-factor/verify-otp", { code: oldCode }, one.browser)).status).toBe(401);
    await database.update(mfaChallenge).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(mfaChallenge.userId, person.id));
    expect((await request("/two-factor/verify-otp", { code: currentCode }, one.browser)).data.code).toBe("OTP_EXPIRED");
    await cooldown(person.id); await request("/two-factor/send-otp", {}, one.browser);
    const response = await Promise.all([request("/two-factor/verify-otp", { code: messages.get(person.email) }, new Map(one.browser)), request("/two-factor/verify-otp", { code: messages.get(person.email) }, new Map(one.browser))]);
    expect(response.filter((value) => value.status === 200)).toHaveLength(1);
    expect((await request("/two-factor/verify-otp", { code: messages.get(person.email) }, one.browser)).status).not.toBe(200);
  });
  it("records SMTP submission failure and keeps persisted cooldown and hourly limits", async () => {
    const person = await account();
    const failing = createAuth({ ...options, sendOtpEmail: async () => { throw new Error("SMTP test failure"); } });
    const result = await request("/two-factor/email-enroll", { password }, person.browser, failing);
    expect(result.data.sent).toBe(false); expect(result.data.code).toBe("EMAIL_SEND_FAILED");
    expect((await database.select().from(mfaChallenge).where(and(eq(mfaChallenge.userId, person.id), eq(mfaChallenge.purpose, "email-enrollment"))))[0]).toMatchObject({ deliveryStatus: "failed", codeHash: null });
    expect((await request("/two-factor/send-otp", { purpose: "enrollment" }, person.browser)).status).toBe(429);
    await cooldown(person.id);
    expect((await request("/two-factor/send-otp", { purpose: "enrollment" }, person.browser)).data.sent).toBe(true);
    await cooldown(person.id);
    await database.insert(mfaEmailSend).values(Array.from({ length: 10 }, () => ({ id: randomUUID(), userId: person.id })));
    expect((await request("/two-factor/send-otp", { purpose: "enrollment" }, person.browser)).data.code).toBe("OTP_ACCOUNT_SEND_LIMIT");
  });
  it("retains email protection after promotion and preserves recovery codes when adding another method", async () => {
    const person = await account(); const codes = await emailEnrollment(person);
    await database.insert(userTenants).values({ userId: person.id, tenantId: globalId, role: "country_admin" });
    expect((await request("/update-user", { name: "Promoted account" }, person.browser)).status).toBe(200);
    const promotedLogin = await request("/sign-in/email", { email: person.email, password });
    expect(promotedLogin.data.twoFactorRedirect).toBe(true);
    expect((await request("/update-user", { name: "Needs verification" }, promotedLogin.browser)).status).toBe(401);
    await cooldown(person.id);
    expect((await request("/two-factor/send-otp", {}, promotedLogin.browser)).data.sent).toBe(true);
    expect((await request("/two-factor/verify-otp", { code: messages.get(person.email) }, promotedLogin.browser)).status).toBe(200);
    expect((await request("/update-user", { name: "Verified promoted account" }, promotedLogin.browser)).status).toBe(200);
    const key = await keyEnrollment(person);
    expect(key.backupCodes).toEqual([]);
    const [stored] = await database.select().from(user).where(eq(user.id, person.id));
    expect(JSON.parse(await symmetricDecrypt({ key: secret, data: stored!.mfaBackupCodes! }))).toEqual(codes);
    expect((await request("/update-user", { name: "Strong verified" }, person.browser)).status).toBe(200);
  });
  it("requires signed-in registration, password, acknowledgment and user verification; rejects an incorrect origin", async () => {
    expect((await request("/passkey/generate-register-options")).status).toBe(401);
    const person = await account("super_admin");
    expect((await request("/passkey/generate-register-options", undefined, person.browser)).status).toBe(401);
    expect((await request("/two-factor/passkey-prepare", { password: "incorrect" }, person.browser)).status).toBe(400);
    await request("/two-factor/passkey-prepare", { password }, person.browser);
    expect((await request("/passkey/generate-register-options", undefined, person.browser)).status).toBe(400);
    await request("/two-factor/ack-backup-codes", { saved: true }, person.browser);
    const options = await request("/passkey/generate-register-options", undefined, person.browser);
    expect(options.data.authenticatorSelection.userVerification).toBe("required");
    const key = virtualCredential();
    const missingUV = key.register(options.data.challenge, options.data.user.id, origin, false);
    expect((await request("/passkey/verify-registration", { response: missingUV }, person.browser)).data.code).toBe("PASSKEY_VERIFICATION_FAILED");
    const wrongOrigin = key.register(options.data.challenge, options.data.user.id, "https://evil.test");
    expect((await request("/passkey/verify-registration", { response: wrongOrigin }, person.browser)).status).toBe(401);
    expect(await database.select().from(passkey).where(eq(passkey.userId, person.id))).toHaveLength(0);
  });
  it("signs in with UV, rejects replay and wrong accounts, and consumes challenges and counters together", async () => {
    const person = await account("tenant_admin"), { credential } = await keyEnrollment(person);
    const login = await passkeyLogin(credential); expect(login.status).toBe(200);
    expect((await request("/update-user", { name: "Passkey login" }, login.browser)).status).toBe(200);
    const fresh = await request("/passkey/generate-authenticate-options");
    const invalid = credential.authenticate(fresh.data.challenge, origin, false);
    expect((await request("/passkey/verify-authentication", { response: invalid }, fresh.browser)).status).toBe(401);
    const assertion = credential.authenticate(fresh.data.challenge, origin);
    const responses = await Promise.all([request("/passkey/verify-authentication", { response: assertion }, new Map(fresh.browser)), request("/passkey/verify-authentication", { response: assertion }, new Map(fresh.browser))]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect((await request("/passkey/verify-authentication", { response: assertion }, fresh.browser)).data.code).toBe("CHALLENGE_NOT_FOUND");
    const other = await account(); await keyEnrollment(other);
    const wrong = await request("/passkey/generate-authenticate-options", undefined, other.browser);
    expect((await request("/passkey/verify-authentication", { response: credential.authenticate(wrong.data.challenge, origin) }, other.browser)).data.code).toBe("WRONG_ACCOUNT");
    const [stored] = await database.select().from(passkey).where(eq(passkey.credentialID, credential.id));
    expect(stored!.counter).toBeGreaterThan(0);
  });
  it("supports names and concurrent passkey removal including the final method", async () => {
    const person = await account("country_admin"), first = await keyEnrollment(person);
    expect((await request("/passkey/delete-passkey", { id: first.id, password: "incorrect" }, person.browser)).status).toBe(400);
    const second = await keyEnrollment(person, "Second device");
    expect((await request("/passkey/update-passkey", { id: second.id, name: "  Work phone  " }, person.browser)).status).toBe(200);
    expect((await request("/passkey/list-user-passkeys", undefined, person.browser)).data).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Work phone" })]));
    const results = await Promise.all([request("/passkey/delete-passkey", { id: first.id, password }, new Map(person.browser)), request("/passkey/delete-passkey", { id: second.id, password }, new Map(person.browser))]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 200]);
    expect(await database.select().from(passkey).where(eq(passkey.userId, person.id))).toHaveLength(0);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.twoFactorEnabled).toBe(false);
    expect((await request("/sign-in/email", { email: person.email, password })).data.twoFactorRedirect).not.toBe(true);
  });
  it("shares locks and rate limits across methods, enforces freshness, and forbids trusted devices", async () => {
    const person = await account(); await emailEnrollment(person);
    const login = await request("/sign-in/email", { email: person.email, password });
    await request("/two-factor/send-otp", {}, login.browser);
    for (let n = 0; n < 10; n++) expect((await request(n % 2 ? "/two-factor/verify-backup-code" : "/two-factor/verify-otp", { code: "invalid" }, login.browser)).status).toBe(401);
    expect((await request("/two-factor/verify-otp", { code: messages.get(person.email) }, login.browser)).data.code).toBe("MFA_ACCOUNT_LOCKED");
    await database.update(user).set({ mfaLockedUntil: new Date(Date.now() - 1) }).where(eq(user.id, person.id));
    expect((await request("/two-factor/verify-otp", { code: messages.get(person.email) }, login.browser)).status).toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]!.mfaFailedAttempts).toBe(0);
    await database.update(session).set({ mfaVerifiedAt: new Date(Date.now() - 301000) }).where(eq(session.userId, person.id));
    expect((await request("/two-factor/passkey-prepare", { password }, login.browser)).data.code).toBe("MFA_FRESH_VERIFICATION_REQUIRED");
    expect((await request("/two-factor/verify-otp", { code: "123456", trustDevice: true }, login.browser)).status).toBe(400);
    const limited = createAuth({ ...options, rateLimit: true }), ip = randomUUID();
    for (let n = 0; n < 5; n++) await request("/two-factor/verify-backup-code", { code: "invalid" }, login.browser, limited, ip);
    expect((await request("/passkey/verify-authentication", { response: { id: "invalid" } }, new Map(), limited, ip)).status).toBe(429);
    const sendIp = randomUUID();
    for (let n = 0; n < 3; n++) await request("/two-factor/send-otp", {}, login.browser, limited, sendIp);
    expect((await request("/two-factor/send-otp", {}, login.browser, limited, sendIp)).status).toBe(429);
  });
  it("preserves factors on recovery, invalidates anonymous pre-reset passkey requests, and operator recovery clears every factor", async () => {
    const person = await account(), key = await keyEnrollment(person);
    await emailEnrollment(person);
    expect((await request("/two-factor/enable", { password }, person.browser)).status).toBe(200);
    const [factor] = await database.select().from(twoFactor).where(eq(twoFactor.userId, person.id));
    const plain = await symmetricDecrypt({ key: secret, data: factor!.secret });
    const otp = (await auth.api.generateTOTP({ body: { secret: plain } })).code;
    expect((await request("/two-factor/verify-totp", { code: otp, backupCodesSaved: true }, person.browser)).status).toBe(200);
    const challenge = await request("/passkey/generate-authenticate-options");
    let resetURL = "";
    const recovery = createAuth({ ...options, sendPasswordResetEmail: async (data) => { resetURL = data.url; } });
    await request("/request-password-reset", { email: person.email, redirectTo: origin + "/reset-password" }, new Map(), recovery);
    await vi.waitFor(() => expect(Boolean(resetURL)).toBe(true));
    const token = new URL(resetURL).pathname.split("/").pop();
    expect((await request("/reset-password", { token, newPassword: "New-methods-password-123" }, new Map(), recovery)).status).toBe(200);
    expect((await request("/passkey/verify-authentication", { response: key.credential.authenticate(challenge.data.challenge, origin) }, challenge.browser)).data.code).toBe("CHALLENGE_NOT_FOUND");
    expect(await database.select().from(session).where(eq(session.userId, person.id))).toHaveLength(0);
    expect((await passkeyLogin(key.credential)).status).toBe(200);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]).toMatchObject({ emailOtpEnabled: true, totpEnabled: true });
    expect(await database.select().from(passkey).where(eq(passkey.userId, person.id))).toHaveLength(1);
    await resetMfaForRecovery(database, { userId: person.id, operator: "Isolated operator", reason: "Identity verified in test" });
    expect(await database.select().from(passkey).where(eq(passkey.userId, person.id))).toHaveLength(0);
    expect(await database.select().from(twoFactor).where(eq(twoFactor.userId, person.id))).toHaveLength(0);
    expect(await database.select().from(mfaChallenge).where(eq(mfaChallenge.userId, person.id))).toHaveLength(0);
    expect((await database.select().from(user).where(eq(user.id, person.id)))[0]).toMatchObject({ twoFactorEnabled: false, emailOtpEnabled: false, totpEnabled: false, mfaBackupCodes: null });
  }, 180000); // Exercises all three factors and recovery with real password hashing.
  it("rolls back a credential, shared recovery state and session rotation when auditing fails", async () => {
    const person = await account();
    await request("/two-factor/passkey-prepare", { password }, person.browser); await request("/two-factor/ack-backup-codes", { saved: true }, person.browser);
    const options = await request("/passkey/generate-register-options", undefined, person.browser), key = virtualCredential();
    const response = key.register(options.data.challenge, options.data.user.id, origin), original = new Map(person.browser);
    const originalAudit = store.auditMfa;
    const audit = vi.spyOn(store, "auditMfa").mockImplementation((db, id, ...args) => id === person.id
      ? Promise.reject(new Error("Isolated audit failure")) : originalAudit(db, id, ...args));
    try {
      expect((await request("/passkey/verify-registration", { response }, person.browser)).status).toBe(503);
      expect(person.browser).toEqual(original);
      expect(await database.select().from(passkey).where(eq(passkey.userId, person.id))).toHaveLength(0);
    } finally { audit.mockRestore(); }
    expect((await request("/passkey/verify-registration", { response }, person.browser)).status).toBe(200);
  });
  it("requires legacy sessions without method metadata to verify again", async () => {
    const person = await account(); await keyEnrollment(person);
    await database.update(session).set({ mfaVerificationMethod: null }).where(eq(session.userId, person.id));
    expect((await request("/update-user", { name: "Unverified legacy" }, person.browser)).data.code).toBe("MFA_VERIFICATION_REQUIRED");
    expect((await request("/get-session", undefined, person.browser)).data.session.mfaVerificationMethod).toBeUndefined();
    expect((await request("/get-session", undefined, person.browser)).data.user.mfaBackupCodes).toBeUndefined();
  });
});
