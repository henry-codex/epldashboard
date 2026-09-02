import { env } from "@epl-fellows-platform/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

const connectionString = env.DATABASE_URL;

export const db = connectionString.includes("neon.tech")
  ? drizzleNeon(neon(connectionString), { schema })
  : drizzlePg(postgres(connectionString), { schema });

export * from "./rls.js";
export * from "./schema/index.js";


