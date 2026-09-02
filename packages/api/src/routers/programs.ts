import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, fellows, hubPrograms } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager } from "../lib/network-access.js";
import { computeProgramHealth } from "../lib/program-health.js";
import {
  checkInRatesByProgram,
  fellowCountsByProgram,
  lookupProgramCounts,
  normalizeProgramKey,
  placementRatesByProgram,
} from "../lib/program-stats.js";

const programStatusSchema = z.enum(["active", "completed", "planned"]);

function lookupByProgramTitle<T>(map: Map<string, T>, title: string): T | undefined {
  const exact = map.get(title);
  if (exact) return exact;
  const needle = normalizeProgramKey(title);
  for (const [key, value] of map) {
    if (normalizeProgramKey(key) === needle) return value;
  }
  return undefined;
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function mapProgram(
  row: typeof hubPrograms.$inferSelect,
  counts: { activeFellows: number; alumniFellows: number; totalFellows: number },
  checkIns: { checkInRate: number | null; submitted: number } | undefined,
  placements: { placementRate: number | null; placed: number } | undefined,
) {
  const target = row.targetFellows ?? 0;
  const fillRate = target > 0 ? Math.min(100, Math.round((counts.activeFellows / target) * 100)) : null;
  const progress = fillRate ?? 0;

  const health = computeProgramHealth({
    programStatus: row.status as "active" | "completed" | "planned",
    activeFellows: counts.activeFellows,
    targetFellows: target,
    fillRate,
    checkInRate: checkIns?.checkInRate ?? null,
    placementRate: placements?.placementRate ?? null,
    activeFellowsWithCheckIns: checkIns?.submitted ?? 0,
    activeFellowsWithPlacements: placements?.placed ?? 0,
  });

  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status as "active" | "completed" | "planned",
    targetFellows: target,
    startYear: row.startYear,
    sortOrder: row.sortOrder ?? 0,
    activeFellows: counts.activeFellows,
    alumniFellows: counts.alumniFellows,
    totalFellows: counts.totalFellows,
    progress,
    fillRate,
    checkInRate: checkIns?.checkInRate ?? null,
    placementRate: placements?.placementRate ?? null,
    health: health.health,
    healthLabel: health.label,
    healthReasons: health.reasons,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const programInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  status: programStatusSchema,
  targetFellows: z.number().int().min(0).max(10000).optional().default(0),
  startYear: z.number().int().min(2000).max(2100).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

async function loadProgramMaps(tenantId: string) {
  const [countsMap, checkInMap, placementMap] = await Promise.all([
    fellowCountsByProgram(tenantId),
    checkInRatesByProgram(tenantId),
    placementRatesByProgram(tenantId),
  ]);
  return { countsMap, checkInMap, placementMap };
}

export const programsRouter = router({
  aggregates: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [programRows, fellowRows, maps] = await Promise.all([
        db
          .select({
            status: hubPrograms.status,
            count: sql<number>`count(*)::int`,
          })
          .from(hubPrograms)
          .where(eq(hubPrograms.tenantId, tenantId))
          .groupBy(hubPrograms.status),
        db
          .select({
            status: fellows.status,
            count: sql<number>`count(*)::int`,
          })
          .from(fellows)
          .where(eq(fellows.tenantId, tenantId))
          .groupBy(fellows.status),
        loadProgramMaps(tenantId),
      ]);

      let totalPrograms = 0;
      let activePrograms = 0;
      for (const row of programRows) {
        totalPrograms += row.count;
        if (row.status === "active") activePrograms = row.count;
      }

      let activeFellows = 0;
      let alumniFellows = 0;
      for (const row of fellowRows) {
        if (row.status === "active") activeFellows = row.count;
        if (row.status === "alumni") alumniFellows = row.count;
      }

      const hubProgramsList = await db
        .select()
        .from(hubPrograms)
        .where(eq(hubPrograms.tenantId, tenantId));

      let onTrack = 0;
      let needsAttention = 0;
      let atRisk = 0;

      for (const row of hubProgramsList) {
        const counts = lookupProgramCounts(maps.countsMap, row.title) ?? {
          activeFellows: 0,
          alumniFellows: 0,
          totalFellows: 0,
        };
        const health = computeProgramHealth({
          programStatus: row.status as "active" | "completed" | "planned",
          activeFellows: counts.activeFellows,
          targetFellows: row.targetFellows ?? 0,
          fillRate: (row.targetFellows ?? 0) > 0
            ? Math.round((counts.activeFellows / (row.targetFellows ?? 1)) * 100)
            : null,
          checkInRate: lookupByProgramTitle(maps.checkInMap, row.title)?.checkInRate ?? null,
          placementRate: lookupByProgramTitle(maps.placementMap, row.title)?.placementRate ?? null,
          activeFellowsWithCheckIns: lookupByProgramTitle(maps.checkInMap, row.title)?.submitted ?? 0,
          activeFellowsWithPlacements: lookupByProgramTitle(maps.placementMap, row.title)?.placed ?? 0,
        });

        if (health.health === "on_track" || health.health === "completed" || health.health === "getting_started") {
          onTrack += 1;
        } else if (health.health === "needs_attention") {
          needsAttention += 1;
        } else if (health.health === "at_risk") {
          atRisk += 1;
        }
      }

      return {
        totalPrograms,
        activePrograms,
        activeFellows,
        alumniFellows,
        totalFellows: activeFellows + alumniFellows,
        healthSummary: { onTrack, needsAttention, atRisk },
      };
    }),

  list: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [rows, maps] = await Promise.all([
        db
          .select()
          .from(hubPrograms)
          .where(eq(hubPrograms.tenantId, tenantId))
          .orderBy(asc(hubPrograms.sortOrder), asc(hubPrograms.title)),
        loadProgramMaps(tenantId),
      ]);

      return {
        items: rows.map((row) =>
          mapProgram(
            row,
            lookupProgramCounts(maps.countsMap, row.title) ?? {
              activeFellows: 0,
              alumniFellows: 0,
              totalFellows: 0,
            },
            lookupByProgramTitle(maps.checkInMap, row.title),
            lookupByProgramTitle(maps.placementMap, row.title),
          ),
        ),
      };
    }),

  create: protectedProcedure
    .input(programInputSchema.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const title = input.title.trim();
      const slug = slugifyTitle(title);
      if (!slug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Program title must contain letters or numbers" });
      }

      try {
        const [created] = await db
          .insert(hubPrograms)
          .values({
            tenantId,
            title,
            slug,
            description: input.description?.trim() || null,
            status: input.status,
            targetFellows: input.targetFellows ?? 0,
            startYear: input.startYear ?? null,
            sortOrder: input.sortOrder ?? 0,
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create program" });
        }

        return mapProgram(created, { activeFellows: 0, alumniFellows: 0, totalFellows: 0 }, undefined, undefined);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create program";
        if (message.includes("hub_programs_tenant_title_idx") || message.includes("hub_programs_tenant_slug_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A program with this title already exists in this hub" });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  update: protectedProcedure
    .input(
      programInputSchema.partial().extend({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubPrograms.findFirst({
        where: and(eq(hubPrograms.id, input.id), eq(hubPrograms.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const patch: Partial<typeof hubPrograms.$inferInsert> = {
        updatedAt: new Date(),
      };

      let nextTitle = existing.title;
      if (input.title !== undefined) {
        nextTitle = input.title.trim();
        patch.title = nextTitle;
        patch.slug = slugifyTitle(nextTitle);
      }
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.status !== undefined) patch.status = input.status;
      if (input.targetFellows !== undefined) patch.targetFellows = input.targetFellows;
      if (input.startYear !== undefined) patch.startYear = input.startYear ?? null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      try {
        const [updated] = await db
          .update(hubPrograms)
          .set(patch)
          .where(and(eq(hubPrograms.id, input.id), eq(hubPrograms.tenantId, tenantId)))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
        }

        if (input.title !== undefined && nextTitle !== existing.title) {
          await db
            .update(fellows)
            .set({ program: nextTitle, updatedAt: new Date() })
            .where(and(eq(fellows.tenantId, tenantId), eq(fellows.program, existing.title)));
        }

        const maps = await loadProgramMaps(tenantId);
        return mapProgram(
          updated,
          lookupProgramCounts(maps.countsMap, updated.title) ?? {
            activeFellows: 0,
            alumniFellows: 0,
            totalFellows: 0,
          },
          lookupByProgramTitle(maps.checkInMap, updated.title),
          lookupByProgramTitle(maps.placementMap, updated.title),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update program";
        if (message.includes("hub_programs_tenant_title_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A program with this title already exists in this hub" });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubPrograms.findFirst({
        where: and(eq(hubPrograms.id, input.id), eq(hubPrograms.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const linked = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(fellows)
        .where(and(eq(fellows.tenantId, tenantId), eq(fellows.program, existing.title)));

      if ((linked[0]?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete a program that still has fellows assigned. Reassign or remove fellows first.",
        });
      }

      const [deleted] = await db
        .delete(hubPrograms)
        .where(and(eq(hubPrograms.id, input.id), eq(hubPrograms.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      return { success: true };
    }),
});
