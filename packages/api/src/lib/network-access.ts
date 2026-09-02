import { TRPCError } from "@trpc/server";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import type { Context } from "../context.js";

/** Country-scoped roles that own roster data entry for their hub. */
export function isNetworkManager(role: UserRole): boolean {
  return role === "country_admin" || role === "tenant_admin";
}

/** Roles that may view fellow-level roster data (including platform oversight). */
export function canViewNetworkRoster(role: UserRole): boolean {
  return isNetworkManager(role) || role === "super_admin";
}

export function assertNetworkManager(ctx: Context) {
  if (!isNetworkManager(ctx.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only country managers can modify network data for this hub",
    });
  }
}
