import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  preview: vi.fn(), accept: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), refetch: vi.fn(),
  getSession: vi.fn(), clear: vi.fn(), replace: vi.fn(), success: vi.fn(),
  session: null as null | { user: { id: string; email: string } },
}));
vi.mock("@/lib/invitations-client", async (original) => ({ ...await original<typeof import("@/lib/invitations-client")>(), previewInvitation: mocks.preview, acceptInvitation: mocks.accept }));
vi.mock("@/lib/auth-client", () => ({ authClient: {
  useSession: () => ({ data: mocks.session, isPending: false, refetch: mocks.refetch }),
  signIn: { email: mocks.signIn }, signOut: mocks.signOut, getSession: mocks.getSession,
} }));
vi.mock("@/utils/trpc", () => ({ queryClient: { clear: mocks.clear } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.replace }) }));
vi.mock("@/lib/mfa", async (original) => ({ ...await original<typeof import("@/lib/mfa")>(), finishMfaSignIn: async () => "/dashboard" }));
vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("./auth-shell", () => ({ AuthShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
import { AcceptInvitation } from "./accept-invitation";
import { InvitationRequestError } from "@/lib/invitations-client";

const token = "t".repeat(43);
const preview = { name: "Ama", email: "ama@example.test", role: "viewer", tenantName: "Ghana", expiresAt: new Date(Date.now() + 100000), requiresSignIn: false };
beforeEach(() => { vi.resetAllMocks(); mocks.session = null; mocks.preview.mockResolvedValue(preview); });
afterEach(cleanup);
async function fillPasswords(confirmation = "Chosen-password-123") {
  await screen.findByLabelText("New password");
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "  Ama Mensah  " } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Chosen-password-123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
}
describe("invitation acceptance", () => {
  it("continues an existing recipient through MFA without accepting or refreshing protected identity", async () => {
    mocks.preview.mockResolvedValueOnce({ ...preview, requiresSignIn: true });
    mocks.signIn.mockResolvedValueOnce({ data: { twoFactorRedirect: true }, error: null });
    render(<AcceptInvitation token={token} />);
    await screen.findByLabelText("Password");
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Existing-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to accept" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/mfa/verify?returnTo=" + encodeURIComponent("/accept-invitation?token=" + token)));
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
  it("handles missing links without a request", async () => {
    render(<AcceptInvitation token={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain("missing or invalid");
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it("previews without accepting and keeps the token out of rendered content", async () => {
    const { container } = render(<AcceptInvitation token={token} />);
    await screen.findByLabelText("New password");
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(container.innerHTML.includes(token)).toBe(false);
  });
  it("rejects mismatched passwords", async () => {
    render(<AcceptInvitation token={token} />); await fillPasswords("Mismatch-password");
    expect(screen.getByRole("alert").textContent).toContain("do not match");
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("creates an account with trimmed input and returns to login", async () => {
    mocks.accept.mockResolvedValueOnce({ existingAccount: false });
    render(<AcceptInvitation token={token} />); await fillPasswords();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.accept).toHaveBeenCalledWith({ token, name: "Ama Mensah", password: "Chosen-password-123" });
  });
  it("requires an existing recipient to sign in without collecting a new password", async () => {
    mocks.preview.mockResolvedValueOnce({ ...preview, requiresSignIn: true });
    mocks.signIn.mockResolvedValueOnce({ data: {}, error: null });
    render(<AcceptInvitation token={token} />);
    await screen.findByLabelText("Password");
    expect(screen.queryByLabelText("New password")).toBeNull();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Existing-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to accept" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({ email: preview.email, password: "Existing-password-123" }));
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("requires a different signed-in account to switch", async () => {
    mocks.session = { user: { id: "other", email: "other@example.test" } };
    mocks.signOut.mockResolvedValueOnce({ data: {}, error: null });
    render(<AcceptInvitation token={token} />);
    fireEvent.click(await screen.findByRole("button", { name: "Switch account" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("preserves existing account details when accepting and refreshes identity", async () => {
    mocks.preview.mockResolvedValueOnce({ ...preview, requiresSignIn: true });
    mocks.session = { user: { id: "recipient", email: preview.email } };
    mocks.accept.mockResolvedValueOnce({ existingAccount: true });
    render(<AcceptInvitation token={token} />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/dashboard"));
    expect(mocks.accept).toHaveBeenCalledWith({ token });
    expect(mocks.getSession).toHaveBeenCalled();
    expect(mocks.clear).toHaveBeenCalled();
  });
  it("shows rate-limit or expired-link errors without reporting success", async () => {
    mocks.accept.mockRejectedValueOnce(new InvitationRequestError(429, "Too many attempts. Wait a minute."));
    render(<AcceptInvitation token={token} />); await fillPasswords();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Too many attempts"));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
