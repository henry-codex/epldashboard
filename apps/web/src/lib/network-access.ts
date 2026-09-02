import type { UserRole } from "@epl-fellows-platform/auth/permissions";

export function isNetworkManager(role: UserRole | null | undefined): boolean {
  return role === "country_admin" || role === "tenant_admin";
}

export function canViewNetworkRoster(role: UserRole | null | undefined): boolean {
  return isNetworkManager(role) || role === "super_admin";
}

export function canManageHubUsers(role: UserRole | null | undefined): boolean {
  return role === "super_admin" || role === "country_admin" || role === "tenant_admin";
}

export function isPlatformViewer(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}
