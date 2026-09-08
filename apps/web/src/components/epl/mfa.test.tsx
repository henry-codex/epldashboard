import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  enable: vi.fn(), verify: vi.fn(), fetch: vi.fn(), replace: vi.fn(), done: vi.fn(), download: vi.fn(),
  status: { required: true, enabled: false, verified: false, fresh: false, reason: "MFA_ENROLLMENT_REQUIRED" as string | null },
  identity: { user: { id: "user" } } as { user: { id: string } } | null,
}));
vi.mock("@/lib/auth-client", () => ({ authClient: {
  twoFactor: { enable: mocks.enable }, $fetch: mocks.fetch,
  useSession: () => ({ data: mocks.identity, isPending: false }), signOut: vi.fn(),
} }));
vi.mock("@/lib/mfa", () => ({
  verifyMfaCode: mocks.verify, downloadBackupCodes: mocks.download,
  finishMfaSignIn: async () => "/dashboard", loginPath: () => "/login", mfaPath: (page: string) => "/mfa/" + page,
  mfaError: (error: { message?: string }, fallback: string) => error.message ?? fallback,
}));
vi.mock("@/utils/trpc", () => ({ queryClient: { clear: vi.fn() }, trpc: { account: { mfaStatus: { queryOptions: () => ({}) } } } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: mocks.status, isPending: false, isError: false, refetch: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => "/dashboard" }));
vi.mock("./auth-shell", () => ({ AuthShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
import { MfaCodeForm, MfaEnrollment, MfaPage, MfaSecuritySection } from "./mfa";
import { MfaGate } from "./mfa-gate";

const setup = { totpURI: "otpauth://totp/EPL:someone?secret=JBSWY3DPEHPK3PXP&issuer=EPL", backupCodes: Array.from({ length: 10 }, (_, i) => "saved-code-" + i) };
beforeEach(() => {
  vi.resetAllMocks(); mocks.enable.mockResolvedValue({ data: setup, error: null }); mocks.verify.mockResolvedValue({ data: {}, error: null });
  mocks.fetch.mockResolvedValue({ data: { available: true, authenticated: true, permittedMethods: ["authenticator", "backup"] }, error: null });
  mocks.identity = { user: { id: "user" } };
  mocks.status = { required: true, enabled: false, verified: false, fresh: false, reason: "MFA_ENROLLMENT_REQUIRED" };
});
afterEach(cleanup);
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
  it("does not mount protected dashboard content before enrollment", async () => {
    const child = vi.fn(() => <p>Protected content</p>);
    const Child = child;
    render(<MfaGate><Child /></MfaGate>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/mfa/setup"));
    expect(child).not.toHaveBeenCalled();
  });
  it("allows a verified session through the dashboard gate", () => {
    mocks.status = { required: true, enabled: true, verified: true, fresh: true, reason: null };
    render(<MfaGate><p>Protected content</p></MfaGate>);
    expect(screen.getByText("Protected content")).toBeTruthy();
  });
  it("offers replacement instead of disabling for required users", () => {
    mocks.status = { required: true, enabled: true, verified: true, fresh: true, reason: null };
    render(<MfaSecuritySection />);
    expect(screen.getByRole("button", { name: "Replace authenticator" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Disable MFA" })).toBeNull();
  });
  it("handles a missing challenge explicitly", async () => {
    mocks.identity = null; mocks.fetch.mockResolvedValue({ data: { available: false }, error: null });
    render(<MfaPage mode="verify" returnTo={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain("missing or expired");
    expect(screen.queryByLabelText("Authenticator code")).toBeNull();
  });
});
