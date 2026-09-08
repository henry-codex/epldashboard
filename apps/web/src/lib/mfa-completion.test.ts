import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  refetch: vi.fn(), cancel: vi.fn(), clear: vi.fn(), fetch: vi.fn(),
  session: { data: null as null | { user: { id: string } }, error: null as null | Error },
}));
vi.mock("./auth-client", () => ({ authClient: { $store: { atoms: { session: { get: () => ({ ...mocks.session, refetch: mocks.refetch }) } } } } }));
vi.mock("@/utils/trpc", () => ({ queryClient: { cancelQueries: mocks.cancel, clear: mocks.clear, fetchQuery: mocks.fetch }, trpc: {
  account: { mfaStatus: { queryOptions: () => ({ key: "status" }) } }, privateData: { queryOptions: () => ({ key: "identity" }) },
} }));
import { finishMfaSignIn } from "./mfa";
import { homePathForSession } from "./home-path";
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.data = null; mocks.session.error = null;
  mocks.refetch.mockImplementation(async () => { mocks.session.data = { user: { id: "recipient" } }; });
  mocks.fetch.mockImplementation(async ({ key }) => key === "status" ? { reason: null } : { role: null, tenantId: null });
});
describe("verification completion", () => {
  it("refreshes the session atom before requesting identity or returning a destination", async () => {
    let resolve!: () => void;
    mocks.refetch.mockImplementationOnce(() => new Promise<void>(done => { resolve = () => { mocks.session.data = { user: { id: "recipient" } }; done(); }; }));
    const result = finishMfaSignIn(); await vi.waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
    expect(mocks.fetch).not.toHaveBeenCalled();
    resolve();
    await expect(result).resolves.toBe("/dashboard/settings/profile");
    expect(mocks.refetch).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
  });
  it("preserves only a validated invitation continuation after refreshing the session", async () => {
    const path = "/accept-invitation?token=" + "a".repeat(43);
    await expect(finishMfaSignIn(path)).resolves.toBe(path);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await expect(finishMfaSignIn("https://outside.example/")).resolves.toBe("/dashboard/settings/profile");
  });
  it("does not fetch protected data after a failed or expired session refresh", async () => {
    mocks.refetch.mockImplementationOnce(async () => { mocks.session.error = new Error("offline"); });
    await expect(finishMfaSignIn()).rejects.toThrow("Could not refresh");
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.session.error = null;
    mocks.refetch.mockImplementationOnce(async () => {});
    await expect(finishMfaSignIn()).rejects.toThrow("expired");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("keeps enrollment and verification restrictions before loading dashboard identity", async () => {
    mocks.fetch.mockResolvedValueOnce({ reason: "MFA_ENROLLMENT_REQUIRED" });
    await expect(finishMfaSignIn()).resolves.toBe("/mfa/setup");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("routes accounts without a membership to their shared settings", () => {
    for (const role of [null, "viewer", "fellow", "alumni_exec", "country_admin", "tenant_admin", "super_admin"]) {
      expect(homePathForSession({ role, tenantId: null })).toBe("/dashboard/settings/profile");
    }
    expect(homePathForSession({ role: "country_admin", tenantId: "hub" })).toBe("/dashboard/countries/hub");
    expect(homePathForSession({ role: "super_admin", tenantId: "global" })).toBe("/dashboard");
    expect(homePathForSession({ role: "tenant_admin", tenantId: "global" })).toBe("/dashboard");
  });
});
