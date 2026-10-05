import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { transactionalDb as database, invitations } from "@epl-fellows-platform/db";

const connectionString = process.env.TEST_DATABASE_URL;
describe.skipIf(!connectionString)("additive invitation setup", () => {
  beforeAll(() => {
    const url = new URL(connectionString!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || !["55432", "15432"].includes(url.port) || url.pathname !== "/epl_settings_test" || process.env.DATABASE_URL !== connectionString) {
      throw new Error("Schema verification requires the isolated epl_settings_test database on loopback port 55432 or 15432");
    }
  });
  afterAll(async () => { await database.$client.end({ timeout: 2 }); });

  it("creates the missing table with all columns and constraints, and can run twice", async () => {
    const ddl = await readFile(new URL("../../db/sql/add-invitations.sql", import.meta.url), "utf8");
    const [before] = await database.$client`select to_regclass('public.invitations')::oid as oid`;
    const rollback = new Error("Rollback isolated schema verification");
    await expect(database.$client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(158610, 2026)`;
      await tx`set local client_min_messages = 'warning'`;
      // The transaction is always rolled back, restoring any pre-existing test fixtures.
      await tx`drop table if exists public.invitations`;
      await tx.unsafe(ddl).simple();
      await tx.unsafe(ddl).simple();
      const columns = await tx`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'invitations'`;
      expect(columns.map(row => row.column_name).sort()).toEqual(Object.values(getTableColumns(invitations)).map(column => column.name).sort());
      const constraints = await tx`select contype from pg_constraint where conrelid = 'public.invitations'::regclass`;
      expect(constraints.filter(row => row.contype === "f")).toHaveLength(3);
      expect(constraints.filter(row => row.contype === "u")).toHaveLength(1);
      const indexes = await tx`select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'invitations'`;
      expect(indexes.map(row => row.indexname)).toContain("invitations_tenant_idx");
      const pending = indexes.find(row => row.indexname === "invitations_pending_email_idx");
      expect(pending?.indexdef).toContain("UNIQUE");
      expect(pending?.indexdef).toContain("'pending'");
      throw rollback;
    })).rejects.toBe(rollback);
    const [after] = await database.$client`select to_regclass('public.invitations')::oid as oid`;
    expect(after?.oid).toEqual(before?.oid);
  });
});
