import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)) });

async function setup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const hostname = new URL(connectionString).hostname;
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  const client = postgres(connectionString, {
    max: 1, connect_timeout: 15, onnotice: () => {},
    ...(local ? {} : { ssl: "require" as const }),
  });
  try {
    const ddl = await readFile(new URL("../../sql/add-invitations.sql", import.meta.url), "utf8");
    await client.begin(async (tx) => {
      await tx`set local lock_timeout = '5s'`;
      await tx`set local statement_timeout = '30s'`;
      await tx.unsafe(ddl).simple();
    });
    console.info("Invitation schema is ready.");
  } finally {
    await client.end({ timeout: 3 });
  }
}

setup().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[0-9A-Z]{5}$/.test(error.code)
    ? error.code : "UNKNOWN";
  console.error("Invitation setup failed. Check database configuration and permissions.", { code });
  process.exitCode = 1;
});
