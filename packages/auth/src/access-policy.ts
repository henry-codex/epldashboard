import type { UserRole } from "./permissions";

export type AccessMembership = { tenantId: string; role: string; countryCode: string | null; isActive: boolean | null; name?: string };
export type Workspace = { id: string; name: string; kind: "global" | "country" };
export type AccessCapabilities = {
  platformView: boolean; globalOperations: boolean; manageHubs: boolean;
  manageMemberships: boolean; inviteCountryAdmins: boolean; readAudit: boolean;
};
const rank: Record<string, number> = { super_admin: 100, tenant_admin: 80, country_admin: 60, alumni_exec: 50, fellow: 30, viewer: 10 };
export function resolveAccess(memberships: AccessMembership[]) {
  const active = memberships.filter(m => m.isActive === true && (m.role !== "tenant_admin" || m.countryCode === "GLOBAL"));
  const best = [...active].sort((a,b) => (rank[b.role] ?? 0) - (rank[a.role] ?? 0) || a.tenantId.localeCompare(b.tenantId))[0];
  const superAdmin = active.some(m => m.role === "super_admin");
  const globalOperator = active.some(m => m.role === "tenant_admin" && m.countryCode === "GLOBAL");
  const countryAdmin = active.some(m => m.role === "country_admin" && m.countryCode !== "GLOBAL");
  const capabilities: AccessCapabilities = {
    platformView: superAdmin || globalOperator, globalOperations: superAdmin || globalOperator,
    manageHubs: superAdmin, manageMemberships: superAdmin,
    inviteCountryAdmins: superAdmin || globalOperator || countryAdmin,
    readAudit: superAdmin || globalOperator || countryAdmin,
  };
  return { role: (best?.role ?? "viewer") as UserRole, tenantId: best?.tenantId ?? null,
    workspace: best ? { id: best.tenantId, name: best.countryCode === "GLOBAL" ? "EPL Global Platform" : best.name ?? "Country hub", kind: best.countryCode === "GLOBAL" ? "global" as const : "country" as const } : null,
    capabilities };
}
