import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)), quiet: true });
async function main() {
  const args = process.argv.slice(2), index = args.indexOf("--operator");
  const operator = index < 0 ? undefined : args[index + 1];
  if (args.includes("--apply") && (!operator || operator.startsWith("--"))) throw new Error("Supply --operator ID when applying the Tenant Admin migration.");
  const { transactionalDb } = await import("../index");
  const { migrateTenantAdmins } = await import("../tenant-admin-migration");
  try {
    const report = await migrateTenantAdmins(transactionalDb, { apply: args.includes("--apply"), operator });
    console.info(JSON.stringify(report, null, 2));
    if (report.blockers.length) process.exitCode = 1;
  } finally { await transactionalDb.$client.end({ timeout: 2 }); }
}
main().catch(error => { console.error(error instanceof Error && error.message.startsWith("Supply ") ? error.message : "Tenant Admin migration failed; no changes were committed."); process.exitCode = 1; });
