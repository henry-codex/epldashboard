import { env } from "@epl-fellows-platform/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";
import { auditStorage } from "./audit";

const connectionString = env.DATABASE_URL;

// Managed Postgres hosts (Heroku, etc.) require SSL but present a
// self-signed cert — "require" negotiates SSL without verifying the CA.
// Local/docker-compose Postgres has no SSL listener at all, so leave it off there.
const isLocalHost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Invitation and access changes need interactive transactions, including on Neon.
export const transactionalDb = drizzlePg(postgres(connectionString, { max: 5, ...(isLocalHost ? {} : { ssl: "require" as const }) }), { schema });
export type TransactionalDatabase = typeof transactionalDb;
export type AccessTransaction = Parameters<Parameters<TransactionalDatabase["transaction"]>[0]>[0];
const readDatabase = connectionString.includes("neon.tech")
  ? drizzleNeon(neon(connectionString), { schema })
  : transactionalDb;
// Business mutations execute against the transaction selected by the API audit middleware.
export const db = new Proxy(readDatabase, { get(target, property) {
  const active = auditStorage.getStore()?.transaction ?? target;
  const value = Reflect.get(active, property);
  return typeof value === "function" ? value.bind(active) : value;
} });

export * from "./rls.js";
export * from "./schema/index.js";


