import { describe, expect, it } from "vitest";
import { mfaStatus, safeMfaReturnPath } from "./mfa-policy";
describe("MFA policy", () => {
  it("requires MFA when any membership is administrative", () => {
    expect(mfaStatus({ roles: ["viewer", "country_admin"], enabled: false }).reason).toBe("MFA_ENROLLMENT_REQUIRED");
    expect(mfaStatus({ roles: [], enabled: true }).reason).toBe("MFA_VERIFICATION_REQUIRED");
  });
  it("accepts a verified session and expires freshness after five minutes", () => {
    expect(mfaStatus({ roles: ["super_admin"], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(1000000) }, 1000001)).toMatchObject({ reason: null, fresh: true });
    expect(mfaStatus({ roles: ["super_admin"], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(1000000) }, 1300001)).toMatchObject({ reason: null, fresh: false });
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/mfa/setup", "/dashboard#bad", "/accept-invitation?token=invalid"])("rejects unsafe continuation %s", (path) => expect(safeMfaReturnPath(path)).toBeNull());
  it("preserves a valid invitation or dashboard destination", () => {
    const path = "/accept-invitation?token=" + "a".repeat(43);
    expect(safeMfaReturnPath(path)).toBe(path);
    expect(safeMfaReturnPath("/dashboard/settings/security")).toBe("/dashboard/settings/security");
  });
});
