import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, fellows, hubPartners } from "@epl-fellows-platform/db";

export type HubOrgKind = "placement" | "partner";

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Live count of active fellows serving at each placement institution (Network "where they serve"). */
export async function livePartnerFellowCounts(tenantId: string, kind: HubOrgKind = "placement") {
  const [partnerRows, fellowRows] = await Promise.all([
    db
      .select({
        id: hubPartners.id,
        name: hubPartners.name,
        status: hubPartners.status,
        kind: hubPartners.kind,
        partnerType: hubPartners.partnerType,
      })
      .from(hubPartners)
      .where(and(eq(hubPartners.tenantId, tenantId), eq(hubPartners.kind, kind))),
    kind === "placement"
      ? db
          .select({
            status: fellows.status,
            customFields: fellows.customFields,
          })
          .from(fellows)
          .where(eq(fellows.tenantId, tenantId))
      : Promise.resolve([] as { status: string; customFields: unknown }[]),
  ]);

  const byId = new Map(partnerRows.map((p) => [p.id, p]));
  const byName = new Map(partnerRows.map((p) => [normalizeName(p.name), p.id]));
  const counts = new Map<string, number>();

  for (const row of fellowRows) {
    if (row.status !== "active") continue;
    const custom = (row.customFields ?? {}) as Record<string, unknown>;
    const partnerIdRaw = custom.service_partner_id;
    let partnerId =
      typeof partnerIdRaw === "string" && partnerIdRaw.trim() && byId.has(partnerIdRaw.trim())
        ? partnerIdRaw.trim()
        : null;

    if (!partnerId) {
      const orgName = custom.service_organization;
      if (typeof orgName === "string" && orgName.trim()) {
        partnerId = byName.get(normalizeName(orgName)) ?? null;
      }
    }

    if (!partnerId) continue;
    counts.set(partnerId, (counts.get(partnerId) ?? 0) + 1);
  }

  return { partnerRows, counts };
}

/** Recount and persist active fellows serving at each placement institution. */
export async function syncPartnerFellowCounts(tenantId: string) {
  const { partnerRows, counts } = await livePartnerFellowCounts(tenantId, "placement");
  if (partnerRows.length === 0) return counts;

  await Promise.all(
    partnerRows.map((partner) =>
      db
        .update(hubPartners)
        .set({
          fellowCount: counts.get(partner.id) ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(hubPartners.id, partner.id)),
    ),
  );

  return counts;
}

export async function assertTenantPartner(tenantId: string, partnerId: string) {
  const row = await db.query.hubPartners.findFirst({
    where: and(
      eq(hubPartners.id, partnerId),
      eq(hubPartners.tenantId, tenantId),
      eq(hubPartners.kind, "placement"),
    ),
  });
  if (!row) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a placement institution from this hub's Placement Institutions list",
    });
  }
  return row;
}
