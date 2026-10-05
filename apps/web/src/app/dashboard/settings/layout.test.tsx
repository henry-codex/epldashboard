import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import SettingsLayout from "./layout";
const state = vi.hoisted(() => ({ role: "viewer" as UserRole, pathname: "/dashboard/settings/profile", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => state.pathname }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: { user: { name: "User", email: "user@example.test" } }, isPending: false }) } }));
vi.mock("@/hooks/use-home-path", () => ({ useHomePath: () => ({ role: state.role, tenant: null, path: "/dashboard", isLoading: false, isError: false }) }));
vi.mock("@/components/epl/nested-shell", () => ({ NestedShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("settings page guard", () => {
  it.each(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer"] as const)("renders personal settings for %s without a country", (role) => {
    state.role = role; state.pathname = "/dashboard/settings/security";
    render(<SettingsLayout><div>Personal settings</div></SettingsLayout>);
    expect(screen.getByText("Personal settings")).toBeDefined();
  });
  it.each(["alumni_exec", "fellow", "viewer"] as const)("does not mount user administration for %s", (role) => {
    state.role = role; state.pathname = "/dashboard/settings/users";
    render(<SettingsLayout><div>Restricted content</div></SettingsLayout>);
    expect(screen.queryByText("Restricted content")).toBeNull();
    expect(state.replace).toHaveBeenCalledWith("/dashboard/settings/profile");
  });
});
