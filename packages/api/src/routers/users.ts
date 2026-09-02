import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { auth, type UserRole } from "@epl-fellows-platform/auth";
import { db, tenants, userTenants } from "@epl-fellows-platform/db";
import { user } from "@epl-fellows-platform/db/schema/auth";
import { router, requirePermission } from "../index";

const assignableRoles = z.enum([
  "super_admin",
  "tenant_admin",
  "country_admin",
  "alumni_exec",
  "viewer",
]);

export const usersRouter = router({
  list: requirePermission("users:manage").query(async ({ ctx }) => {
    const isPlatformAdmin = ctx.role === "super_admin";

    const query = db
      .select({
        membershipId: userTenants.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: userTenants.role,
        tenantId: userTenants.tenantId,
        tenantName: tenants.name,
        countryCode: tenants.countryCode,
        createdAt: userTenants.createdAt,
      })
      .from(userTenants)
      .innerJoin(user, eq(userTenants.userId, user.id))
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id));

    const rows =
      isPlatformAdmin || !ctx.tenantId
        ? await query.orderBy(desc(userTenants.createdAt))
        : await query
            .where(eq(userTenants.tenantId, ctx.tenantId))
            .orderBy(desc(userTenants.createdAt));

    return rows
      .filter((r) => isPlatformAdmin || r.countryCode !== "GLOBAL")
      .map((r) => ({
        id: r.membershipId,
        userId: r.userId,
        name: r.name,
        email: r.email,
        image: r.image,
        role: r.role as UserRole,
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        countryCode: r.countryCode ?? "",
        createdAt: r.createdAt,
      }));
  }),

  create: requirePermission("users:manage")
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(72),
        role: assignableRoles.default("country_admin"),
        tenantId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPlatformAdmin = ctx.role === "super_admin";

      let targetTenantId = input.tenantId;
      if (!isPlatformAdmin) {
        if (!ctx.tenantId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No country hub assigned to your account",
          });
        }
        targetTenantId = ctx.tenantId;
        if (input.role !== "country_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create country managers for this hub",
          });
        }
      }

      if (!targetTenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Country hub is required" });
      }

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, targetTenantId),
      });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
      }
      if (!isPlatformAdmin && tenant.countryCode === "GLOBAL") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid hub" });
      }

      const existing = await db.query.user.findFirst({
        where: eq(user.email, input.email.toLowerCase()),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      let createdUser: { id: string; email: string; name: string };
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email.toLowerCase(),
            password: input.password,
            name: input.name.trim(),
          },
        });
        createdUser = result.user;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create user account";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const [membership] = await db
        .insert(userTenants)
        .values({
          userId: createdUser.id,
          tenantId: tenant.id,
          role: input.role,
          permissions: {},
        })
        .returning();

      if (!membership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User created but role assignment failed",
        });
      }

      return {
        id: membership.id,
        userId: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: input.role,
        tenantId: tenant.id,
        tenantName: tenant.name,
        countryCode: tenant.countryCode ?? "",
        temporaryPassword: input.password,
      };
    }),
});
