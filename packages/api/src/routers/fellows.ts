import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, fellows, networkFieldDefs, placements } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager, isNetworkManager } from "../lib/network-access.js";
import { assertTenantProgram } from "../lib/program-access.js";
import { parseCsv, serializeCsv } from "../lib/csv.js";
import { countBreakdown, formatStatusLabel, normalizeGender, parseDisabilityValue } from "../lib/demographics.js";
import { assertTenantPartner, syncPartnerFellowCounts } from "../lib/partner-stats.js";

const fellowStatusSchema = z.enum(["active", "alumni", "inactive"]);
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

function pickReservedCustomFields(customFields: Record<string, unknown>) {
  const reserved: Record<string, unknown> = {};
  if ("has_disability" in customFields) reserved.has_disability = customFields.has_disability;
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
    status: row.status as "active" | "alumni" | "inactive",
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
              eq(fellows.status, "active"),
              eq(fellows.isMcf, true),
            ),
          ),
      ]);

      let activeFellows = 0;
      let alumniLeaders = 0;
      let inactiveFellows = 0;
      for (const row of statusRows) {
        if (row.status === "active") activeFellows = row.count;
        if (row.status === "alumni") alumniLeaders = row.count;
        if (row.status === "inactive") inactiveFellows = row.count;
      }

      return {
        activeFellows,
        alumniLeaders,
        inactiveFellows,
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
      const status = countBreakdown(rows.map((row) => formatStatusLabel(row.status)));
      const programs = countBreakdown(
        rows.map((row) => row.program?.trim() || "Not specified"),
      );
      const mcfFellows = rows.filter((row) => row.isMcf).length;
      const mcf = countBreakdown(
        rows.map((row) => (row.isMcf ? "Mastercard Foundation" : "Other fellows")),
      );
      const cohortMap = new Map<number, number>();
      for (const row of rows) {
        cohortMap.set(row.cohortYear, (cohortMap.get(row.cohortYear) ?? 0) + 1);
      }
      const cohorts = [...cohortMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ name: String(year), count }));

      return { gender, disability, status, programs, mcf, mcfFellows, cohorts, total: rows.length };
    }),

  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        search: z.string().max(120).optional(),
        status: fellowStatusSchema.optional(),
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
      if (input.status) filters.push(eq(fellows.status, input.status));
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
        patch.customFields = applyServiceLocation(
          {
            ...pickReservedCustomFields(existingCustom),
            ...normalizeCustomFields(defs, mergedCustom),
            ...(input.hasDisability !== undefined
              ? { has_disability: input.hasDisability }
              : "has_disability" in existingCustom
                ? { has_disability: existingCustom.has_disability }
                : {}),
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

      const required = ["firstName", "lastName", "email", "status", "cohortYear", "program"];
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `CSV missing required columns: ${missing.join(", ")}`,
        });
      }

      let created = 0;
      let updated = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        const rowNum = i + 2;

        try {
          const statusParsed = fellowStatusSchema.safeParse(row.status?.trim());
          if (!statusParsed.success) {
            errors.push({ row: rowNum, message: "Invalid status (use active, alumni, or inactive)" });
            continue;
          }

          const cohortYear = Number.parseInt(row.cohortYear ?? "", 10);
          if (Number.isNaN(cohortYear)) {
            errors.push({ row: rowNum, message: "cohortYear must be a number" });
            continue;
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

          const payload = {
            firstName: row.firstName?.trim() ?? "",
            lastName: row.lastName?.trim() ?? "",
            email: row.email?.trim().toLowerCase() ?? "",
            phone: row.phone?.trim() || null,
            nationality: row.nationality?.trim() || null,
            gender: row.gender?.trim() || null,
            cohortYear,
            program: row.program?.trim() ?? "",
            status: statusParsed.data,
            isMcf: parseBool(row.isMcf),
            externalId: row.externalId?.trim() || null,
            customFields: normalizeCustomFields(defs, customValues),
            source: "csv" as const,
            lastSyncedAt: new Date(),
          };

          if (!payload.firstName || !payload.lastName || !payload.email || !payload.program) {
            errors.push({ row: rowNum, message: "Missing required core fields" });
            continue;
          }

          try {
            await assertTenantProgram(tenantId, payload.program);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid program";
            errors.push({ row: rowNum, message });
            continue;
          }

          let existing = null as typeof fellows.$inferSelect | null | undefined;
          if (payload.externalId) {
            existing = await db.query.fellows.findFirst({
              where: and(eq(fellows.tenantId, tenantId), eq(fellows.externalId, payload.externalId)),
            });
          }
          if (!existing) {
            existing = await db.query.fellows.findFirst({
              where: and(eq(fellows.tenantId, tenantId), eq(fellows.email, payload.email)),
            });
          }

          if (existing) {
            await db
              .update(fellows)
              .set({
                ...payload,
                updatedAt: new Date(),
              })
              .where(eq(fellows.id, existing.id));
            updated += 1;
          } else {
            await db.insert(fellows).values({
              tenantId,
              ...payload,
            });
            created += 1;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Import failed";
          errors.push({ row: rowNum, message });
        }
      }

      return { created, updated, errors };
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
          email: row.email,
          status: row.status,
          cohortYear: String(row.cohortYear),
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
