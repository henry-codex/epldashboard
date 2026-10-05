import { describe, expect, it } from "vitest";
import { assignableInvitationRoles, canIssueInvitation, canManageMemberships, inviteInputSchema } from "./invitation-policy";
describe("invitation authority", () => {
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer"])("defines invitation and membership authority for %s", (role) => {
    expect(assignableInvitationRoles(role).length).toBe(role === "super_admin" ? 5 : ["tenant_admin", "country_admin"].includes(role) ? 1 : 0);
    expect(canManageMemberships(role)).toBe(role === "super_admin");
  });
  it("does not allow a country manager to grant another role or use another hub", () => {
    const actor = { role: "country_admin", tenantId: "own" };
    expect(canIssueInvitation(actor, "country_admin", "own")).toBe(true);
    expect(canIssueInvitation(actor, "viewer", "own")).toBe(false);
    expect(canIssueInvitation(actor, "country_admin", "other")).toBe(false);
  });
  it("normalizes the name and email and never accepts a supplied password", () => {
    const input = { name: "  Ama  ", email: " AMA@EXAMPLE.TEST ", role: "viewer", tenantId: "00000000-0000-4000-8000-000000000001" };
    expect(inviteInputSchema.parse(input)).toMatchObject({ name: "Ama", email: "ama@example.test" });
    expect(inviteInputSchema.safeParse({ ...input, password: "must-not-be-shared" }).success).toBe(false);
    expect(inviteInputSchema.safeParse({ ...input, role: "fellow" }).success).toBe(false);
  });
});
