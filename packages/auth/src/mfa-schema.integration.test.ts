import { afterAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { symmetricEncrypt } from "better-auth/crypto";
import { transactionalDb as database } from "@epl-fellows-platform/db";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("MFA method migration", () => {
  afterAll(async () => database.$client.end({ timeout: 3 }));
  it("backfills existing enrollment and unused codes once without resurrecting disabled methods or used codes", async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !["55432", "15432"].includes(parsed.port) || parsed.pathname !== "/epl_settings_test" || process.env.DATABASE_URL !== url) throw new Error("Use the isolated MFA database.");
    const ddl = await readFile(new URL("../../db/sql/add-mfa.sql", import.meta.url), "utf8");
    const id = randomUUID(), oldCodes = await symmetricEncrypt({ key: "isolated-migration-secret-32-characters", data: JSON.stringify(["unused-one", "unused-two"]) });
    const newCodes = await symmetricEncrypt({ key: "isolated-migration-secret-32-characters", data: JSON.stringify(["unused-two"]) });
    const rollback = new Error("Intentional isolated migration rollback");
    try {
      await database.transaction(async (tx) => {
        await tx.execute(sql`set local client_min_messages = warning`);
        await tx.execute(sql`insert into public."user" (id,name,email,two_factor_enabled) values (${id},'Migration fixture',${id + "@example.test"},true)`);
        await tx.execute(sql`insert into public.two_factor (id,user_id,secret,backup_codes) values (${randomUUID()},${id},'encrypted-test-secret',${oldCodes})`);
        // Reproduce the previous release inside a transaction that always rolls back.
        await tx.execute(sql.raw('alter table public."user" drop column totp_enabled, drop column mfa_backup_codes, drop column mfa_backup_codes_confirmed'));
        await tx.execute(sql.raw(ddl));
        const first = await tx.execute(sql`select totp_enabled, mfa_backup_codes, mfa_backup_codes_confirmed from public."user" where id=${id}`);
        expect(first[0]).toMatchObject({ totp_enabled: true, mfa_backup_codes: oldCodes, mfa_backup_codes_confirmed: true });
        await tx.execute(sql`update public."user" set totp_enabled=false, mfa_backup_codes=${newCodes} where id=${id}`);
        await tx.execute(sql.raw(ddl));
        const repeated = await tx.execute(sql`select totp_enabled, mfa_backup_codes from public."user" where id=${id}`);
        expect(repeated[0]).toMatchObject({ totp_enabled: false, mfa_backup_codes: newCodes });
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    const rows = await database.execute(sql`select id from public."user" where id=${id}`);
    expect(rows).toHaveLength(0);
  });
});
