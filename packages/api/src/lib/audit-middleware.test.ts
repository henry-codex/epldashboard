import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "../context";
vi.mock("@epl-fellows-platform/db/audit", async (original) => ({
  ...await original<typeof import("@epl-fellows-platform/db/audit")>(),
  auditFailure: vi.fn(),
  auditedTransaction: vi.fn(async (_db: unknown, action: (tx: never) => Promise<unknown>) => action({} as never)),
}));
import { auditFailure } from "@epl-fellows-platform/db/audit";
import { auditMiddleware } from "./audit-middleware";
const t = initTRPC.context<Context>().create();
function context(authenticated: boolean): Context {
  const now = new Date();
  return { role: "viewer", tenantId: null, userTenant: null, mfa: null,
    session: authenticated ? {
      user: { id: "audit-test", name: "Test", email: "test@example.test", emailVerified: true, twoFactorEnabled: false, createdAt: now, updatedAt: now },
      session: { id: "test-session", userId: "audit-test", token: "test-only", createdAt: now, updatedAt: now, expiresAt: now },
    } : null,
  };
}
beforeEach(() => vi.clearAllMocks());
describe("audit handling of authentication-state polls", () => {
  it.each([
    { path: "account.mfaStatus", authenticated: false, mutation: false, code: "UNAUTHORIZED", logged: false },
    { path: "account.mfaStatus", authenticated: true, mutation: false, code: "UNAUTHORIZED", logged: true },
    { path: "account.mfaStatus", authenticated: false, mutation: false, code: "FORBIDDEN", logged: true },
    { path: "account.mfaStatus", authenticated: false, mutation: true, code: "UNAUTHORIZED", logged: true },
    { path: "records", authenticated: false, mutation: false, code: "UNAUTHORIZED", logged: true },
    { path: "records", authenticated: true, mutation: false, code: "FORBIDDEN", logged: true },
  ] as const)("preserves denial and audit policy for $path ($code, signed in: $authenticated, mutation: $mutation)", async ({ path, authenticated, mutation, code, logged }) => {
    const reject = () => { throw new TRPCError({ code }); };
    const procedure = t.procedure.use(auditMiddleware);
    const operation = mutation ? procedure.mutation(reject) : procedure.query(reject);
    const caller = t.router({ account: t.router({ mfaStatus: operation }), records: operation }).createCaller(context(authenticated));
    await expect(path === "records" ? caller.records() : caller.account.mfaStatus()).rejects.toMatchObject({ code });
    expect(auditFailure).toHaveBeenCalledTimes(logged ? 1 : 0);
    if (logged) expect(auditFailure).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: "denied", targetLabel: path, details: { reasonCode: code } }));
  });
});
