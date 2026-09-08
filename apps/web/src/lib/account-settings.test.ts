import { describe, expect, it } from "vitest";
import { resolveAccess } from "@epl-fellows-platform/auth/access-policy";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { canAccessSettingsPage, deviceDescription, authErrorMessage } from "./account-settings";
const roles: Array<UserRole | undefined> = ["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer", undefined];
describe("settings access", () => {
  it.each(roles)("allows personal settings for %s", (role) => {
    expect(canAccessSettingsPage(role, "profile")).toBe(true);
    expect(canAccessSettingsPage(role, "security")).toBe(true);
  });
  it.each(roles)("restricts administration for %s", (role) => {
    expect(canAccessSettingsPage(role, "audit")).toBe(["super_admin", "tenant_admin", "country_admin"].includes(role ?? ""));
    expect(canAccessSettingsPage(role, "users")).toBe(["super_admin", "tenant_admin", "country_admin"].includes(role ?? ""));
    for (const page of ["countries", "events", "executives"]) expect(canAccessSettingsPage(role, page)).toBe(role === "super_admin");
  });
  it("allows global operations settings only with validated capabilities", () => {
    const valid = resolveAccess([{ role: "tenant_admin", tenantId: "global", countryCode: "GLOBAL", isActive: true }]).capabilities;
    expect(canAccessSettingsPage("tenant_admin", "events", valid)).toBe(true);
    expect(canAccessSettingsPage("tenant_admin", "executives", valid)).toBe(true);
    expect(canAccessSettingsPage("tenant_admin", "countries", valid)).toBe(false);
    expect(canAccessSettingsPage("tenant_admin", "events", resolveAccess([]).capabilities)).toBe(false);
  });
  it("handles missing device metadata without inventing a location", () => { expect(deviceDescription(null)).toBe("Unknown browser or device"); });
  it("describes a reported browser", () => { expect(deviceDescription("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36")).toBe("Chrome / Windows"); });
  it("handles rate limits and expired authentication", () => {
    expect(authErrorMessage({ status: 429 }, "Failed")).toContain("Too many attempts");
    expect(authErrorMessage({ status: 401 }, "Failed")).toContain("sign in");
  });
});
