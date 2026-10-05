import { auditStorage } from "@epl-fellows-platform/db/audit";
import { TRPCError } from "@trpc/server";
import { canViewPlatform } from "./platform-access";
import { eq } from "drizzle-orm";
import { db, tenants } from "@epl-fellows-platform/db";
import type { Context } from "../context.js";

export function resolveTenantId(ctx: Context, inputTenantId?: string): string {
  const isPlatformAdmin = canViewPlatform(ctx);

  if (isPlatformAdmin) {
    if (!inputTenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "tenantId is required" });
    }
    return inputTenantId;
  }

  if (!ctx.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No country hub assigned to your account" });
  }

  if (inputTenantId && inputTenantId !== ctx.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only access your own country hub" });
  }

  return ctx.tenantId;
}

export async function assertTenantAccess(ctx: Context, tenantId: string) {
  const resolved = resolveTenantId(ctx, tenantId);
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, resolved),
  });

  if (!tenant || tenant.countryCode === "GLOBAL" || (ctx.role === "tenant_admin" && !tenant.isActive)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
  }

  const audit = auditStorage.getStore();
  if (audit) audit.resolvedTenantId = tenant.id;
  return tenant;
}
