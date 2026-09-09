import { describe, expect, it } from "vitest";
import { mfaStatus } from "./mfa-policy";
import { otpHash } from "./mfa-methods";
import { passkeyConfiguration } from "./mfa-passkey";
describe("method-specific MFA policy", () => {
  it.each(["super_admin", "tenant_admin", "country_admin"])("accepts chosen email protection and its recovery codes for %s", (role) => {
    for (const method of ["email", "backup"]) {
      expect(mfaStatus({ roles: ["viewer", role], enabled: true, totpEnabled: false, emailOtpEnabled: true, verificationMethod: method, verifiedAt: new Date() })).toMatchObject({ required: false, verified: true, fresh: true, reason: null, permittedMethods: ["email", "backup"] });
    }
    expect(mfaStatus({ roles: [role], enabled: true, totpEnabled: false, emailOtpEnabled: true, passkeyCount: 1, verificationMethod: "email", verifiedAt: new Date() })).toMatchObject({ verified: true, fresh: true, reason: null });
  });
  it.each(["alumni_exec", "fellow", "viewer", ""])("permits email for %s and strong methods for every role", (role) => {
    expect(mfaStatus({ roles: role ? [role] : [], enabled: true, totpEnabled: false, emailOtpEnabled: true, verificationMethod: "email", verifiedAt: new Date() })).toMatchObject({ verified: true, fresh: true, reason: null });
    expect(mfaStatus({ roles: [role, "super_admin"], enabled: true, totpEnabled: false, passkeyCount: 1, verificationMethod: "passkey", verifiedAt: new Date() })).toMatchObject({ verified: true, fresh: true, reason: null });
  });
  it("does not infer legacy proof or accept a future timestamp", () => {
    expect(mfaStatus({ roles: [], enabled: true, verifiedAt: new Date() }).verified).toBe(false);
    expect(mfaStatus({ roles: [], enabled: true, verificationMethod: "authenticator", verifiedAt: new Date(Date.now() + 60000) }).verified).toBe(false);
  });
  it("binds keyed OTP hashes to all challenge dimensions", () => {
    const data = { id: "challenge", userId: "user", binding: "browser", purpose: "email-login" }, code = "123456";
    const original = otpHash("test-secret", data, code);
    expect(original).not.toContain(code);
    for (const key of ["id", "userId", "binding", "purpose"] as const) expect(otpHash("test-secret", { ...data, [key]: "different" }, code)).not.toBe(original);
    expect(otpHash("different-secret", data, code)).not.toBe(original);
  });
  it("requires explicit stable production RP configuration and matching origin", () => {
    expect(() => passkeyConfiguration("https://app.example.com", undefined, true)).toThrow("PASSKEY_RP_ID");
    expect(() => passkeyConfiguration("https://app.example.com", "evil.test", true)).toThrow();
    expect(() => passkeyConfiguration("https://app.example.com", "https://example.com", true)).toThrow();
    expect(passkeyConfiguration("https://app.example.com", "example.com", true)).toMatchObject({ rpID: "example.com", origin: "https://app.example.com" });
    expect(passkeyConfiguration("http://localhost:4301", undefined, false).rpID).toBe("localhost");
  });
});
