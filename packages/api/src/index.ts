import { hasAnyRole, hasPermission, type Permission, type UserRole } from "@epl-fellows-platform/auth";
import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context.js";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No valid session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Middleware factory to enforce specific roles (RBAC)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userRole = ctx.role;
    if (!hasAnyRole(userRole, allowedRoles)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Role forbidden. Required one of: [${allowedRoles.join(", ")}]. Current role: ${userRole}`,
      });
    }
    return next({ ctx });
  });
}

/**
 * Middleware factory to enforce specific permissions
 */
export function requirePermission(permission: Permission) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userRole = ctx.role;
    if (!hasPermission(userRole, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied. Required permission: '${permission}'. Current role: ${userRole}`,
      });
    }
    return next({ ctx });
  });
}

// Pre-configured Procedure Builders
export const superAdminProcedure = requireRole("super_admin");
export const adminProcedure = requireRole("super_admin", "tenant_admin");
export const countryAdminProcedure = requireRole("super_admin", "tenant_admin", "country_admin");
export const alumniExecProcedure = requireRole("super_admin", "tenant_admin", "alumni_exec");
export const fellowProcedure = requireRole("super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow");
