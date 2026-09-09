import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@epl-fellows-platform/db/audit", async (original) => ({ ...await original<typeof import("@epl-fellows-platform/db/audit")>(), auditFailure: vi.fn() }));
import { InvitationError } from "@epl-fellows-platform/auth/invitation-error";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import type { Context } from "../context";
const service = vi.hoisted(() => ({
  issue: vi.fn(), resend: vi.fn(), cancel: vi.fn(), list: vi.fn(),
  changeMembership: vi.fn(), actorAccess: vi.fn(),
}));
vi.mock("@epl-fellows-platform/auth", async () => ({
  ...await import("@epl-fellows-platform/auth/permissions"), invitationService: service,
}));
import { usersRouter } from "./users";
function caller(role: UserRole, authenticated = true) {
  const now = new Date();
  const context: Context = {
    mfa: { required: false, enabled: true, verified: true, fresh: true, reason: null, enrolledMethods: ["authenticator"], permittedMethods: ["authenticator", "backup"], verificationMethod: "authenticator", verificationExpiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(), browserRememberedUntil: null },
    role, tenantId: "00000000-0000-4000-8000-000000000001", userTenant: null,
    session: authenticated ? {
      user: { id: "actor", name: "Actor", email: "actor@example.test", emailVerified: true, twoFactorEnabled: true, createdAt: now, updatedAt: now },
      session: { id: "session", token: "isolated-test-value", userId: "actor", expiresAt: now, createdAt: now, updatedAt: now },
    } : null,
  };
  return usersRouter.createCaller(context);
}
const input = { name: "Ama", email: "ama@example.test", role: "country_admin" as const, tenantId: "00000000-0000-4000-8000-000000000001" };
beforeEach(() => { vi.resetAllMocks(); service.issue.mockResolvedValue({ id: "invitation", deliveryStatus: "sent" }); service.changeMembership.mockResolvedValue({ success: true }); });
describe("access management RPC boundaries", () => {
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer"] as const)("guards mutations for %s", async (role) => {
    const api = caller(role);
    if (["super_admin", "tenant_admin", "country_admin"].includes(role)) await api.invite(input);
    else await expect(api.invite(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const member = { id: "00000000-0000-4000-8000-000000000002" };
    if (role === "super_admin") {
      await api.updateRole({ ...member, role: "viewer" }); await api.removeMembership(member);
    } else {
      await expect(api.updateRole({ ...member, role: "viewer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(api.removeMembership(member)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(service.changeMembership).not.toHaveBeenCalled();
    }
  });
  it("requires a session even if the supplied role is super admin", async () => {
    await expect(caller("super_admin", false).invite(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(service.issue).not.toHaveBeenCalled();
  });
  it("rejects old password-bearing inputs and unsupported fellow onboarding", async () => {
    await expect(caller("super_admin").invite({ ...input, password: "never-shared" } as typeof input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller("super_admin").invite({ ...input, role: "fellow" } as unknown as typeof input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(service.issue).not.toHaveBeenCalled();
    expect("create" in usersRouter._def.record).toBe(false);
  });
  it("preserves domain authorization and cooldown errors", async () => {
    service.issue.mockRejectedValueOnce(new InvitationError("FORBIDDEN", "Wrong hub"));
    await expect(caller("country_admin").invite(input)).rejects.toMatchObject({ code: "FORBIDDEN", message: "Wrong hub" });
    service.resend.mockRejectedValueOnce(new InvitationError("TOO_MANY_REQUESTS", "Wait 60 seconds"));
    await expect(caller("country_admin").resendInvitation({ id: input.tenantId })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
