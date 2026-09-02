import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders, auth, type UserRole } from "@epl-fellows-platform/auth";
import { db, userTenants } from "@epl-fellows-platform/db";
import { eq } from "drizzle-orm";

export interface UserTenantInfo {
  tenantId: string;
  role: UserRole;
  permissions?: Record<string, unknown>;
}

export type Context = {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  userTenant: UserTenantInfo | null;
  role: UserRole;
  tenantId: string | null;
};

const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  tenant_admin: 80,
  country_admin: 60,
  alumni_exec: 50,
  fellow: 30,
  viewer: 10,
};

function pickBestMembership(rows: Array<{ tenantId: string; role: string; permissions: unknown }>) {
  if (!rows.length) return null;
  return [...rows].sort(
    (a, b) => (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0),
  )[0]!;
}

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

  if (session?.user?.id) {
    const memberships = await db
      .select({
        tenantId: userTenants.tenantId,
        role: userTenants.role,
        permissions: userTenants.permissions,
      })
      .from(userTenants)
      .where(eq(userTenants.userId, session.user.id));

    const best = pickBestMembership(memberships);
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
    session,
    userTenant,
    role,
    tenantId,
  };
}
