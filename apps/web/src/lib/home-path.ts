/** Roles that should land in a country hub workspace (not the global overview). */
export const COUNTRY_WORKSPACE_ROLES = new Set([
  "country_admin",
  "tenant_admin",
  "alumni_exec",
  "viewer",
]);

export function homePathForSession(input: {
  role?: string | null;
  tenantId?: string | null;
}) {
  if (input.role && COUNTRY_WORKSPACE_ROLES.has(input.role) && input.tenantId) {
    return `/dashboard/countries/${input.tenantId}`;
  }
  return "/dashboard";
}

export function isCountryWorkspaceRole(role?: string | null) {
  return Boolean(role && COUNTRY_WORKSPACE_ROLES.has(role));
}
