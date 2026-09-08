import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { transactionalDb as database, invitations, tenants, userTenants, activityLog, user, account, type AccessTransaction } from "@epl-fellows-platform/db";
import { sendInvitationEmail } from "@epl-fellows-platform/email";
import { createAuth } from "./create-auth";
import { createInvitationService, withAccessTransaction } from "./invitation-service";
import { INVITATION_TTL_MS } from "./invitation-policy";

const connectionString = process.env.TEST_DATABASE_URL;
describe.skipIf(!connectionString)("invitation onboarding with PostgreSQL and Mailpit", () => {
  const baseURL = "http://localhost:4300";
  const origin = "http://localhost:4301";
  const password = "Invitation-test-password-123";
  const options = { database, baseURL, trustedOrigin: origin, secret: "isolated-invitation-test-secret-at-least-32", production: false, sendPasswordResetEmail: async () => {} };
  const emails: string[] = [];
  const hubs: string[] = [];
  const messages = new Map<string, string>();
  let failDelivery = false;
  let failCreation = false;
  let auth: ReturnType<typeof createAuth>;
  let service: ReturnType<typeof createInvitationService>;
  function email() { const value = "invite-test-" + randomUUID() + "@example.test"; emails.push(value); return value; }
  const token = (address: string) => new URL(messages.get(address)!).searchParams.get("token")!;
  async function createUser(tx: AccessTransaction, data: { name: string; email: string; password: string }) {
    const result = await createAuth({ ...options, database: tx, trustedAccountCreation: true }).api.signUpEmail({ body: data });
    if (failCreation) throw new Error("Injected failure after credential creation");
    return result.user;
  }
  async function hub() {
    const [row] = await database.insert(tenants).values({ name: "Invitation Test Hub", slug: "invite-test-" + randomUUID(), countryCode: "IT", isActive: true }).returning();
    hubs.push(row!.id); return row!.id;
  }
  async function person(role: string | null, tenantId?: string) {
    const address = email();
    const result = await withAccessTransaction(database, async (tx) => {
      const created = await createUser(tx, { email: address, name: "Invitation Test", password });
      if (role && tenantId) await tx.insert(userTenants).values({ userId: created.id, tenantId, role, permissions: {} });
      return created;
    });
    return { id: result.id, email: address };
  }
  async function fixture() {
    const tenantId = await hub();
    const admin = await person("super_admin", tenantId);
    return { tenantId, admin };
  }
  async function request(path: string, body?: object, cookie?: string, instance = auth, requestOrigin = origin) {
    const response = await instance.handler(new Request(baseURL + "/api/auth" + path, {
      method: body ? "POST" : "GET",
      headers: { origin: requestOrigin, "content-type": "application/json", "user-agent": "EPL invitation tests", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
    return { status: response.status, data: response.headers.get("content-type")?.includes("application/json") ? await response.json() : null, cookie: response.headers.getSetCookie().map((part) => part.split(";")[0]).join("; ") || cookie || "" };
  }
  const login = (address: string, secret = password) => request("/sign-in/email", { email: address, password: secret });
  const accepted = (value: string, cookie?: string) => request("/invitations/accept", { token: value, name: "  Invited Person  ", password }, cookie);
  const invite = (actorId: string, tenantId: string, address = email(), role: "viewer" | "country_admin" | "tenant_admin" | "alumni_exec" | "super_admin" = "viewer") =>
    service.issue(actorId, { name: "Invited Person", email: address, tenantId, role });

  beforeAll(() => {
    const url = new URL(connectionString!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "55432" || url.pathname !== "/epl_settings_test" || process.env.DATABASE_URL !== connectionString) {
      throw new Error("Both DATABASE_URL and TEST_DATABASE_URL must target epl_settings_test on loopback port 55432");
    }
    service = createInvitationService({ database, frontendURL: origin, createUser, sendEmail: async (data) => {
      messages.set(data.to, data.url);
      if (failDelivery) throw new Error("private SMTP credentials and token");
      await sendInvitationEmail(data);
    } });
    auth = createAuth({ ...options, invitations: service });
  });
  afterAll(async () => {
    if (!hubs.length) return;
    await database.delete(activityLog).where(inArray(activityLog.tenantId, hubs));
    await database.delete(invitations).where(inArray(invitations.tenantId, hubs));
    await database.delete(userTenants).where(inArray(userTenants.tenantId, hubs));
    await database.delete(user).where(inArray(user.email, emails));
    await database.delete(tenants).where(inArray(tenants.id, hubs));
    await database.$client.end({ timeout: 2 });
  });

  it("blocks direct public signup", async () => {
    expect((await request("/sign-up/email", { name: "Bypass", email: email(), password })).status).toBe(400);
  });
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer"])("enforces actual invitation authority for %s", async (role) => {
    const tenantId = await hub(); const actor = await person(role, tenantId);
    if (["super_admin", "country_admin"].includes(role)) expect((await invite(actor.id, tenantId, email(), "country_admin")).status).toBe("pending");
    else await expect(invite(actor.id, tenantId, email(), "country_admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects cross-hub invitations and role escalation by country managers", async () => {
    const own = await hub(); const other = await hub(); const manager = await person("country_admin", own);
    await expect(invite(manager.id, other, email(), "country_admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(invite(manager.id, own, email(), "super_admin")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("delivers an invitation, previews without consuming, and creates one verified account atomically", async () => {
    const { admin, tenantId } = await fixture(); const address = email();
    const result = await invite(admin.id, tenantId, address);
    expect(result.deliveryStatus).toBe("sent");
    expect(Object.hasOwn(result, "tokenHash") || Object.hasOwn(result, "token")).toBe(false);
    const raw = token(address);
    const stored = await database.query.invitations.findFirst({ where: eq(invitations.id, result.id) });
    expect(stored!.tokenHash.length).toBe(64); expect(stored!.tokenHash === raw).toBe(false);
    expect(stored!.expiresAt.getTime() - stored!.createdAt.getTime()).toBeGreaterThan(INVITATION_TTL_MS - 2000);
    expect((await request("/invitations/preview", { token: raw })).status).toBe(200);
    expect((await request("/invitations/preview", { token: raw })).status).toBe(200);
    const inbox = await (await fetch("http://127.0.0.1:18025/api/v1/messages")).json() as { messages: { To: { Address: string }[] }[] };
    expect(inbox.messages.some((message) => message.To.some((to) => to.Address === address))).toBe(true);
    const response = await accepted(raw);
    expect(response.status).toBe(200); expect(response.cookie).toBe("");
    const created = await database.query.user.findFirst({ where: eq(user.email, address) });
    expect(created).toMatchObject({ name: "Invited Person", emailVerified: true });
    expect(await database.query.account.findFirst({ where: and(eq(account.userId, created!.id), eq(account.providerId, "credential")) })).toBeDefined();
    expect((await database.select().from(userTenants).where(eq(userTenants.userId, created!.id))).length).toBe(1);
    expect((await accepted(raw)).status).toBe(400);
    expect((await login(address)).status).toBe(200);
  });
  it("requires the invited existing account and preserves its profile and password", async () => {
    const { admin, tenantId } = await fixture(); const existing = await person(null);
    const wrong = await person(null); const invitation = await invite(admin.id, tenantId, existing.email);
    const raw = token(existing.email);
    expect((await request("/invitations/preview", { token: raw })).data).toMatchObject({ requiresSignIn: true });
    expect((await accepted(raw)).status).toBe(401);
    expect((await accepted(raw, (await login(wrong.email)).cookie)).status).toBe(403);
    const cookie = (await login(existing.email)).cookie;
    expect((await request("/invitations/accept", { token: raw, name: "Must not overwrite", password: "Different-password-123" }, cookie)).status).toBe(200);
    expect((await database.query.user.findFirst({ where: eq(user.id, existing.id) }))!.name).toBe("Invitation Test");
    expect((await login(existing.email)).status).toBe(200);
    expect((await database.query.invitations.findFirst({ where: eq(invitations.id, invitation.id) }))!.status).toBe("accepted");
    expect((await request("/get-session", undefined, cookie)).data).not.toBeNull();
  });
  it("rejects invalid inputs, untrusted origins, and GET acceptance", async () => {
    const { admin, tenantId } = await fixture(); const address = email(); await invite(admin.id, tenantId, address); const raw = token(address);
    expect((await request("/invitations/accept", { token: raw, name: "X", password }, undefined, auth, "https://untrusted.example")).status).toBe(403);
    expect((await request("/invitations/accept")).status).not.toBe(200);
    for (const name of [" ", "n".repeat(101)]) expect((await request("/invitations/accept", { token: raw, name, password })).status).toBe(400);
    for (const length of [7, 129]) expect((await request("/invitations/accept", { token: raw, name: "Valid", password: "a".repeat(length) })).status).toBe(400);
    expect((await request("/invitations/accept", { token: raw, name: "Valid", password, role: "super_admin" })).status).toBe(400);
    expect((await request("/invitations/preview", { token: "invalid" })).status).toBe(400);
  });
  it("prevents duplicate invitations and assignments", async () => {
    const { admin, tenantId } = await fixture(); const address = email(); await invite(admin.id, tenantId, address);
    await expect(invite(admin.id, tenantId, address)).rejects.toMatchObject({ code: "CONFLICT" });
    const assigned = await person("viewer", tenantId);
    await expect(invite(admin.id, tenantId, assigned.email)).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("rejects expiry and cancellation, rotates resend tokens, and persists the cooldown", async () => {
    const { admin, tenantId } = await fixture(); const address = email(); const initial = await invite(admin.id, tenantId, address); const old = token(address);
    await expect(service.resend(admin.id, initial.id)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await database.update(invitations).set({ expiresAt: new Date(Date.now() - 1), lastAttemptAt: new Date(Date.now() - 61_000) }).where(eq(invitations.id, initial.id));
    expect((await accepted(old)).status).toBe(400);
    await service.resend(admin.id, initial.id);
    expect(token(address) === old).toBe(false);
    expect((await accepted(old)).status).toBe(400);
    await service.cancel(admin.id, initial.id);
    expect((await accepted(token(address))).status).toBe(400);
  });
  it("rejects issuer demotion, inactive hubs, and assignments made after issuing", async () => {
    const { admin, tenantId } = await fixture(); const manager = await person("country_admin", tenantId);
    await person("country_admin", tenantId);
    const address = email(); await invite(manager.id, tenantId, address, "country_admin");
    const membership = await database.query.userTenants.findFirst({ where: eq(userTenants.userId, manager.id) });
    await service.changeMembership(admin.id, membership!.id, "viewer");
    expect((await accepted(token(address))).status).toBe(403);
    const activeAddress = email(); await invite(admin.id, tenantId, activeAddress);
    await database.update(tenants).set({ isActive: false }).where(eq(tenants.id, tenantId));
    expect((await accepted(token(activeAddress))).status).not.toBe(200);
    await database.update(tenants).set({ isActive: true }).where(eq(tenants.id, tenantId));
    const existing = await person(null); await invite(admin.id, tenantId, existing.email);
    await database.insert(userTenants).values({ userId: existing.id, tenantId, role: "viewer" });
    expect((await accepted(token(existing.email), (await login(existing.email)).cookie)).status).toBe(409);
  });
  it("allows only one concurrent acceptance and rolls back a failed account creation", async () => {
    const { admin, tenantId } = await fixture(); const address = email(); await invite(admin.id, tenantId, address);
    const results = await Promise.all([accepted(token(address)), accepted(token(address))]);
    expect(results.filter((result) => result.status === 200).length).toBe(1);
    const failingEmail = email(); const invitation = await invite(admin.id, tenantId, failingEmail);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try { failCreation = true; expect((await accepted(token(failingEmail))).status).toBe(500); }
    finally { failCreation = false; log.mockRestore(); }
    expect(await database.query.user.findFirst({ where: eq(user.email, failingEmail) })).toBeUndefined();
    expect((await database.query.invitations.findFirst({ where: eq(invitations.id, invitation.id) }))!.status).toBe("pending");
    expect((await accepted(token(failingEmail))).status).toBe(200);
  });
  it("records SMTP failure safely and permits a later resend", async () => {
    const { admin, tenantId } = await fixture(); const address = email();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let invitation;
    try { failDelivery = true; invitation = await invite(admin.id, tenantId, address); }
    finally { failDelivery = false; log.mockRestore(); }
    expect(invitation.deliveryStatus).toBe("failed");
    await database.update(invitations).set({ lastAttemptAt: new Date(Date.now() - 61_000) }).where(eq(invitations.id, invitation.id));
    expect((await service.resend(admin.id, invitation.id)).deliveryStatus).toBe("sent");
  });
  it("limits list and invitation management to authorized hubs and roles", async () => {
    const { admin, tenantId } = await fixture(); const other = await hub();
    const manager = await person("country_admin", tenantId);
    const foreign = await invite(admin.id, other);
    const local = await invite(admin.id, tenantId, email(), "country_admin");
    const localViewer = await invite(admin.id, tenantId);
    const list = await service.list(manager.id);
    expect(list.some((row) => row.id === foreign.id || row.id === localViewer.id)).toBe(false);
    expect(list.some((row) => row.id === local.id)).toBe(true);
    await expect(service.cancel(manager.id, foreign.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.resend(manager.id, localViewer.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("revokes sessions for role changes and removal while preserving the account and other memberships", async () => {
    const { admin, tenantId } = await fixture(); const target = await person("viewer", tenantId);
    const otherHub = await hub();
    await database.insert(userTenants).values({ userId: target.id, tenantId: otherHub, role: "viewer" });
    const membership = await database.query.userTenants.findFirst({ where: and(eq(userTenants.userId, target.id), eq(userTenants.tenantId, tenantId)) });
    const first = await login(target.email); const second = await login(target.email);
    await service.changeMembership(admin.id, membership!.id, "alumni_exec");
    expect((await request("/get-session", undefined, first.cookie)).data).toBeNull();
    expect((await request("/get-session", undefined, second.cookie)).data).toBeNull();
    const next = await login(target.email);
    await service.changeMembership(admin.id, membership!.id, null);
    expect((await request("/get-session", undefined, next.cookie)).data).toBeNull();
    expect(await database.query.user.findFirst({ where: eq(user.id, target.id) })).toBeDefined();
    const remaining = await database.select().from(userTenants).where(eq(userTenants.userId, target.id));
    expect(remaining).toHaveLength(1); expect(remaining[0]!.tenantId).toBe(otherHub);
  });
  it("rejects self changes, non-super changes, and concurrent last-manager removal", async () => {
    const { admin, tenantId } = await fixture();
    const own = await database.query.userTenants.findFirst({ where: eq(userTenants.userId, admin.id) });
    await expect(service.changeMembership(admin.id, own!.id, null)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.changeMembership(admin.id, own!.id, "viewer")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const one = await person("country_admin", tenantId); const two = await person("country_admin", tenantId);
    const rows = await database.select().from(userTenants).where(inArray(userTenants.userId, [one.id, two.id]));
    await expect(service.changeMembership(one.id, own!.id, null)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const results = await Promise.allSettled(rows.map((row) => service.changeMembership(admin.id, row.id, null)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await database.select().from(userTenants).where(inArray(userTenants.id, rows.map((row) => row.id))))).toHaveLength(1);
  });
  it("rechecks actor authority when super admins concurrently remove each other", async () => {
    const { admin, tenantId } = await fixture(); const other = await person("super_admin", tenantId);
    const first = await database.query.userTenants.findFirst({ where: eq(userTenants.userId, admin.id) });
    const second = await database.query.userTenants.findFirst({ where: eq(userTenants.userId, other.id) });
    const results = await Promise.allSettled([
      service.changeMembership(admin.id, second!.id, null), service.changeMembership(other.id, first!.id, null),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });
  it("creates a hub and invitation together and rolls the hub back on conflict", async () => {
    const { admin, tenantId } = await fixture(); const existing = await person("viewer", tenantId);
    const code = randomUUID().slice(0, 3);
    const input = { name: "New Hub", slug: "invite-test-" + randomUUID(), countryCode: code, settings: {} };
    await expect(service.createWithHub(admin.id, input, { name: "Existing", email: existing.email })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await database.query.tenants.findFirst({ where: eq(tenants.slug, input.slug) })).toBeUndefined();
    const result = await service.createWithHub(admin.id, input, { name: "First admin", email: email() });
    hubs.push(result.hub.id);
    expect(result.invitation.role).toBe("country_admin");
    expect((await database.select().from(userTenants).where(eq(userTenants.tenantId, result.hub.id)))).toHaveLength(0);
  });
  it("rate-limits public acceptance and preview endpoints", async () => {
    const limited = createAuth({ ...options, invitations: service, rateLimit: true });
    let result;
    for (let i = 0; i < 6; i++) result = await request("/invitations/accept", { token: "x".repeat(43) }, undefined, limited);
    expect(result!.status).toBe(429);
    for (let i = 0; i < 31; i++) result = await request("/invitations/preview", { token: "x".repeat(43) }, undefined, limited);
    expect(result!.status).toBe(429);
  });
});
