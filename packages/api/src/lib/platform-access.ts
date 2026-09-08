import { TRPCError } from "@trpc/server";
import type { Context } from "../context";
export function canViewPlatform(ctx: Context) { return ctx.capabilities?.platformView ?? ctx.role === "super_admin"; }
export function canManageGlobalOperations(ctx: Context) { return ctx.capabilities?.globalOperations ?? ctx.role === "super_admin"; }
export function assertGlobalOperations(ctx: Context) {
  if (!canManageGlobalOperations(ctx)) throw new TRPCError({ code: "FORBIDDEN", message: "Global operations access is required." });
}
