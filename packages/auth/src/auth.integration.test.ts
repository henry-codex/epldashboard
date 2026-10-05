import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
const userFrom = (data: unknown) => z.object({ user: z.object({ id: z.string(), name: z.string() }) }).parse(data).user;
const sessionFrom = (data: unknown) => z.object({ session: z.object({ token: z.string() }) }).parse(data).session;
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@epl-fellows-platform/db/schema/auth";
import { sendPasswordResetEmail } from "@epl-fellows-platform/email";
import { createAuth } from "./create-auth";

const connectionString = process.env.TEST_DATABASE_URL;
describe.skipIf(!connectionString)("account security with PostgreSQL and Mailpit", () => {
  let pool: Pool;
  let auth: ReturnType<typeof createAuth>;
  const ids: string[] = [];
  const resetUrls = new Map<string, string>();
  let deliveryFails = false;
  const initialPassword = "Initial-password-123";
  const baseURL = "http://localhost:4300";
  const origin = "http://localhost:4301";

  async function request(path: string, body?: object, cookie?: string, instance = auth) {
    const response = await instance.handler(new Request(baseURL + "/api/auth" + path, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", "user-agent": "EPL integration test", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
    const data = await response.json();
    const nextCookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    return { response, data, cookie: nextCookie || cookie || "" };
  }

  async function account() {
    const email = randomUUID() + "@example.test";
    const provision = createAuth({ database: drizzle(pool, { schema }), secret: "isolated-test-secret-at-least-32-characters", baseURL, trustedOrigin: origin, production: false, trustedAccountCreation: true, sendPasswordResetEmail: async () => {} });
    const result = await provision.api.signUpEmail({ body: { email, password: initialPassword, name: "Account Test" } });
    ids.push(result.user.id);
    const signedIn = await login(email);
    expect(signedIn.response.status).toBe(200);
    return { email, cookie: signedIn.cookie, id: result.user.id };
  }

  async function login(email: string, password = initialPassword) {
    return request("/sign-in/email", { email, password });
  }

  async function resetToken(email: string) {
    const result = await request("/request-password-reset", { email, redirectTo: origin + "/reset-password" });
    expect(result.response.status).toBe(200);
    await vi.waitFor(() => expect(resetUrls.has(email)).toBe(true));
    return new URL(resetUrls.get(email)!).pathname.split("/").pop()!;
  }

  beforeAll(async () => {
    const url = new URL(connectionString!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !["55432", "15432"].includes(url.port) || url.pathname !== "/epl_settings_test") {
      throw new Error("Integration tests require the isolated loopback database epl_settings_test on port 55432 or 15432");
    }
    pool = new Pool({ connectionString, max: 3 });
    auth = createAuth({
      database: drizzle(pool, { schema }),
      secret: "isolated-test-secret-at-least-32-characters",
      baseURL, trustedOrigin: origin, production: false,
      sendPasswordResetEmail: async (message) => {
        resetUrls.set(message.to, message.url);
        if (deliveryFails) throw new Error("private-provider-error");
        await sendPasswordResetEmail(message);
      },
    });
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('DELETE FROM "verification" WHERE value = ANY($1::text[])', [ids]);
    await pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [ids]);
    await pool.end();
  });

  it("requires authentication for profile and session operations", async () => {
    for (const [path, body] of [["/list-sessions", undefined], ["/update-user", { name: "Changed" }], ["/revoke-other-sessions", {}]] as const) {
      expect((await request(path, body)).response.status).toBe(401);
    }
  });

  it("persists trimmed names and rejects invalid server-side updates", async () => {
    const user = await account();
    expect((await request("/update-user", { name: "  Ama Mensah  " }, user.cookie)).response.status).toBe(200);
    expect(userFrom((await request("/get-session", undefined, user.cookie)).data).name).toBe("Ama Mensah");
    for (const name of [" ", "a".repeat(101)]) expect((await request("/update-user", { name }, user.cookie)).response.status).toBe(400);
  });

  it("revokes an individual session while retaining the current one", async () => {
    const user = await account();
    const other = await login(user.email);
    const list = await request("/list-sessions", undefined, user.cookie);
    expect(list.data).toHaveLength(2);
    const otherSession = await request("/get-session", undefined, other.cookie);
    expect((await request("/revoke-session", { token: sessionFrom(otherSession.data).token }, user.cookie)).response.status).toBe(200);
    expect((await request("/get-session", undefined, other.cookie)).data).toBeNull();
    expect(userFrom((await request("/get-session", undefined, user.cookie)).data).id).toBe(user.id);
  });

  it("cannot revoke another account's session", async () => {
    const first = await account();
    const second = await account();
    const session = await request("/get-session", undefined, second.cookie);
    await request("/revoke-session", { token: sessionFrom(session.data).token }, first.cookie);
    expect(userFrom((await request("/get-session", undefined, second.cookie)).data).id).toBe(second.id);
  });

  it("revokes all other sessions but keeps this device", async () => {
    const user = await account();
    const other = await login(user.email);
    await request("/revoke-other-sessions", {}, user.cookie);
    expect((await request("/get-session", undefined, other.cookie)).data).toBeNull();
    expect(userFrom((await request("/get-session", undefined, user.cookie)).data).id).toBe(user.id);
  });

  it("rejects an incorrect current password without affecting sessions", async () => {
    const user = await account();
    const result = await request("/change-password", { currentPassword: "incorrect-password", newPassword: "Next-password-123" }, user.cookie);
    expect(result.response.status).toBe(400);
    expect(userFrom((await request("/get-session", undefined, user.cookie)).data).id).toBe(user.id);
  });

  it("enforces password boundaries on the server", async () => {
    const user = await account();
    for (const length of [7, 129]) {
      expect((await request("/change-password", { currentPassword: initialPassword, newPassword: "p".repeat(length) }, user.cookie)).response.status).toBe(400);
    }
  });

  it("forces other-device revocation even when a caller opts out", async () => {
    const user = await account();
    const other = await login(user.email);
    const changed = await request("/change-password", { currentPassword: initialPassword, newPassword: "Next-password-123", revokeOtherSessions: false }, user.cookie);
    expect(changed.response.status).toBe(200);
    expect((await request("/get-session", undefined, other.cookie)).data).toBeNull();
    expect(userFrom((await request("/get-session", undefined, changed.cookie)).data).id).toBe(user.id);
    expect((await login(user.email)).response.status).toBe(401);
    expect((await login(user.email, "Next-password-123")).response.status).toBe(200);
  });

  it("delivers recovery mail, uses a one-hour token once, and signs out every session", async () => {
    const user = await account();
    const other = await login(user.email);
    const token = await resetToken(user.email);
    const record = await pool.query('SELECT expires_at FROM verification WHERE identifier = $1', ["reset-password:" + token]);
    const remaining = new Date(record.rows[0].expires_at).getTime() - Date.now();
    expect(remaining).toBeGreaterThan(3_500_000);
    expect(remaining).toBeLessThanOrEqual(3_600_000);
    await vi.waitFor(async () => {
      const inbox = z.object({ messages: z.array(z.object({ To: z.array(z.object({ Address: z.string() })) })) }).parse(await (await fetch("http://127.0.0.1:18025/api/v1/messages")).json());
      expect(inbox.messages.some((mail: { To: Array<{ Address: string }> }) => mail.To.some((to) => to.Address === user.email))).toBe(true);
    }, { timeout: 15_000, interval: 250 });
    expect((await request("/reset-password", { token, newPassword: "Recovered-password-123" })).response.status).toBe(200);
    expect((await request("/reset-password", { token, newPassword: "Another-password-123" })).response.status).toBe(400);
    expect((await request("/get-session", undefined, user.cookie)).data).toBeNull();
    expect((await request("/get-session", undefined, other.cookie)).data).toBeNull();
    expect((await login(user.email, "Recovered-password-123")).response.status).toBe(200);
  });

  it("rejects missing, invalid, and expired recovery tokens", async () => {
    const user = await account();
    const token = await resetToken(user.email);
    await pool.query("UPDATE verification SET expires_at = NOW() - INTERVAL '1 minute' WHERE identifier = $1", ["reset-password:" + token]);
    for (const input of [{ token }, { token: "invalid-token" }, {}]) {
      expect((await request("/reset-password", { ...input, newPassword: "Recovered-password-123" })).response.status).toBe(400);
    }
  });

  it("keeps known and unknown recovery responses identical, including mail failures", async () => {
    const user = await account();
    const unknown = await request("/request-password-reset", { email: randomUUID() + "@example.test", redirectTo: origin + "/reset-password" });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      deliveryFails = true;
      const known = await request("/request-password-reset", { email: user.email, redirectTo: origin + "/reset-password" });
      expect(known.response.status).toBe(unknown.response.status);
      expect(known.data).toEqual(unknown.data);
      await vi.waitFor(() => expect(log).toHaveBeenCalledWith("Password reset email delivery failed"));
      expect(JSON.stringify(log.mock.calls)).not.toContain("private-provider-error");
    } finally { deliveryFails = false; log.mockRestore(); }
  });

  it("rejects untrusted recovery redirects", async () => {
    const response = await request("/request-password-reset", { email: "any@example.test", redirectTo: "https://untrusted.example/reset-password" });
    expect(response.response.status).toBe(403);
  });

  it("rate-limits recovery requests", async () => {
    const limited = createAuth({ database: drizzle(pool, { schema }), secret: "isolated-test-secret-at-least-32-characters", baseURL, trustedOrigin: origin, production: false, rateLimit: true, sendPasswordResetEmail: async () => {} });
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await request("/request-password-reset", { email: randomUUID() + "@example.test", redirectTo: origin + "/reset-password" }, undefined, limited));
    expect(results.at(-1)!.response.status).toBe(429);
  });
});
