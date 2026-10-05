import type { IncomingHttpHeaders } from "node:http";
import { auditStorage, type AuditContext } from "@epl-fellows-platform/db/audit";
import { fromNodeHeaders, auth, type UserRole } from "@epl-fellows-platform/auth";
import { resolveAccess, type AccessCapabilities, type Workspace } from "@epl-fellows-platform/auth/access-policy";
import { db, userTenants, tenants } from "@epl-fellows-platform/db";
import { eq } from "drizzle-orm";
import { transactionalDb } from "@epl-fellows-platform/db";
import { getMfaStatus } from "@epl-fellows-platform/auth/mfa-store";
import type { MfaStatus } from "@epl-fellows-platform/auth/mfa-policy";

export interface UserTenantInfo {
  tenantId: string;
  role: UserRole;
  permissions?: Record<string, unknown>;
}

export type Context = {
  audit?: AuditContext;
  capabilities?: AccessCapabilities;
  workspace?: Workspace | null;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  mfa: MfaStatus | null;
  userTenant: UserTenantInfo | null;
  role: UserRole;
  tenantId: string | null;
};

/** Compatible with tRPC Express adapter `{ req, res }` without exporting Express types. */
export async function createContext(opts: {
  req: { headers: IncomingHttpHeaders };
  res?: unknown;
}): Promise<Context> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  let userTenant: UserTenantInfo | null = null;
  let role: UserRole = "viewer";
  let tenantId: string | null = null;
  let access = resolveAccess([]);

  if (session?.user?.id) {
    const memberships = await db
      .select({
        tenantId: userTenants.tenantId,
        role: userTenants.role,
        permissions: userTenants.permissions,
        countryCode: tenants.countryCode, isActive: tenants.isActive, name: tenants.name,
      })
      .from(userTenants).innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, session.user.id));

    access = resolveAccess(memberships);
    const best = memberships.find(m => m.tenantId === access.tenantId && m.role === access.role);
    if (best) {
      userTenant = {
        tenantId: best.tenantId,
        role: best.role as UserRole,
        permissions: (best.permissions as Record<string, unknown>) ?? undefined,
      };
      role = userTenant.role;
      tenantId = userTenant.tenantId;
    }
  }

  return {
    audit: auditStorage.getStore(),
    capabilities: access.capabilities, workspace: access.workspace,
    session,
    mfa: session ? await getMfaStatus(transactionalDb, session.user.id, session.session.id) : null,
    userTenant,
    role,
    tenantId,
  };
}
