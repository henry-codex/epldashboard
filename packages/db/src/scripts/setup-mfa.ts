import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)) });
async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  const client = postgres(url, { max: 1, connect_timeout: 15, onnotice: () => {}, ...(local ? {} : { ssl: "require" as const }) });
  try {
    const ddl = await readFile(new URL("../../sql/add-mfa.sql", import.meta.url), "utf8");
    await client.begin(async (tx) => { await tx`set local lock_timeout = '5s'`; await tx`set local statement_timeout = '30s'`; await tx.unsafe(ddl).simple(); });
    console.info("MFA schema is ready.");
  } finally { await client.end({ timeout: 3 }); }
}
setup().catch(() => { console.error("MFA setup failed. Check database configuration and permissions."); process.exitCode = 1; });
