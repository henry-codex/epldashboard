import { env } from "@epl-fellows-platform/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

const connectionString = env.DATABASE_URL;

// Managed Postgres hosts (Heroku, etc.) require SSL but present a
// self-signed cert — "require" negotiates SSL without verifying the CA.
// Local/docker-compose Postgres has no SSL listener at all, so leave it off there.
const isLocalHost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

export const db = connectionString.includes("neon.tech")
  ? drizzleNeon(neon(connectionString), { schema })
  : drizzlePg(postgres(connectionString, isLocalHost ? {} : { ssl: "require" }), { schema });

export * from "./rls.js";
export * from "./schema/index.js";


