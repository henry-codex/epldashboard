import { hasAnyRole, hasPermission, type Permission, type UserRole } from "@epl-fellows-platform/auth";
import { initTRPC, TRPCError } from "@trpc/server";

import { assertGlobalOperations } from "./lib/platform-access";
import type { Context } from "./context.js";
import { auditMiddleware } from "./lib/audit-middleware";

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return { ...shape, data: { ...shape.data, mfaReason: error.cause instanceof MfaAccessError ? error.cause.reason : null } };
  },
});
class MfaAccessError extends Error {
  constructor(readonly reason: string) { super(reason); }
}

export const router = t.router;

export const publicProcedure = t.procedure.use(auditMiddleware);

export const authenticatedProcedure = publicProcedure.use(({ ctx, next }) => {
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

export const protectedProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.mfa) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in again." });
  if (ctx.mfa.reason) throw new TRPCError({ code: "FORBIDDEN", message: ctx.mfa.reason === "MFA_ENROLLMENT_REQUIRED" ? "Set up MFA before continuing." : "Verify MFA before continuing.", cause: new MfaAccessError(ctx.mfa.reason) });
  return next({ ctx });
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
export const globalOperationsProcedure = protectedProcedure.use(({ ctx, next }) => { assertGlobalOperations(ctx); return next({ ctx }); });
export const superAdminProcedure = requireRole("super_admin");
export const adminProcedure = requireRole("super_admin", "tenant_admin");
export const countryAdminProcedure = requireRole("super_admin", "tenant_admin", "country_admin");
export const alumniExecProcedure = requireRole("super_admin", "tenant_admin", "alumni_exec");
export const fellowProcedure = requireRole("super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow");
