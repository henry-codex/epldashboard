import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL || "";

// Managed Postgres hosts (Heroku, etc.) require SSL but present a
// self-signed cert; local/docker-compose Postgres has no SSL listener at
// all. Mirrors the same rule applied to the app's own connection in
// packages/db/src/index.ts.
const isLocalHost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
const connectionUrl =
  !isLocalHost && databaseUrl && !databaseUrl.includes("sslmode=")
    ? `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}sslmode=no-verify`
    : databaseUrl;

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
});
