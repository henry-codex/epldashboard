import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)), quiet: true });
async function main() {
  const { transactionalDb } = await import("../index");
  const { auditSchemaSql, assertAuditSchema } = await import("../audit-schema");
  const { backfillAudit } = await import("../audit-legacy");
  await transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(158610, 2027)`);
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local client_min_messages = 'warning'`);
    await tx.execute(sql.raw(auditSchemaSql));
    const count = await backfillAudit(tx);
    console.info("Audit schema ready; legacy entries copied:", count);
  });
  await assertAuditSchema(transactionalDb);
}
main().then(() => process.exit(0)).catch(() => { console.error("Audit setup failed. Check database connectivity and schema permissions; retry db:setup-audit."); process.exit(1); });
