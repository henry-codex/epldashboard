import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db, hubPrograms } from "@epl-fellows-platform/db";

export async function assertTenantProgram(tenantId: string, programTitle: string) {
  const title = programTitle.trim();
  if (!title) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Program is required" });
  }

  const program = await db.query.hubPrograms.findFirst({
    where: and(eq(hubPrograms.tenantId, tenantId), eq(hubPrograms.title, title)),
  });

  if (!program) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `"${title}" is not a program run by this country hub`,
    });
  }

  return program;
}
