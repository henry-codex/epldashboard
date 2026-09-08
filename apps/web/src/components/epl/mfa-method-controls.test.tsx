import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), signIn: vi.fn(), register: vi.fn(), replace: vi.fn(), done: vi.fn(), finish: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { $fetch: mocks.fetch, signIn: { passkey: mocks.signIn }, passkey: { addPasskey: mocks.register } } }));
vi.mock("@/lib/mfa", () => ({ finishMfaSignIn: mocks.finish, mfaError: (error: { message?: string }, fallback: string) => error.message ?? fallback, downloadBackupCodes: vi.fn(), verifyMfaCode: mocks.verify, loginPath: () => "/login" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
import { EmailCodeForm, MethodEnrollment, MethodVerifier, PasskeyManagement } from "./mfa-method-controls";
import { PasskeySignIn } from "./passkey-sign-in";
const status = { required: true, enabled: true, verified: true, fresh: true, enrolledMethods: ["passkey"] as ("passkey")[], permittedMethods: ["passkey"] as ("passkey")[], verificationMethod: "passkey" as const, reason: null };
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: function PublicKeyCredential() {} });
  Object.defineProperty(navigator, "credentials", { configurable: true, value: {} });
  mocks.signIn.mockResolvedValue({ data: { status: true }, error: null });
  mocks.finish.mockResolvedValue("/dashboard");
});
afterEach(cleanup);
describe("email and passkey controls", () => {
  it("reports failed SMTP submission and does not claim a sent code", async () => {
    mocks.fetch.mockResolvedValue({ data: { sent: false, destination: "a***@example.test", retryAfter: 60, message: "Email submission failed" }, error: null });
    render(<EmailCodeForm onVerified={mocks.done} />);
    fireEvent.click(screen.getByRole("button", { name: "Send email code" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Email submission failed");
    expect(screen.getByRole("button", { name: /Resend in/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText(/server accepted/)).toBeNull();
  });
  it("supports pasted six-digit codes and binds enrollment purpose and acknowledgment", async () => {
    mocks.fetch.mockResolvedValue({ data: { status: true }, error: null });
    render(<EmailCodeForm enrollment saved initial={{ sent: true, destination: "a***@example.test" }} onVerified={mocks.done} />);
    fireEvent.change(screen.getByLabelText("Email code"), { target: { value: "012345" } });
    fireEvent.click(screen.getByRole("button", { name: "Enable email codes" }));
    await waitFor(() => expect(mocks.done).toHaveBeenCalled());
    expect(mocks.fetch).toHaveBeenCalledWith("/two-factor/verify-otp", expect.objectContaining({ body: { code: "012345", purpose: "enrollment", backupCodesSaved: true } }));
    expect((screen.getByLabelText("Email code") as HTMLInputElement).value).toBe("");
  });
  it("shows only methods allowed by the server", async () => {
    mocks.fetch.mockResolvedValue({ data: { available: true, permittedMethods: ["passkey", "backup"] }, error: null });
    render(<MethodVerifier onVerified={mocks.done} />);
    await screen.findByRole("button", { name: "Passkey" });
    expect(screen.queryByRole("button", { name: "Email code" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Backup code" }));
    expect(screen.getByLabelText("Backup code")).toBeTruthy();
  });
  it("handles cancelled and unsupported passkey prompts with alternatives", async () => {
    mocks.signIn.mockResolvedValue({ error: { code: "AUTH_CANCELLED", status: 400 }, data: null });
    const view = render(<PasskeySignIn />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    expect((await screen.findByRole("alert")).textContent).toContain("cancelled");
    expect(mocks.finish).not.toHaveBeenCalled();
    view.unmount(); Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: undefined });
    render(<PasskeySignIn />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    expect((await screen.findByRole("alert")).textContent).toContain("does not support");
  });
  it("refreshes verification before resuming an invitation", async () => {
    const path = "/accept-invitation?token=" + "a".repeat(43);
    mocks.finish.mockResolvedValue(path);
    render(<PasskeySignIn returnTo={path} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with a passkey" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(path));
    expect(mocks.finish).toHaveBeenCalledWith(path);
  });
  it("requires saving shared recovery codes before registering a passkey", async () => {
    mocks.fetch.mockResolvedValue({ data: { backupCodes: ["test-backup-code"] }, error: null });
    mocks.register.mockResolvedValue({ data: { id: "key" }, error: null });
    render(<MethodEnrollment method="passkey" onComplete={mocks.done} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue setup" }));
    const create = await screen.findByRole("button", { name: "Create passkey" });
    expect(create.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByLabelText("I have saved my backup codes."));
    fireEvent.click(create);
    await waitFor(() => expect(mocks.register).toHaveBeenCalledWith({ name: "My passkey" }));
    await waitFor(() => expect(mocks.done).toHaveBeenCalled());
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
  });
  it("disables removal of the administrator's last passkey while keeping rename available", async () => {
    mocks.fetch.mockResolvedValue({ data: [{ id: "key", name: "Work laptop", createdAt: null }], error: null });
    render(<PasskeyManagement status={status} onChanged={mocks.done} />);
    expect((await screen.findByRole("button", { name: "Remove passkey" })).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Rename" }).hasAttribute("disabled")).toBe(false);
  });
});
