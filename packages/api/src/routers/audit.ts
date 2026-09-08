import { z } from "zod";
import { and, or, eq, isNotNull, gte, lt, lte, desc, inArray, ilike, sql, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, auditEvents, userTenants, tenants } from "@epl-fellows-platform/db";
import { resolveAccess } from "@epl-fellows-platform/auth/access-policy";
import { retentionCutoff } from "@epl-fellows-platform/db/audit-policy";
import { protectedProcedure, router } from "../index";
const filters = z.object({
  from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  actorId: z.string().max(200).optional(), tenantId: z.string().uuid().optional(),
  action: z.string().max(100).optional(), category: z.enum(["security","access","records","system"]).optional(),
  outcome: z.enum(["success","failed","denied","partial"]).optional(),
  targetType: z.string().max(60).optional(), targetId: z.string().max(200).optional(),
  search: z.string().trim().max(100).optional(),
});
export async function auditScope(userId: string) {
  const memberships = await db.select({ role: userTenants.role, tenantId: userTenants.tenantId, countryCode: tenants.countryCode, isActive: tenants.isActive }).from(userTenants).innerJoin(tenants, eq(userTenants.tenantId, tenants.id)).where(eq(userTenants.userId, userId));
  const access = resolveAccess(memberships);
  if (access.capabilities.manageMemberships) return { global: true, operational: false, hubs: [] as string[] };
  if (access.capabilities.globalOperations) return { global: false, operational: true, globalName: (await db.query.tenants.findFirst({ where: eq(tenants.countryCode, "GLOBAL") }))?.name, hubs: [] as string[] };
  const hubs = [...new Set(memberships.filter((m) => m.isActive && m.role === "country_admin" && m.countryCode !== "GLOBAL").map((m) => m.tenantId))];
  if (!hubs.length) throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can view audit events." });
  return { global: false, operational: false, hubs };
}
async function scopeWhere(userId: string, input: z.infer<typeof filters>, useDefaultRange = true) {
  const access = await auditScope(userId);
  if (input.tenantId && !access.global && !access.operational && !access.hubs.includes(input.tenantId)) throw new TRPCError({ code: "FORBIDDEN", message: "You can only view audit events for hubs you administer." });
  const now = new Date(), cutoff = retentionCutoff(now), start = input.from ?? (useDefaultRange ? new Date(now.getTime() - 30*86400000) : cutoff), end = input.to ?? now;
  if (start > end) throw new TRPCError({ code: "BAD_REQUEST", message: "Start date must be before end date." });
  const clauses: (SQL | undefined)[] = [gte(auditEvents.occurredAt, start < cutoff ? cutoff : start), lte(auditEvents.occurredAt, end),
    access.global ? undefined : access.operational ? or(
      and(isNotNull(auditEvents.tenantId), inArray(auditEvents.category, ["records","access"])),
      // Only explicitly global records: the GLOBAL hub snapshot or successful board records.
      and(eq(auditEvents.category, "records"), or(sql`${auditEvents.details}->>'scope' = 'global'`, eq(auditEvents.tenantName, access.globalName ?? "EPL Global Platform"),
        and(eq(auditEvents.targetType, "alumni_executive"), eq(auditEvents.outcome, "success"))))
    ) : and(inArray(auditEvents.tenantId, access.hubs), inArray(auditEvents.category, ["records","access"])),
    input.tenantId ? eq(auditEvents.tenantId,input.tenantId) : undefined,
    input.actorId ? sql`${auditEvents.actor}->>'id' = ${input.actorId}` : undefined,
    input.action ? eq(auditEvents.action,input.action) : undefined, input.category ? eq(auditEvents.category,input.category) : undefined,
    input.outcome ? eq(auditEvents.outcome,input.outcome) : undefined,
    input.targetType ? eq(auditEvents.targetType,input.targetType) : undefined, input.targetId ? eq(auditEvents.targetId,input.targetId) : undefined];
  if (input.search) {
    const search = "%" + input.search.replace(/[\\%_]/g, (character) => "\\" + character) + "%";
    clauses.push(or(ilike(auditEvents.targetLabel,search), sql`${auditEvents.actor}->>'name' ilike ${search}`));
  }
  return { access, where: and(...clauses) };
}
const dto = (row: typeof auditEvents.$inferSelect) => ({ ...row, occurredAt: row.occurredAt.toISOString() });
export const auditRouter = router({
  list: protectedProcedure.input(filters.extend({ limit: z.number().int().min(1).max(100).default(50), cursor: z.object({ time: z.coerce.date(), id: z.string().uuid(), asOf: z.coerce.date() }).optional() }).default({ limit: 50 }))
    .query(async ({ ctx, input }) => {
      const asOf = input.cursor?.asOf ?? new Date();
      const { where } = await scopeWhere(ctx.session.user.id, input);
      const rows = await db.select().from(auditEvents).where(and(where, lte(auditEvents.occurredAt,asOf),
        input.cursor ? or(lt(auditEvents.occurredAt,input.cursor.time),and(eq(auditEvents.occurredAt,input.cursor.time),lt(auditEvents.id,input.cursor.id))) : undefined))
        .orderBy(desc(auditEvents.occurredAt),desc(auditEvents.id)).limit(input.limit+1);
      const more = rows.length > input.limit, items = rows.slice(0,input.limit), last = items.at(-1);
      return { items: items.map(dto), nextCursor: more && last ? { time: last.occurredAt.toISOString(), id: last.id, asOf: asOf.toISOString() } : null };
    }),
  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { where } = await scopeWhere(ctx.session.user.id, {}, false);
    const [row] = await db.select().from(auditEvents).where(and(where,eq(auditEvents.id,input.id))).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Audit event not found or no longer accessible." });
    return dto(row);
  }),
  filters: protectedProcedure.input(filters.default({})).query(async ({ ctx,input }) => {
    const { where, access } = await scopeWhere(ctx.session.user.id,input);
    const rows = await db.selectDistinct({ actorId: sql<string | null>`${auditEvents.actor}->>'id'`, actorName: sql<string | null>`${auditEvents.actor}->>'name'`,
      tenantId: auditEvents.tenantId, tenantName: auditEvents.tenantName, action: auditEvents.action, category: auditEvents.category, targetType: auditEvents.targetType }).from(auditEvents).where(where);
    const actors = new Map<string,string>(), hubs = new Map<string,string>();
    for (const row of rows) { if(row.actorId) actors.set(row.actorId,row.actorName ?? row.actorId); if(row.tenantId) hubs.set(row.tenantId,row.tenantName ?? row.tenantId); }
    return { global: access.global, operational: access.operational, actors: [...actors].map(([id,name])=>({id,name})), hubs: [...hubs].map(([id,name])=>({id,name})),
      actions: [...new Set(rows.map((r)=>r.action))].sort(), categories: [...new Set(rows.map((r)=>r.category))].sort(), targetTypes: [...new Set(rows.map((r)=>r.targetType))].sort() };
  }),
});
