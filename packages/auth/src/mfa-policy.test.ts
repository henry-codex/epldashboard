import { describe, expect, it } from "vitest";
import { mfaStatus, safeMfaReturnPath } from "./mfa-policy";
describe("MFA policy", () => {
  it.each([[], ["super_admin"], ["tenant_admin"], ["country_admin"], ["alumni_exec"], ["fellow"], ["viewer"], ["viewer", "country_admin", "super_admin"]].map((roles) => ({ roles })))("makes enrollment optional for memberships $roles", ({ roles }) => {
    expect(mfaStatus({ roles, enabled: false })).toMatchObject({ required: false, enabled: false, verified: false, fresh: false, reason: null, permittedMethods: [] });
  });
  it("still requires proof when a method is enabled", () => {
    expect(mfaStatus({ roles: [], enabled: true }).reason).toBe("MFA_VERIFICATION_REQUIRED");
  });
  it("does not let leftover backup codes or session proof enable protection", () => {
    expect(mfaStatus({ roles: ["super_admin"], enabled: false, totpEnabled: false, backupCodes: true, verificationMethod: "backup", verifiedAt: new Date() })).toMatchObject({ enabled: false, verified: false, fresh: false, permittedMethods: [], reason: null });
  });
  it("accepts a verified session and expires freshness after five minutes", () => {
    expect(mfaStatus({ roles: ["super_admin"], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(1000000) }, 1000001)).toMatchObject({ reason: null, fresh: true });
    expect(mfaStatus({ roles: ["super_admin"], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(1000000) }, 1300001)).toMatchObject({ reason: null, fresh: false });
  });
  it("enforces the exact seven-day boundary and never lets browser reuse refresh security proof", () => {
    const start = 1700000000000, week = 7 * 86400000;
    const input = { roles: [], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(start), browserExpiresAt: new Date(start + week) };
    expect(mfaStatus(input, start + week - 1)).toMatchObject({ verified: true, fresh: false, verificationExpiresAt: new Date(start + week).toISOString() });
    expect(mfaStatus(input, start + week)).toMatchObject({ verified: false, fresh: false, reason: "MFA_VERIFICATION_REQUIRED" });
    expect(mfaStatus({ ...input, browserValid: false }, start + 1).verified).toBe(false);
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/mfa/setup", "/dashboard#bad", "/accept-invitation?token=invalid"])("rejects unsafe continuation %s", (path) => expect(safeMfaReturnPath(path)).toBeNull());
  it("preserves a valid invitation or dashboard destination", () => {
    const path = "/accept-invitation?token=" + "a".repeat(43);
    expect(safeMfaReturnPath(path)).toBe(path);
    expect(safeMfaReturnPath("/dashboard/settings/security")).toBe("/dashboard/settings/security");
  });
});
