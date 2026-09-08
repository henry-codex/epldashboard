import { z } from "zod";
import { auditSavepoint } from "@epl-fellows-platform/db/audit";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db,
  fellows,
  networkFieldDefs,
  placements,
  hubPartners,
  hubPrograms,
  hubCohorts,
  checkIns,
  activityLog,
  tenants,
} from "@epl-fellows-platform/db";
import {
  COUNTRY_IMPORT_PROFILES,
  detectCountryProfile,
  isBlockingRow,
} from "@epl-fellows-platform/db/lib/country-import-profiles";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager, isNetworkManager } from "../lib/network-access.js";
import { assertTenantProgram } from "../lib/program-access.js";
import { parseCsv, serializeCsv } from "../lib/csv.js";
import { countBreakdown, formatStatusLabel, normalizeGender, parseDisabilityValue } from "../lib/demographics.js";
import { assertTenantPartner, syncPartnerFellowCounts, normalizeName, canonicalizeInstitutionNames } from "../lib/partner-stats.js";
import { parseCohortNumber } from "../lib/cohort-stats.js";
import { FELLOW_STATUSES, type FellowStatus } from "../lib/fellow-status.js";

const fellowStatusSchema = z.enum(FELLOW_STATUSES);
const fieldTypeSchema = z.enum(["text", "number", "date", "select", "boolean"]);

const SERVICE_KEYS = [
  "service_organization",
  "service_role",
  "service_city",
  "service_region",
  "service_partner_id",
] as const;

type ServiceLocationInput = {
  serviceOrganization?: string | null;
  serviceRole?: string | null;
  serviceCity?: string | null;
  serviceRegion?: string | null;
  servicePartnerId?: string | null;
};

function parseServiceLocation(customFields: Record<string, unknown>) {
  const read = (key: (typeof SERVICE_KEYS)[number]) => {
    const raw = customFields[key];
    if (raw === undefined || raw === null || raw === "") return null;
    return String(raw).trim() || null;
  };
  return {
    serviceOrganization: read("service_organization"),
    serviceRole: read("service_role"),
    serviceCity: read("service_city"),
    serviceRegion: read("service_region"),
    servicePartnerId: read("service_partner_id"),
  };
}

function applyServiceLocation(
  customFields: Record<string, unknown>,
  input: ServiceLocationInput,
) {
  const pairs: Array<[(typeof SERVICE_KEYS)[number], string | null | undefined]> = [
    ["service_organization", input.serviceOrganization],
    ["service_role", input.serviceRole],
    ["service_city", input.serviceCity],
    ["service_region", input.serviceRegion],
    ["service_partner_id", input.servicePartnerId],
  ];
  for (const [key, value] of pairs) {
    if (value === undefined) continue;
    const trimmed = value?.trim() ?? "";
    if (trimmed) customFields[key] = trimmed;
    else delete customFields[key];
  }
  return customFields;
}

// Flags and profile details captured on import that don't (yet) have a
// dedicated column — kept as reserved customFields keys, same pattern as
// has_disability, so they survive updates and are editable like any other
// first-class field.
const BOOLEAN_RESERVED_KEYS = ["has_disability", "is_idp", "is_mcf_scholar"] as const;
const STRING_RESERVED_KEYS = ["qualification", "university"] as const;

function pickReservedCustomFields(customFields: Record<string, unknown>) {
  const reserved: Record<string, unknown> = {};
  for (const key of BOOLEAN_RESERVED_KEYS) {
    if (key in customFields) reserved[key] = customFields[key];
  }
  for (const key of STRING_RESERVED_KEYS) {
    if (key in customFields) reserved[key] = customFields[key];
  }
  for (const key of SERVICE_KEYS) {
    if (key in customFields) reserved[key] = customFields[key];
  }
  return reserved;
}

function mapPlacement(row: typeof placements.$inferSelect) {
  return {
    id: row.id,
    fellowId: row.fellowId,
    institution: row.institution,
    department: row.department,
    roleTitle: row.roleTitle,
    country: row.country,
    city: row.city,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent ?? false,
  };
}

const placementInputSchema = z.object({
  institution: z.string().min(1).max(200),
  department: z.string().max(200).optional(),
  roleTitle: z.string().min(1).max(200),
  country: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
});

const CORE_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "status",
  "cohortYear",
  "program",
  "phone",
  "nationality",
  "gender",
  "hasDisability",
  "isMcf",
  "externalId",
] as const;

function slugifyKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function mapFellow(row: typeof fellows.$inferSelect) {
  const customFields = (row.customFields ?? {}) as Record<string, unknown>;
  const service = parseServiceLocation(customFields);
  return {
    id: row.id,
    tenantId: row.tenantId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    gender: row.gender,
    cohortYear: row.cohortYear,
    program: row.program,
    status: row.status as FellowStatus,
    isMcf: row.isMcf ?? false,
    customFields,
    ...service,
    externalId: row.externalId,
    source: row.source,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFieldDef(row: typeof networkFieldDefs.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    key: row.key,
    label: row.label,
    fieldType: row.fieldType as "text" | "number" | "date" | "select" | "boolean",
    options: (row.options ?? []) as string[],
    required: row.required ?? false,
    sortOrder: row.sortOrder ?? 0,
  };
}

function parseBool(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function validateCustomFields(
  defs: Array<{ key: string; label: string; fieldType: string; required: boolean | null; options: unknown }>,
  values: Record<string, unknown>,
) {
  const errors: string[] = [];
  for (const def of defs) {
    const raw = values[def.key];
    const empty = raw === undefined || raw === null || raw === "";
    if (def.required && empty) {
      errors.push(`${def.label} is required`);
      continue;
    }
    if (empty) continue;

    if (def.fieldType === "number" && Number.isNaN(Number(raw))) {
      errors.push(`${def.label} must be a number`);
    }
    if (def.fieldType === "boolean" && typeof raw !== "boolean" && !["true", "false", "1", "0", "yes", "no"].includes(String(raw).toLowerCase())) {
      errors.push(`${def.label} must be true or false`);
    }
    if (def.fieldType === "select") {
      const options = Array.isArray(def.options) ? def.options.map(String) : [];
      if (options.length && !options.includes(String(raw))) {
        errors.push(`${def.label} must be one of: ${options.join(", ")}`);
      }
    }
  }
  return errors;
}

function normalizeCustomFields(
  defs: Array<{ key: string; fieldType: string }>,
  values: Record<string, unknown>,
) {
  const normalized: Record<string, unknown> = {};
  for (const def of defs) {
    const raw = values[def.key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (def.fieldType === "number") normalized[def.key] = Number(raw);
    else if (def.fieldType === "boolean") normalized[def.key] = parseBool(String(raw));
    else normalized[def.key] = String(raw);
  }
  return normalized;
}

const fellowInputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  nationality: z.string().max(80).optional(),
  gender: z.string().max(40).optional(),
  hasDisability: z.boolean().optional(),
  isIdp: z.boolean().optional(),
  isMcfScholar: z.boolean().optional(),
  qualification: z.string().max(200).optional().nullable(),
  university: z.string().max(200).optional().nullable(),
  serviceOrganization: z.string().max(200).optional().nullable(),
  serviceRole: z.string().max(200).optional().nullable(),
  serviceCity: z.string().max(120).optional().nullable(),
  serviceRegion: z.string().max(120).optional().nullable(),
  servicePartnerId: z.string().uuid().optional().nullable(),
  cohortYear: z.number().int().min(2000).max(2100),
  program: z.string().min(1).max(120),
  status: fellowStatusSchema,
  isMcf: z.boolean().optional().default(false),
  externalId: z.string().max(120).optional(),
  customFields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const fellowsRouter = router({
  aggregates: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [statusRows, mcfRow] = await Promise.all([
        db
          .select({
            status: fellows.status,
            count: sql<number>`count(*)::int`,
          })
          .from(fellows)
          .where(eq(fellows.tenantId, tenantId))
          .groupBy(fellows.status),
        db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(fellows)
          .where(
            and(
              eq(fellows.tenantId, tenantId),
              inArray(fellows.status, ["active", "incoming"]),
              eq(fellows.isMcf, true),
            ),
          ),
      ]);

      let activeFellows = 0;
      let alumniLeaders = 0;
      let inactiveFellows = 0;
      let incomingFellows = 0;
      for (const row of statusRows) {
        if (row.status === "active") activeFellows = row.count;
        if (row.status === "alumni") alumniLeaders = row.count;
        if (row.status === "inactive") inactiveFellows = row.count;
        if (row.status === "incoming") incomingFellows = row.count;
      }

      return {
        activeFellows,
        alumniLeaders,
        inactiveFellows,
        incomingFellows,
        mcfFellows: mcfRow[0]?.count ?? 0,
        totalNetwork: activeFellows + alumniLeaders,
      };
    }),

  demographics: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const rows = await db
        .select({
          gender: fellows.gender,
          status: fellows.status,
          cohortYear: fellows.cohortYear,
          program: fellows.program,
          isMcf: fellows.isMcf,
          customFields: fellows.customFields,
        })
        .from(fellows)
        .where(eq(fellows.tenantId, tenantId));

      const gender = countBreakdown(rows.map((row) => normalizeGender(row.gender)));
      const disability = countBreakdown(
        rows.map((row) => parseDisabilityValue((row.customFields ?? {}) as Record<string, unknown>)),
      );
      const currentRows = rows.filter((row) => row.status === "active" || row.status === "incoming");
      // Scoped to the current roster (active + incoming) — matches what the
      // Network page's default view and its "worth watching" stats actually
      // count, rather than blending in historical alumni.
      const currentGender = countBreakdown(currentRows.map((row) => normalizeGender(row.gender)));
      const currentDisability = countBreakdown(
        currentRows.map((row) => parseDisabilityValue((row.customFields ?? {}) as Record<string, unknown>)),
      );
      const status = countBreakdown(rows.map((row) => formatStatusLabel(row.status)));
      const programs = countBreakdown(
        rows.map((row) => row.program?.trim() || "Not specified"),
      );
      const mcfFellows = rows.filter((row) => row.isMcf).length;
      const mcf = countBreakdown(
        rows.map((row) => (row.isMcf ? "Mastercard Foundation" : "Other fellows")),
      );
      // The per-person scholar flag from the sheet's own "Mastercard Scholar"
      // column — distinct from isMcf, which is a cohort-wide funding
      // assumption and can mark every fellow in a cohort "Yes" even when
      // only some of them are individually designated scholars.
      const currentScholars = currentRows.filter(
        (row) => (row.customFields as Record<string, unknown> | null)?.is_mcf_scholar === true,
      ).length;
      const cohortMap = new Map<number | null, number>();
      for (const row of rows) {
        cohortMap.set(row.cohortYear, (cohortMap.get(row.cohortYear) ?? 0) + 1);
      }
      const cohorts = [...cohortMap.entries()]
        .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
        .map(([year, count]) => ({ name: year != null ? String(year) : "Unspecified", count }));

      return {
        gender,
        disability,
        currentGender,
        currentDisability,
        status,
        programs,
        mcf,
        mcfFellows,
        currentScholars,
        cohorts,
        total: rows.length,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        search: z.string().max(120).optional(),
        status: z.union([fellowStatusSchema, z.array(fellowStatusSchema).min(1)]).optional(),
        cohortYear: z.number().int().min(2000).max(2100).optional(),
        sort: z.enum(["name_asc", "name_desc", "newest"]).optional().default("name_asc"),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!isNetworkManager(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to view this network roster",
        });
      }

      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const filters = [eq(fellows.tenantId, tenantId)];
      if (Array.isArray(input.status)) filters.push(inArray(fellows.status, input.status));
      else if (input.status) filters.push(eq(fellows.status, input.status));
      if (input.cohortYear !== undefined) filters.push(eq(fellows.cohortYear, input.cohortYear));
      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(fellows.firstName, q),
            ilike(fellows.lastName, q),
            ilike(fellows.email, q),
            ilike(fellows.program, q),
          )!,
        );
      }

      const where = and(...filters);
      const order =
        input.sort === "newest"
          ? [desc(fellows.updatedAt)]
          : input.sort === "name_desc"
            ? [desc(fellows.lastName), desc(fellows.firstName)]
            : [asc(fellows.lastName), asc(fellows.firstName)];

      const [rows, countRow] = await Promise.all([
        db
          .select()
          .from(fellows)
          .where(where)
          .orderBy(...order)
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(fellows)
          .where(where),
      ]);

      return {
        items: rows.map(mapFellow),
        total: countRow[0]?.count ?? 0,
      };
    }),

  create: protectedProcedure
    .input(
      fellowInputSchema.extend({
        tenantId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const defs = await db
        .select()
        .from(networkFieldDefs)
        .where(eq(networkFieldDefs.tenantId, tenantId))
        .orderBy(asc(networkFieldDefs.sortOrder));

      const customErrors = validateCustomFields(defs, input.customFields);
      if (customErrors.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: customErrors.join("; ") });
      }

      await assertTenantProgram(tenantId, input.program);

      let serviceInput: ServiceLocationInput = input;
      if (input.servicePartnerId) {
        const partner = await assertTenantPartner(tenantId, input.servicePartnerId);
        serviceInput = {
          ...input,
          servicePartnerId: partner.id,
          serviceOrganization: partner.name,
          serviceRegion: input.serviceRegion?.trim() || partner.region || null,
        };
      } else if (input.servicePartnerId === null) {
        serviceInput = { ...input, servicePartnerId: null, serviceOrganization: null };
      }

      const customFields = applyServiceLocation(
        {
          ...normalizeCustomFields(defs, input.customFields),
          ...(input.hasDisability !== undefined ? { has_disability: input.hasDisability } : {}),
          ...(input.isIdp !== undefined ? { is_idp: input.isIdp } : {}),
          ...(input.isMcfScholar !== undefined ? { is_mcf_scholar: input.isMcfScholar } : {}),
          ...(input.qualification ? { qualification: input.qualification.trim() } : {}),
          ...(input.university ? { university: input.university.trim() } : {}),
        },
        serviceInput,
      );

      try {
        const [created] = await db
          .insert(fellows)
          .values({
            tenantId,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email: input.email.trim().toLowerCase(),
            phone: input.phone?.trim() || null,
            nationality: input.nationality?.trim() || null,
            gender: input.gender?.trim() || null,
            cohortYear: input.cohortYear,
            program: input.program.trim(),
            status: "active",
            isMcf: input.isMcf,
            externalId: input.externalId?.trim() || null,
            customFields,
            source: "manual",
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create fellow" });
        }

        await syncPartnerFellowCounts(tenantId);
        return mapFellow(created);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create fellow";
        if (message.includes("fellows_tenant_email_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A fellow with this email already exists in this hub" });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  update: protectedProcedure
    .input(
      fellowInputSchema.partial().extend({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.fellows.findFirst({
        where: and(eq(fellows.id, input.id), eq(fellows.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
      }

      const defs = await db
        .select()
        .from(networkFieldDefs)
        .where(eq(networkFieldDefs.tenantId, tenantId))
        .orderBy(asc(networkFieldDefs.sortOrder));

      const mergedCustom = {
        ...((existing.customFields ?? {}) as Record<string, unknown>),
        ...(input.customFields ?? {}),
      };
      const customErrors = validateCustomFields(defs, mergedCustom);
      if (customErrors.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: customErrors.join("; ") });
      }

      const patch: Partial<typeof fellows.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.firstName !== undefined) patch.firstName = input.firstName.trim();
      if (input.lastName !== undefined) patch.lastName = input.lastName.trim();
      if (input.email !== undefined) patch.email = input.email.trim().toLowerCase();
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.nationality !== undefined) patch.nationality = input.nationality?.trim() || null;
      if (input.gender !== undefined) patch.gender = input.gender?.trim() || null;
      if (input.cohortYear !== undefined) patch.cohortYear = input.cohortYear;
      if (input.program !== undefined) {
        await assertTenantProgram(tenantId, input.program);
        patch.program = input.program.trim();
      }
      if (input.status !== undefined) patch.status = input.status;
      if (input.isMcf !== undefined) patch.isMcf = input.isMcf;
      if (input.externalId !== undefined) patch.externalId = input.externalId?.trim() || null;
      if (
        input.customFields !== undefined ||
        input.hasDisability !== undefined ||
        input.isIdp !== undefined ||
        input.isMcfScholar !== undefined ||
        input.qualification !== undefined ||
        input.university !== undefined ||
        input.serviceOrganization !== undefined ||
        input.serviceRole !== undefined ||
        input.serviceCity !== undefined ||
        input.serviceRegion !== undefined ||
        input.servicePartnerId !== undefined
      ) {
        let serviceInput: ServiceLocationInput = input;
        if (input.servicePartnerId) {
          const partner = await assertTenantPartner(tenantId, input.servicePartnerId);
          serviceInput = {
            ...input,
            servicePartnerId: partner.id,
            serviceOrganization: partner.name,
            serviceRegion:
              input.serviceRegion !== undefined
                ? input.serviceRegion
                : partner.region ?? null,
          };
        } else if (input.servicePartnerId === null) {
          serviceInput = {
            ...input,
            servicePartnerId: null,
            serviceOrganization: null,
          };
        }

        const existingCustom = (existing.customFields ?? {}) as Record<string, unknown>;
        const reservedOverride = (key: string, value: boolean | string | null | undefined) => {
          if (value !== undefined) return { [key]: value };
          if (key in existingCustom) return { [key]: existingCustom[key] };
          return {};
        };
        patch.customFields = applyServiceLocation(
          {
            ...pickReservedCustomFields(existingCustom),
            ...normalizeCustomFields(defs, mergedCustom),
            ...reservedOverride("has_disability", input.hasDisability),
            ...reservedOverride("is_idp", input.isIdp),
            ...reservedOverride("is_mcf_scholar", input.isMcfScholar),
            ...reservedOverride("qualification", input.qualification?.trim() || undefined),
            ...reservedOverride("university", input.university?.trim() || undefined),
          },
          serviceInput,
        );
      }

      try {
        const [updated] = await db
          .update(fellows)
          .set(patch)
          .where(and(eq(fellows.id, input.id), eq(fellows.tenantId, tenantId)))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
        }

        await syncPartnerFellowCounts(tenantId);
        return mapFellow(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update fellow";
        if (message.includes("fellows_tenant_email_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A fellow with this email already exists in this hub" });
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

      const [deleted] = await db
        .delete(fellows)
        .where(and(eq(fellows.id, input.id), eq(fellows.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
      }

      await syncPartnerFellowCounts(tenantId);
      return { success: true };
    }),

  /**
   * Clears this hub's imported network data so an import can be redone from
   * scratch. Deliberately scoped to one tenant and gated on the hub name
   * being typed back, because it is not recoverable.
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        confirmHubName: z.string().min(1),
        includeInstitutions: z.boolean().optional().default(false),
        includeCohorts: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Country hub not found" });
      }
      if (input.confirmHubName.trim().toLowerCase() !== tenant.name.trim().toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type the hub name exactly ("${tenant.name}") to confirm clearing its network data`,
        });
      }

      // Ordered to respect foreign keys: check-ins -> activity -> placements -> fellows.
      const checkInRows = await db.delete(checkIns).where(eq(checkIns.tenantId, tenantId)).returning();
      const activityRows = await db.delete(activityLog).where(eq(activityLog.tenantId, tenantId)).returning();
      const placementRows = await db.delete(placements).where(eq(placements.tenantId, tenantId)).returning();
      const fellowRows = await db.delete(fellows).where(eq(fellows.tenantId, tenantId)).returning();

      let institutionsDeleted = 0;
      if (input.includeInstitutions) {
        const rows = await db
          .delete(hubPartners)
          .where(and(eq(hubPartners.tenantId, tenantId), eq(hubPartners.kind, "placement")))
          .returning();
        institutionsDeleted = rows.length;
      }

      let cohortsDeleted = 0;
      if (input.includeCohorts) {
        const rows = await db.delete(hubCohorts).where(eq(hubCohorts.tenantId, tenantId)).returning();
        cohortsDeleted = rows.length;
      }

      return {
        fellowsDeleted: fellowRows.length,
        placementsDeleted: placementRows.length,
        checkInsDeleted: checkInRows.length,
        activityDeleted: activityRows.length,
        institutionsDeleted,
        cohortsDeleted,
      };
    }),

  transitionStatus: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
        status: fellowStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.fellows.findFirst({
        where: and(eq(fellows.id, input.id), eq(fellows.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
      }

      if (existing.status === input.status) {
        return mapFellow(existing);
      }

      const [updated] = await db
        .update(fellows)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(fellows.id, input.id), eq(fellows.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
      }

      await syncPartnerFellowCounts(tenantId);
      return mapFellow(updated);
    }),

  bulkTransitionStatus: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
        status: fellowStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const updated = await db
        .update(fellows)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(fellows.tenantId, tenantId), inArray(fellows.id, input.ids)))
        .returning();

      await syncPartnerFellowCounts(tenantId);
      return { updated: updated.length };
    }),

  importCsv: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), csv: z.string().min(1).max(2_000_000) }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const defs = await db
        .select()
        .from(networkFieldDefs)
        .where(eq(networkFieldDefs.tenantId, tenantId))
        .orderBy(asc(networkFieldDefs.sortOrder));

      const { headers, rows } = parseCsv(input.csv);
      if (!headers.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CSV is empty or missing a header row" });
      }

      const errors: { row: number; message: string }[] = [];

      // Two accepted shapes:
      //  1. The platform's own column names (firstName/lastName/status/...)
      //  2. A country's raw roster export, recognized by its own headers
      //     (Ghana's "Fellow/Cohort/Placement Organisation", Sierra Leone's
      //     "Full Name/Cohort/Host", etc.) and translated server-side, so a
      //     country team can upload the file exactly as they export it.
      const hasCanonicalHeaders = ["firstName", "lastName", "status", "program"].every((h) =>
        headers.includes(h),
      );
      const countryProfile = hasCanonicalHeaders ? null : detectCountryProfile(headers);

      if (!hasCanonicalHeaders && !countryProfile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Unrecognized CSV format. Upload either a country roster export this platform knows " +
            `(${COUNTRY_IMPORT_PROFILES.map((p) => p.label).join(", ")}) or a file with the standard ` +
            "columns: firstName, lastName, status, program.",
        });
      }

      type PreparedRow = {
        rowNum: number;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        nationality: string | null;
        gender: string | null;
        cohortYear: number | null;
        cohortLabel: string | null;
        /** null = fall back to this hub's program when it has exactly one */
        program: string | null;
        status: FellowStatus;
        isMcf: boolean;
        externalId: string | null;
        customFields: Record<string, unknown>;
        rawInstitution: string | null;
      };

      const prepared: PreparedRow[] = [];

      if (countryProfile) {
        for (const person of countryProfile.transform(rows)) {
          if (isBlockingRow(person)) {
            errors.push({ row: person.sourceRow, message: person.warnings.join("; ") || "Could not identify this row" });
            continue;
          }
          const customFields: Record<string, unknown> = {};
          if (person.hasDisability != null) customFields.has_disability = person.hasDisability;
          if (person.isIdp != null) customFields.is_idp = person.isIdp;
          if (person.isMcfScholar != null) customFields.is_mcf_scholar = person.isMcfScholar;
          if (person.qualification) customFields.qualification = person.qualification;
          if (person.university) customFields.university = person.university;
          if (person.cohortLabel) customFields.source_cohort_label = person.cohortLabel;

          prepared.push({
            rowNum: person.sourceRow,
            firstName: person.firstName,
            lastName: person.lastName || person.firstName,
            email: person.email,
            phone: person.phone,
            nationality: null,
            gender: person.gender,
            cohortYear: person.cohortYear,
            cohortLabel: person.cohortLabel,
            program: null,
            status: person.status,
            isMcf: person.isMcf,
            externalId: person.externalId,
            customFields,
            rawInstitution: person.placementInstitution,
          });
        }
      } else {
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i]!;
          const rowNum = i + 2;

          const statusParsed = fellowStatusSchema.safeParse(row.status?.trim());
          if (!statusParsed.success) {
            errors.push({ row: rowNum, message: `Invalid status (use ${FELLOW_STATUSES.join(", ")})` });
            continue;
          }

          let cohortYear: number | null = null;
          if (row.cohortYear?.trim()) {
            const parsed = Number.parseInt(row.cohortYear, 10);
            if (Number.isNaN(parsed)) {
              errors.push({ row: rowNum, message: "cohortYear must be a number" });
              continue;
            }
            cohortYear = parsed;
          }

          const customValues: Record<string, unknown> = {};
          for (const def of defs) {
            if (row[def.key] !== undefined && row[def.key] !== "") {
              customValues[def.key] = row[def.key];
            }
          }
          if (row.hasDisability !== undefined && row.hasDisability !== "") {
            customValues.has_disability = parseBool(row.hasDisability);
          }

          const customErrors = validateCustomFields(defs, customValues);
          if (customErrors.length) {
            errors.push({ row: rowNum, message: customErrors.join("; ") });
            continue;
          }

          const firstName = row.firstName?.trim() ?? "";
          const lastName = row.lastName?.trim() ?? "";
          if (!firstName || !lastName) {
            errors.push({ row: rowNum, message: "Missing required core fields" });
            continue;
          }

          prepared.push({
            rowNum,
            firstName,
            lastName,
            email: row.email?.trim().toLowerCase() || null,
            phone: row.phone?.trim() || null,
            nationality: row.nationality?.trim() || null,
            gender: row.gender?.trim() || null,
            cohortYear,
            cohortLabel: row.cohortLabel?.trim() || null,
            program: row.program?.trim() || null,
            status: statusParsed.data,
            isMcf: parseBool(row.isMcf),
            externalId: row.externalId?.trim() || null,
            customFields: normalizeCustomFields(defs, customValues),
            rawInstitution: row.institution?.trim() || null,
          });
        }
      }

      // A raw country export has no "program" column — fall back to this
      // hub's program when there's exactly one, rather than asking anyone
      // to hand-edit their file.
      let defaultProgram: string | null = null;
      if (prepared.some((p) => !p.program)) {
        const programs = await db.query.hubPrograms.findMany({ where: eq(hubPrograms.tenantId, tenantId) });
        if (programs.length === 1) {
          defaultProgram = programs[0]!.title;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              programs.length === 0
                ? "Add a program for this hub before importing, so fellows can be assigned to it."
                : "This hub has more than one program, so the program can't be inferred. Add a 'program' column naming the right one for each row.",
          });
        }
      }

      const institutionCanonical = canonicalizeInstitutionNames([
        ...new Set(prepared.map((p) => p.rawInstitution).filter((v): v is string => !!v)),
      ]);
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      const activePartnerCounts = new Map<string, { name: string; count: number }>();

      // Cohorts are a first-class thing in the source data (Cohort 1 = 2025,
      // Cohort 2 = 2026, …). Accumulate them here so the import creates the
      // cohort records too, with demographics derived from the real people —
      // otherwise fellows land with a bare year and nothing to group them by.
      type CohortAccumulator = {
        label: string;
        year: number;
        total: number;
        alumni: number;
        active: number;
        incoming: number;
        male: number;
        female: number;
        pwd: number;
        idp: number;
        scholar: number;
        isMcf: boolean;
      };
      const cohortAcc = new Map<number, CohortAccumulator>();

      let created = 0;
      let updated = 0;

      for (const row of prepared) {
        const rowNum = row.rowNum;
        const countsBeforeRow = { created, updated };

        try {
          await auditSavepoint(async () => {
          const canonicalInstitution = row.rawInstitution
            ? institutionCanonical.get(row.rawInstitution)!
            : null;

          const payload = {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            nationality: row.nationality,
            gender: row.gender,
            cohortYear: row.cohortYear,
            program: row.program ?? defaultProgram ?? "",
            status: row.status,
            isMcf: row.isMcf,
            externalId: row.externalId,
            customFields: {
              ...row.customFields,
              // Matched against hubPartners by name in partner-stats.ts, so
              // the app's own live partner fellow-count sync stays correct.
              ...(canonicalInstitution ? { service_organization: canonicalInstitution } : {}),
            },
            source: "csv" as const,
            lastSyncedAt: new Date(),
          };

          try {
            await assertTenantProgram(tenantId, payload.program);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid program";
            errors.push({ row: rowNum, message });
            return;
          }

          let existing = null as typeof fellows.$inferSelect | null | undefined;
          if (payload.externalId) {
            existing = await db.query.fellows.findFirst({
              where: and(eq(fellows.tenantId, tenantId), eq(fellows.externalId, payload.externalId)),
            });
          }
          if (!existing && payload.email) {
            existing = await db.query.fellows.findFirst({
              where: and(eq(fellows.tenantId, tenantId), eq(fellows.email, payload.email)),
            });
          }

          let fellowId: string;
          if (existing) {
            await db
              .update(fellows)
              .set({
                ...payload,
                updatedAt: new Date(),
              })
              .where(eq(fellows.id, existing.id));
            fellowId = existing.id;
            updated += 1;
          } else {
            const [inserted] = await db.insert(fellows).values({
              tenantId,
              ...payload,
            }).returning();
            fellowId = inserted!.id;
            created += 1;
          }

          if (canonicalInstitution) {
            // "isCurrent" is what the app's UI shows as "retained" — true
            // only means something for an active fellow (their present
            // service location is a known fact from the roster). For an
            // alumnus, whether that institution kept them on afterward is
            // a real unknown until the program confirms it — null, not a
            // default "yes". Looked up without filtering on isCurrent so a
            // re-import updates the same row instead of duplicating it.
            const isRetentionKnown = row.status === "active" ? true : null;
            const existingPlacement = await db.query.placements.findFirst({
              where: and(eq(placements.tenantId, tenantId), eq(placements.fellowId, fellowId)),
            });
            if (existingPlacement) {
              await db
                .update(placements)
                .set({ institution: canonicalInstitution, isCurrent: isRetentionKnown })
                .where(eq(placements.id, existingPlacement.id));
            } else {
              await db.insert(placements).values({
                tenantId,
                fellowId,
                institution: canonicalInstitution,
                country: tenant?.name ?? "",
                isCurrent: isRetentionKnown,
              });
            }

            if (payload.status === "active") {
              const key = normalizeName(canonicalInstitution);
              const entry = activePartnerCounts.get(key);
              if (entry) entry.count += 1;
              else activePartnerCounts.set(key, { name: canonicalInstitution, count: 1 });
            }
          }

          if (row.cohortYear != null) {
            const acc =
              cohortAcc.get(row.cohortYear) ??
              {
                label: row.cohortLabel ?? `Cohort ${row.cohortYear}`,
                year: row.cohortYear,
                total: 0, alumni: 0, active: 0, incoming: 0,
                male: 0, female: 0, pwd: 0, idp: 0, scholar: 0,
                isMcf: false,
              };
            acc.total += 1;
            if (row.status === "alumni") acc.alumni += 1;
            if (row.status === "active") acc.active += 1;
            if (row.status === "incoming") acc.incoming += 1;
            const gender = row.gender?.trim().toLowerCase();
            if (gender?.startsWith("m")) acc.male += 1;
            if (gender?.startsWith("f")) acc.female += 1;
            if (row.customFields.has_disability === true) acc.pwd += 1;
            if (row.customFields.is_idp === true) acc.idp += 1;
            if (row.customFields.is_mcf_scholar === true) acc.scholar += 1;
            if (row.isMcf) acc.isMcf = true;
            cohortAcc.set(row.cohortYear, acc);
          }
          });
        } catch (err: unknown) {
          created = countsBeforeRow.created; updated = countsBeforeRow.updated;
          const message = err instanceof Error ? err.message : "Import failed";
          errors.push({ row: rowNum, message });
        }
      }

      // Placement institutions ("Partners" list), from ACTIVE fellows in
      // this import only — alumni's historical placements don't need a
      // live institution record. Matches any partner already created
      // manually by normalized name instead of duplicating it.
      let partnersCreated = 0;
      let partnersUpdated = 0;
      if (activePartnerCounts.size > 0) {
        const existingPartners = await db.query.hubPartners.findMany({
          where: and(eq(hubPartners.tenantId, tenantId), eq(hubPartners.kind, "placement")),
        });
        const existingByKey = new Map(existingPartners.map((p) => [normalizeName(p.name), p]));

        for (const [key, entry] of activePartnerCounts) {
          const existingPartner = existingByKey.get(key);
          if (existingPartner) {
            await db.update(hubPartners).set({ fellowCount: entry.count, updatedAt: new Date() }).where(eq(hubPartners.id, existingPartner.id));
            partnersUpdated += 1;
          } else {
            await db.insert(hubPartners).values({
              tenantId,
              name: entry.name,
              kind: "placement",
              status: "active",
              fellowCount: entry.count,
            });
            partnersCreated += 1;
          }
        }
      }

      // Cohort records, derived from the people just imported. Counts and
      // demographics are recomputed from the real rows; anything a country
      // manager set by hand (label, dates, notes, attrition) is left alone.
      let cohortsCreated = 0;
      let cohortsUpdated = 0;
      if (cohortAcc.size > 0) {
        const existingCohorts = await db.query.hubCohorts.findMany({
          where: eq(hubCohorts.tenantId, tenantId),
        });
        const byYear = new Map(
          existingCohorts.filter((c) => c.cohortYear != null).map((c) => [c.cohortYear!, c]),
        );

        for (const [year, acc] of cohortAcc) {
          const derived = {
            startedCount: acc.total,
            graduatedCount: acc.alumni,
            maleCount: acc.male,
            femaleCount: acc.female,
            pwdCount: acc.pwd,
            idpCount: acc.idp,
            scholarCount: acc.scholar,
            isMcf: acc.isMcf,
            status: acc.active > 0 || acc.incoming > 0 ? "in_progress" : "completed",
            updatedAt: new Date(),
          };

          const existingCohort = byYear.get(year);
          if (existingCohort) {
            await db.update(hubCohorts).set(derived).where(eq(hubCohorts.id, existingCohort.id));
            cohortsUpdated += 1;
          } else {
            await db.insert(hubCohorts).values({
              tenantId,
              label: acc.label,
              cohortNumber: parseCohortNumber(acc.label),
              cohortYear: year,
              sortOrder: year,
              ...derived,
            });
            cohortsCreated += 1;
          }
        }
      }

      return {
        created,
        updated,
        errors,
        partnersCreated,
        partnersUpdated,
        cohortsCreated,
        cohortsUpdated,
      };
    }),

  exportCsv: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [rows, defs] = await Promise.all([
        db.select().from(fellows).where(eq(fellows.tenantId, tenantId)).orderBy(asc(fellows.lastName), asc(fellows.firstName)),
        db
          .select()
          .from(networkFieldDefs)
          .where(eq(networkFieldDefs.tenantId, tenantId))
          .orderBy(asc(networkFieldDefs.sortOrder)),
      ]);

      const customKeys = defs.map((d) => d.key);
      const headers = [...CORE_HEADERS, ...customKeys];

      const csvRows = rows.map((row) => {
        const custom = (row.customFields ?? {}) as Record<string, unknown>;
        const record: Record<string, string> = {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email ?? "",
          status: row.status,
          cohortYear: row.cohortYear != null ? String(row.cohortYear) : "",
          program: row.program,
          phone: row.phone ?? "",
          nationality: row.nationality ?? "",
          gender: row.gender ?? "",
          isMcf: row.isMcf ? "true" : "false",
          hasDisability: custom.has_disability === true ? "true" : custom.has_disability === false ? "false" : "",
          externalId: row.externalId ?? "",
        };
        for (const key of customKeys) {
          const value = custom[key];
          record[key] = value === undefined || value === null ? "" : String(value);
        }
        return record;
      });

      return {
        filename: `network-export-${tenantId.slice(0, 8)}.csv`,
        csv: serializeCsv([...headers], csvRows),
      };
    }),

  placement: router({
    getCurrent: protectedProcedure
      .input(z.object({ tenantId: z.string().uuid(), fellowId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        if (!isNetworkManager(ctx.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to view retention records",
          });
        }
        const tenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, tenantId);

        const row = await db.query.placements.findFirst({
          where: and(
            eq(placements.tenantId, tenantId),
            eq(placements.fellowId, input.fellowId),
            eq(placements.isCurrent, true),
          ),
        });

        return row ? mapPlacement(row) : null;
      }),

    upsertCurrent: protectedProcedure
      .input(
        placementInputSchema.extend({
          tenantId: z.string().uuid(),
          fellowId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertNetworkManager(ctx);
        const tenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, tenantId);

        const fellow = await db.query.fellows.findFirst({
          where: and(eq(fellows.id, input.fellowId), eq(fellows.tenantId, tenantId)),
        });
        if (!fellow) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
        }

        const existing = await db.query.placements.findFirst({
          where: and(
            eq(placements.tenantId, tenantId),
            eq(placements.fellowId, input.fellowId),
            eq(placements.isCurrent, true),
          ),
        });

        const values = {
          institution: input.institution.trim(),
          department: input.department?.trim() || null,
          roleTitle: input.roleTitle.trim(),
          country: input.country.trim(),
          city: input.city.trim(),
          startDate: input.startDate,
          endDate: input.endDate?.trim() || null,
          isCurrent: true,
        };

        if (existing) {
          const [updated] = await db
            .update(placements)
            .set(values)
            .where(eq(placements.id, existing.id))
            .returning();
          if (!updated) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update retention record" });
          }
          return mapPlacement(updated);
        }

        const [created] = await db
          .insert(placements)
          .values({
            tenantId,
            fellowId: input.fellowId,
            ...values,
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create retention record" });
        }
        return mapPlacement(created);
      }),

    clearCurrent: protectedProcedure
      .input(z.object({ tenantId: z.string().uuid(), fellowId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        assertNetworkManager(ctx);
        const tenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, tenantId);

        await db
          .update(placements)
          .set({ isCurrent: false, endDate: new Date().toISOString().slice(0, 10) })
          .where(
            and(
              eq(placements.tenantId, tenantId),
              eq(placements.fellowId, input.fellowId),
              eq(placements.isCurrent, true),
            ),
          );

        return { success: true };
      }),
  }),

  fields: router({
    list: protectedProcedure
      .input(z.object({ tenantId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
      if (!isNetworkManager(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to view network field definitions",
        });
      }
        const tenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, tenantId);

        const rows = await db
          .select()
          .from(networkFieldDefs)
          .where(eq(networkFieldDefs.tenantId, tenantId))
          .orderBy(asc(networkFieldDefs.sortOrder), asc(networkFieldDefs.label));

        return rows.map(mapFieldDef);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          tenantId: z.string().uuid(),
          id: z.string().uuid().optional(),
          label: z.string().min(1).max(80),
          key: z.string().min(1).max(48).optional(),
          fieldType: fieldTypeSchema,
          options: z.array(z.string()).optional().default([]),
          required: z.boolean().optional().default(false),
          sortOrder: z.number().int().min(0).max(999).optional().default(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertNetworkManager(ctx);
        const tenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, tenantId);

        const key = (input.key?.trim() || slugifyKey(input.label)) || slugifyKey(`field_${Date.now()}`);
        if (!key) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Field key is required" });
        }

        if (input.id) {
          const [updated] = await db
            .update(networkFieldDefs)
            .set({
              label: input.label.trim(),
              key,
              fieldType: input.fieldType,
              options: input.options,
              required: input.required,
              sortOrder: input.sortOrder,
              updatedAt: new Date(),
            })
            .where(and(eq(networkFieldDefs.id, input.id), eq(networkFieldDefs.tenantId, tenantId)))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Field definition not found" });
          }
          return mapFieldDef(updated);
        }

        try {
          const [created] = await db
            .insert(networkFieldDefs)
            .values({
              tenantId,
              key,
              label: input.label.trim(),
              fieldType: input.fieldType,
              options: input.options,
              required: input.required,
              sortOrder: input.sortOrder,
            })
            .returning();

          if (!created) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create field" });
          }
          return mapFieldDef(created);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to create field";
          if (message.includes("network_field_defs_tenant_key_idx") || message.includes("duplicate key")) {
            throw new TRPCError({ code: "CONFLICT", message: "A field with this key already exists" });
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

        const [deleted] = await db
          .delete(networkFieldDefs)
          .where(and(eq(networkFieldDefs.id, input.id), eq(networkFieldDefs.tenantId, tenantId)))
          .returning();

        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Field definition not found" });
        }

        return { success: true };
      }),
  }),
});
