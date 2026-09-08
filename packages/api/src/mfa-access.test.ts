import { describe, expect, it, vi } from "vitest";
vi.mock("@epl-fellows-platform/db/audit", async (original) => ({ ...await original<typeof import("@epl-fellows-platform/db/audit")>(), auditFailure: vi.fn() }));
import { mfaStatus } from "@epl-fellows-platform/auth/mfa-policy";
import type { Context } from "./context";
vi.mock("@epl-fellows-platform/auth", async () => ({ ...await import("@epl-fellows-platform/auth/permissions") }));
import { authenticatedProcedure, protectedProcedure, router } from "./index";
const data = vi.fn(() => "protected");
const routes = router({ status: authenticatedProcedure.query(({ ctx }) => ctx.mfa), data: protectedProcedure.query(data) });
function caller(role: Context["role"], enabled = false, verified = false) {
  const now = new Date();
  const ctx: Context = {
    role, tenantId: null, userTenant: null,
    mfa: mfaStatus({ roles: [role], enabled, verificationMethod: verified ? "authenticator" : null, verifiedAt: verified ? now : null }),
    session: { user: { id: "user", name: "Test", email: "test@example.test", emailVerified: true, twoFactorEnabled: enabled, createdAt: now, updatedAt: now }, session: { id: "session", userId: "user", token: "test-only", createdAt: now, updatedAt: now, expiresAt: new Date(Date.now() + 60000) } },
  };
  return routes.createCaller(ctx);
}
describe("MFA API gate", () => {
  it.each(["super_admin", "tenant_admin", "country_admin"] as const)("keeps status available but blocks protected API access for unenrolled %s", async (role) => {
    expect((await caller(role).status())?.reason).toBe("MFA_ENROLLMENT_REQUIRED");
    await expect(caller(role).data()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await caller(role, true, true).data()).toBe("protected");
  });
  it.each(["alumni_exec", "fellow", "viewer"] as const)("permits optional unenrolled %s but enforces its enrolled MFA", async (role) => {
    expect(await caller(role).data()).toBe("protected");
    await expect(caller(role, true).data()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await caller(role, true, true).data()).toBe("protected");
  });
});
