import { protectedProcedure, publicProcedure, router } from "../index";
import { tenantsRouter } from "./tenants";
import { usersRouter } from "./users";
import { fellowsRouter } from "./fellows";
import { programsRouter } from "./programs";
import { checkInsRouter } from "./check-ins";
import { cohortsRouter } from "./cohorts";
import { partnersRouter } from "./partners";
import { alumniLeadersRouter } from "./alumni-leaders";
import { alumniExecutivesRouter } from "./alumni-executives";
import { eventsRouter } from "./events";
import { platformRouter } from "./platform";
import { db, tenants } from "@epl-fellows-platform/db";
import { eq } from "drizzle-orm";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(async ({ ctx }) => {
    let tenant: {
      id: string;
      name: string;
      slug: string;
      countryCode: string;
      flag: string;
      iso2: string;
      color: string;
    } | null = null;

    if (ctx.tenantId) {
      const row = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
      });
      if (row && row.countryCode !== "GLOBAL") {
        const settings = (row.settings ?? {}) as { flag?: string; color?: string; iso2?: string };
        tenant = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          countryCode: row.countryCode ?? "",
          flag: settings.flag ?? "",
          iso2: settings.iso2 ?? "",
          color: settings.color ?? "#4150A3",
        };
      }
    }

    return {
      message: "This is private",
      user: ctx.session.user,
      role: ctx.role,
      tenantId: ctx.tenantId,
      tenant,
    };
  }),
  tenants: tenantsRouter,
  users: usersRouter,
  fellows: fellowsRouter,
  programs: programsRouter,
  checkIns: checkInsRouter,
  cohorts: cohortsRouter,
  partners: partnersRouter,
  alumniLeaders: alumniLeadersRouter,
  alumniExecutives: alumniExecutivesRouter,
  events: eventsRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;
