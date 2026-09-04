import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ne, desc, sql } from "drizzle-orm";
import { auth } from "@epl-fellows-platform/auth";
import { db, tenants, userTenants } from "@epl-fellows-platform/db";
import { user } from "@epl-fellows-platform/db/schema/auth";
import { router, requirePermission, protectedProcedure } from "../index";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const tenantSettingsSchema = z.object({
  flag: z.string().max(8).optional(),
  color: z.string().max(32).optional(),
  iso2: z.string().max(2).optional(),
});

async function allocateSlug(name: string, countryCode: string) {
  const baseSlug = slugify(name) || countryCode.toLowerCase();
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < 5) {
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
    if (!existing) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt + 1}`;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

function mapTenant(r: {
  id: string;
  name: string;
  slug: string;
  countryCode: string | null;
  settings: unknown;
  isActive: boolean | null;
  createdAt: Date;
  memberCount?: number;
}) {
  const settings = (r.settings ?? {}) as { flag?: string; color?: string; iso2?: string };
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    countryCode: r.countryCode ?? "",
    flag: settings.flag ?? "",
    iso2: settings.iso2 ?? "",
    color: settings.color ?? "#4150A3",
    isActive: r.isActive ?? true,
    memberCount: Number(r.memberCount ?? 0),
    createdAt: r.createdAt,
  };
}

export const tenantsRouter = router({
  /** Current user's country hub (null for GLOBAL / no membership) */
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return null;
    const row = await db.query.tenants.findFirst({
      where: eq(tenants.id, ctx.tenantId),
    });
    if (!row || row.countryCode === "GLOBAL") return null;
    return mapTenant({ ...row, memberCount: 0 });
  }),

  /** Resolve hub by UUID, slug, or ISO country code */
  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const key = input.id.trim();
      const row =
        (await db.query.tenants.findFirst({ where: eq(tenants.id, key) })) ??
        (await db.query.tenants.findFirst({ where: eq(tenants.slug, key.toLowerCase()) })) ??
        (await db.query.tenants.findFirst({
          where: eq(tenants.countryCode, key.toUpperCase()),
        }));

      if (!row || row.countryCode === "GLOBAL") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
      }

      const isPlatformAdmin = ctx.role === "super_admin";
      if (!isPlatformAdmin && ctx.tenantId !== row.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only open your own country hub",
        });
      }

      return mapTenant({ ...row, memberCount: 0 });
    }),

  /** Partner nations (excludes GLOBAL platform tenant) */
  list: protectedProcedure.query(async ({ ctx }) => {
    const isPlatformAdmin = ctx.role === "super_admin";

    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
        createdAt: tenants.createdAt,
        memberCount: sql<number>`(
          select count(*)::int from user_tenants
          where user_tenants.tenant_id = ${tenants.id}
        )`,
      })
      .from(tenants)
      .where(ne(tenants.countryCode, "GLOBAL"))
      .orderBy(desc(tenants.createdAt));

    const mapped = rows.map((r) => mapTenant(r));
    if (isPlatformAdmin) return mapped;
    if (!ctx.tenantId) return [];
    return mapped.filter((r) => r.id === ctx.tenantId);
  }),

  create: requirePermission("tenants:manage")
    .input(
      z.object({
        name: z.string().min(2).max(100),
        countryCode: z
          .string()
          .min(2)
          .max(3)
          .transform((v) => v.toUpperCase()),
        flag: z.string().max(8).optional(),
        iso2: z
          .string()
          .length(2)
          .transform((v) => v.toUpperCase())
          .optional(),
        color: z.string().max(32).optional().default("#4150A3"),
      }),
    )
    .mutation(async ({ input }) => {
      const slug = await allocateSlug(input.name, input.countryCode);

      const codeTaken = await db.query.tenants.findFirst({
        where: eq(tenants.countryCode, input.countryCode),
      });
      if (codeTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A country hub with ISO code ${input.countryCode} already exists.`,
        });
      }

      const settings = tenantSettingsSchema.parse({
        flag: input.flag,
        color: input.color,
        iso2: input.iso2,
      });

      const [created] = await db
        .insert(tenants)
        .values({
          name: input.name.trim(),
          slug,
          countryCode: input.countryCode,
          settings,
          isActive: true,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create country hub" });
      }

      return mapTenant({ ...created, memberCount: 0 });
    }),

  /** Create a country hub and its first country admin in one step */
  createWithAdmin: requirePermission("tenants:manage")
    .input(
      z.object({
        name: z.string().min(2).max(100),
        countryCode: z
          .string()
          .min(2)
          .max(3)
          .transform((v) => v.toUpperCase()),
        flag: z.string().max(8).optional(),
        iso2: z
          .string()
          .length(2)
          .transform((v) => v.toUpperCase())
          .optional(),
        color: z.string().max(32).optional().default("#4150A3"),
        adminName: z.string().min(2).max(100),
        adminEmail: z.string().email(),
        adminPassword: z.string().min(8).max(72),
      }),
    )
    .mutation(async ({ input }) => {
      const slug = await allocateSlug(input.name, input.countryCode);

      const codeTaken = await db.query.tenants.findFirst({
        where: eq(tenants.countryCode, input.countryCode),
      });
      if (codeTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A country hub with ISO code ${input.countryCode} already exists.`,
        });
      }

      const emailTaken = await db.query.user.findFirst({
        where: eq(user.email, input.adminEmail.toLowerCase()),
      });
      if (emailTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const settings = tenantSettingsSchema.parse({
        flag: input.flag,
        color: input.color,
        iso2: input.iso2,
      });

      const [created] = await db
        .insert(tenants)
        .values({
          name: input.name.trim(),
          slug,
          countryCode: input.countryCode,
          settings,
          isActive: true,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create country hub" });
      }

      let createdUser: { id: string; email: string; name: string };
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.adminEmail.toLowerCase(),
            password: input.adminPassword,
            name: input.adminName.trim(),
          },
        });
        createdUser = result.user;
      } catch (err: unknown) {
        await db.delete(tenants).where(eq(tenants.id, created.id));
        const message = err instanceof Error ? err.message : "Failed to create admin account";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const [membership] = await db
        .insert(userTenants)
        .values({
          userId: createdUser.id,
          tenantId: created.id,
          role: "country_admin",
          permissions: {},
        })
        .returning();

      if (!membership) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Hub created but admin role assignment failed",
        });
      }

      return {
        tenant: mapTenant({ ...created, memberCount: 1 }),
        admin: {
          id: membership.id,
          userId: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: "country_admin" as const,
        },
      };
    }),

  /** Edit a hub's display name and settings (color, flag, iso2) */
  update: requirePermission("tenants:manage")
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(100).optional(),
        color: z.string().max(32).optional(),
        flag: z.string().max(8).optional(),
        iso2: z
          .string()
          .length(2)
          .transform((v) => v.toUpperCase())
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.tenants.findFirst({ where: eq(tenants.id, input.id) });
      if (!existing || existing.countryCode === "GLOBAL") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
      }

      const currentSettings = (existing.settings ?? {}) as { flag?: string; color?: string; iso2?: string };
      const settings = tenantSettingsSchema.parse({
        flag: input.flag ?? currentSettings.flag,
        color: input.color ?? currentSettings.color,
        iso2: input.iso2 ?? currentSettings.iso2,
      });

      const [updated] = await db
        .update(tenants)
        .set({
          ...(input.name ? { name: input.name.trim() } : {}),
          settings,
        })
        .where(eq(tenants.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update country hub" });
      }

      return mapTenant({ ...updated, memberCount: 0 });
    }),

  /** Soft delete (deactivate) or restore a hub. Deactivated hubs are excluded
   * from every platform-wide aggregate query, so their data stops showing up
   * network-wide without losing the underlying records. */
  setActive: requirePermission("tenants:manage")
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.tenants.findFirst({ where: eq(tenants.id, input.id) });
      if (!existing || existing.countryCode === "GLOBAL") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
      }

      const [updated] = await db
        .update(tenants)
        .set({ isActive: input.isActive })
        .where(eq(tenants.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update country hub" });
      }

      return mapTenant({ ...updated, memberCount: 0 });
    }),
});
