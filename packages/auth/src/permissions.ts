export type UserRole = "super_admin" | "tenant_admin" | "country_admin" | "alumni_exec" | "fellow" | "viewer";

export type Permission =
  | "tenants:manage"
  | "tenants:read"
  | "users:manage"
  | "fellows:create"
  | "fellows:read"
  | "fellows:update"
  | "fellows:delete"
  | "placements:manage"
  | "placements:read"
  | "checkins:submit"
  | "checkins:approve"
  | "checkins:read"
  | "reports:view"
  | "activity:read"
  | "alumni:manage"
  | "newsletters:manage"
  | "events:manage";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  country_admin: [
    "tenants:read",
    "users:manage",
    "fellows:create",
    "fellows:read",
    "fellows:update",
    "fellows:delete",
    "placements:manage",
    "placements:read",
    "checkins:approve",
    "checkins:read",
    "reports:view",
    "activity:read",
    "events:manage",
  ],
  tenant_admin: [
    "tenants:read",
    "users:manage",
    "fellows:create",
    "fellows:read",
    "fellows:update",
    "fellows:delete",
    "placements:manage",
    "placements:read",
    "checkins:approve",
    "checkins:read",
    "reports:view",
    "activity:read",
    "alumni:manage",
    "newsletters:manage",
    "events:manage",
  ],
  super_admin: [
    "tenants:manage",
    "tenants:read",
    "users:manage",
    "fellows:create",
    "fellows:read",
    "fellows:update",
    "fellows:delete",
    "placements:manage",
    "placements:read",
    "checkins:submit",
    "checkins:approve",
    "checkins:read",
    "reports:view",
    "activity:read",
    "alumni:manage",
    "newsletters:manage",
    "events:manage",
  ],
  alumni_exec: [
    "tenants:read",
    "fellows:read",
    "placements:read",
    "checkins:read",
    "reports:view",
    "alumni:manage",
    "newsletters:manage",
    "events:manage",
    "activity:read",
  ],
  fellow: [
    "tenants:read",
    "fellows:read",
    "placements:read",
    "checkins:submit",
    "checkins:read",
    "reports:view",
  ],
  viewer: [
    "tenants:read",
    "fellows:read",
    "placements:read",
    "checkins:read",
    "reports:view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
