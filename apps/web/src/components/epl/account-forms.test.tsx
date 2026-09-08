import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileSettingsPanel } from "./profile-settings-panel";
const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(), updateUser: vi.fn(), getSession: vi.fn(), refetch: vi.fn(),
  invalidateQueries: vi.fn(), replace: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: {
  ...mocks, useSession: () => ({ data: { user: { name: "Ama", email: "ama@example.test" } }, refetch: mocks.refetch }),
} }));
vi.mock("@/hooks/use-home-path", () => ({ useHomePath: () => ({ role: "viewer" }) }));
vi.mock("@/utils/trpc", () => ({ queryClient: { invalidateQueries: mocks.invalidateQueries }, trpc: { privateData: { queryKey: () => ["privateData"] } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function passwords(confirm = "new-password") {
  fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
}
describe("account forms", () => {
  it("never submits mismatched passwords", () => {
    render(<ChangePasswordForm />); passwords("does-not-match");
    expect(screen.getByRole("alert").textContent).toContain("do not match");
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
  it("requires revocation and refreshes after success", async () => {
    mocks.changePassword.mockResolvedValueOnce({ data: {}, error: null });
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<ChangePasswordForm onChanged={onChanged} />); passwords();
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(mocks.changePassword).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "new-password", revokeOtherSessions: true });
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
  });
  it("shows an incorrect-password error without claiming success", async () => {
    mocks.changePassword.mockResolvedValueOnce({ error: { status: 400, message: "Current password is incorrect" } });
    const onChanged = vi.fn();
    render(<ChangePasswordForm onChanged={onChanged} />); passwords();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("incorrect"));
    expect(onChanged).not.toHaveBeenCalled();
  });
  it("saves a trimmed name and refreshes identity", async () => {
    mocks.updateUser.mockResolvedValueOnce({ data: {}, error: null });
    render(<ProfileSettingsPanel />);
    expect(screen.queryByText("Super Admin")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "  Ama Mensah  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
    expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Ama Mensah" });
    expect(mocks.invalidateQueries).toHaveBeenCalled();
  });
});
