import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  notifySession: vi.fn(), cancelQueries: vi.fn(), removeQueries: vi.fn(), refetch: vi.fn(), enable: vi.fn(), verify: vi.fn(), fetch: vi.fn(), replace: vi.fn(), done: vi.fn(), download: vi.fn(), finish: vi.fn(), queryError: false,
  status: { required: false, enabled: false, verified: false, fresh: false, reason: null as string | null },
  identity: { user: { id: "user" } } as { user: { id: string } } | null,
}));
vi.mock("@/lib/auth-client", () => ({ authClient: {
  twoFactor: { enable: mocks.enable }, $fetch: mocks.fetch, $store: { notify: mocks.notifySession },
  useSession: () => ({ data: mocks.identity, isPending: false }), signOut: vi.fn(),
} }));
vi.mock("@/lib/mfa", () => ({
  verifyMfaCode: mocks.verify, downloadBackupCodes: mocks.download,
  finishMfaSignIn: mocks.finish, loginPath: () => "/login", mfaPath: (page: string) => "/mfa/" + page,
  mfaError: (error: { message?: string }, fallback: string) => error.message ?? fallback,
}));
vi.mock("@/utils/trpc", () => ({ queryClient: { clear: vi.fn(), cancelQueries: mocks.cancelQueries, removeQueries: mocks.removeQueries }, trpc: { account: { mfaStatus: { queryOptions: () => ({}), queryKey: () => ["account", "mfaStatus"] } } } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: mocks.status, isPending: false, isError: mocks.queryError, refetch: mocks.refetch }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => "/dashboard" }));
vi.mock("./auth-shell", () => ({ AuthShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
import { MfaCodeForm, MfaEnrollment, MfaPage, MfaSecuritySection } from "./mfa";
import { MfaGate } from "./mfa-gate";

const setup = { totpURI: "otpauth://totp/EPL:someone?secret=JBSWY3DPEHPK3PXP&issuer=EPL", backupCodes: Array.from({ length: 10 }, (_, i) => "saved-code-" + i) };
beforeEach(() => {
  vi.resetAllMocks(); mocks.enable.mockResolvedValue({ data: setup, error: null }); mocks.verify.mockResolvedValue({ data: {}, error: null });
  mocks.fetch.mockResolvedValue({ data: { available: true, authenticated: true, permittedMethods: ["authenticator", "backup"] }, error: null });
  mocks.identity = { user: { id: "user" } }; mocks.queryError = false;
  mocks.status = { required: false, enabled: false, verified: false, fresh: false, reason: null };
  mocks.finish.mockResolvedValue("/dashboard");
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("MFA screens", () => {
  it("requires saving backup codes before enabling and generates the QR locally", async () => {
    render(<MfaEnrollment onComplete={mocks.done} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));
    await screen.findByLabelText("Manual setup key");
    expect(screen.getByRole("button", { name: "Enable MFA" }).hasAttribute("disabled")).toBe(true);
    expect(document.querySelector("svg")).not.toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.queryByLabelText("Current password")).toBeNull();
  });
  it("submits acknowledgment with the code and clears the secret after completion", async () => {
    render(<MfaEnrollment onComplete={mocks.done} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));
    await screen.findByLabelText("Manual setup key");
    fireEvent.click(screen.getByLabelText("I have saved my backup codes."));
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "012345" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable MFA" }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith("012345", false, true));
    await waitFor(() => expect(mocks.done).toHaveBeenCalled());
    expect(screen.queryByLabelText("Manual setup key")).toBeNull();
  });
  it("keeps a retryable error visible if session refresh fails after verification", async () => {
    mocks.done.mockRejectedValue(new Error("Connection lost"));
    render(<MfaEnrollment onComplete={mocks.done} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));
    await screen.findByLabelText("Manual setup key");
    fireEvent.click(screen.getByLabelText("I have saved my backup codes."));
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "012345" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable MFA" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not reach the server");
    expect(screen.getByLabelText("Authenticator code")).toBeTruthy();
  });
  it("downloads backup codes only after an explicit action", async () => {
    render(<MfaEnrollment onComplete={mocks.done} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));
    await screen.findByLabelText("Manual setup key");
    expect(mocks.download).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download backup codes" }));
    expect(mocks.download).toHaveBeenCalledWith(setup.backupCodes);
  });
  it("supports backup-code entry and keeps errors visible", async () => {
    mocks.verify.mockResolvedValue({ error: { status: 429, message: "Wait before trying again." } });
    render(<MfaCodeForm onVerified={mocks.done} />);
    fireEvent.click(screen.getByRole("button", { name: "Use a backup code" }));
    fireEvent.change(screen.getByLabelText("Backup code"), { target: { value: "abcde-fghij" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    await screen.findByRole("alert");
    expect(mocks.verify).toHaveBeenCalledWith("abcde-fghij", true, undefined);
    expect(mocks.done).not.toHaveBeenCalled();
  });
  it("allows an unenrolled account through the dashboard gate", () => {
    render(<MfaGate><p>Protected content</p></MfaGate>);
    expect(screen.getByText("Protected content")).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("does not mount protected dashboard content before an enrolled account verifies", async () => {
    mocks.status = { required: false, enabled: true, verified: false, fresh: false, reason: "MFA_VERIFICATION_REQUIRED" };
    const child = vi.fn(() => <p>Protected content</p>);
    const Child = child;
    render(<MfaGate><Child /></MfaGate>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/mfa/verify"));
    expect(child).not.toHaveBeenCalled();
  });
  it("allows a verified session through the dashboard gate", () => {
    mocks.status = { required: false, enabled: true, verified: true, fresh: true, reason: null };
    render(<MfaGate><p>Protected content</p></MfaGate>);
    expect(screen.getByText("Protected content")).toBeTruthy();
  });
  it("offers all methods and explains removing the last authenticator", () => {
    mocks.status = { required: false, enabled: true, verified: true, fresh: true, reason: null };
    render(<MfaSecuritySection />);
    expect(screen.getByRole("button", { name: "Replace authenticator" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set up email codes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove authenticator" }));
    expect(screen.getByText(/returns your account to password-only sign-in/)).toBeTruthy();
    expect(screen.getByLabelText("Current password")).toBeTruthy();
  });
  it("lets an unenrolled user skip setup and resume an invitation", async () => {
    const path = "/accept-invitation?token=" + "a".repeat(43);
    mocks.finish.mockResolvedValue(path);
    render(<MfaPage mode="setup" returnTo={path} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(path));
    expect(mocks.finish).toHaveBeenCalledWith(path);
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it("can leave incomplete authenticator setup without acknowledging or enabling it", async () => {
    render(<MfaPage mode="setup" returnTo={null} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "current-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set up authenticator" }));
    await screen.findByLabelText("Manual setup key");
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Manual setup key")).toBeNull();
  });
  it("honors the refreshed verification destination when MFA was enabled elsewhere", async () => {
    mocks.finish.mockResolvedValue("/mfa/verify");
    render(<MfaPage mode="setup" returnTo={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/mfa/verify"));
  });
  it("does not offer Not now to an enrolled unverified account", async () => {
    mocks.status = { required: false, enabled: true, verified: false, fresh: false, reason: "MFA_VERIFICATION_REQUIRED" };
    render(<MfaPage mode="setup" returnTo={null} />);
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/mfa/verify"));
  });
  it("shows a retryable error when skipping cannot refresh server status", async () => {
    mocks.finish.mockRejectedValue(new Error("offline"));
    render(<MfaPage mode="setup" returnTo={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Could not reach the server");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Not now" })).toBeTruthy();
  });
  it.each(["/accept-invitation?token=" + "a".repeat(43), "https://outside.example"])("safely resumes already-verified accounts from setup: %s", async (returnTo) => {
    mocks.status = { required: false, enabled: true, verified: true, fresh: true, reason: null };
    render(<MfaPage mode="setup" returnTo={returnTo} />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(returnTo.startsWith("/") ? returnTo : "/dashboard/settings/security"));
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  });
  it("shows status failures instead of redirecting from stale enrollment data", () => {
    mocks.status = { required: false, enabled: true, verified: true, fresh: true, reason: null };
    mocks.queryError = true;
    render(<MfaPage mode="setup" returnTo={null} />);
    expect(screen.getByRole("alert").textContent).toContain("Could not load account security");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("handles a missing challenge explicitly", async () => {
    mocks.identity = null; mocks.fetch.mockResolvedValue({ data: { available: false }, error: null });
    render(<MfaPage mode="verify" returnTo={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain("missing or expired");
    expect(screen.queryByLabelText("Authenticator code")).toBeNull();
  });
});

describe("weekly MFA browser controls", () => {
  it("shows the expiry and confirms forgetting before signing out", async () => {
    Object.assign(mocks.status, { enabled: true, verified: true, verificationExpiresAt: new Date(Date.now() + 86400000).toISOString(), browserRememberedUntil: new Date(Date.now() + 86400000).toISOString() });
    render(<MfaSecuritySection />);
    expect(screen.getByText(/this browser is remembered for seven days/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Forget this browser and sign out" }));
    expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and sign out" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.fetch).toHaveBeenCalledWith("/two-factor/forget-browser", { method: "POST" });
    expect(mocks.notifySession).toHaveBeenCalledWith("$sessionSignal");
  });
  it("returns keyboard focus to the forget control when confirmation is cancelled", () => {
    Object.assign(mocks.status, { enabled: true, browserRememberedUntil: new Date(Date.now() + 86400000).toISOString() });
    render(<MfaSecuritySection />);
    const button = screen.getByRole("button", { name: "Forget this browser and sign out" });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("keeps a failed forget request retryable", async () => {
    Object.assign(mocks.status, { enabled: true, browserRememberedUntil: new Date(Date.now() + 86400000).toISOString() });
    mocks.fetch.mockResolvedValue({ error: { message: "Try again later" } });
    render(<MfaSecuritySection />);
    fireEvent.click(screen.getByRole("button", { name: "Forget this browser and sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and sign out" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("unmounts protected content at expiry and clears protected queries", async () => {
    vi.useFakeTimers();
    Object.assign(mocks.status, { enabled: true, verified: true, verificationExpiresAt: new Date(Date.now() + 1000).toISOString() });
    render(<MfaGate><p>Protected content</p></MfaGate>);
    expect(screen.getByText("Protected content")).toBeTruthy();
    await (await import("@testing-library/react")).act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(mocks.removeQueries).toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/mfa/verify");
  });
  it("stops focus and expiry checks after sign-out", async () => {
    vi.useFakeTimers();
    Object.assign(mocks.status, { enabled: true, verified: true, verificationExpiresAt: new Date(Date.now() + 1000).toISOString() });
    const view = render(<MfaGate><p>Protected content</p></MfaGate>);
    mocks.identity = null;
    view.rerender(<MfaGate><p>Protected content</p></MfaGate>);
    fireEvent.focus(window);
    fireEvent(document, new Event("visibilitychange"));
    await (await import("@testing-library/react")).act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/login");
  });
  it("rechecks security when the browser regains focus", () => {
    render(<MfaGate><p>Protected content</p></MfaGate>);
    fireEvent.focus(window);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
