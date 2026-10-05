import { createAccountInTransaction } from "../index";
import { withAccessTransaction } from "../invitation-service";
import { db, transactionalDb, tenants, userTenants, user } from "@epl-fellows-platform/db";
import { eq } from "drizzle-orm";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !["55432", "15432"].includes(url.port) || url.pathname !== "/epl_settings_test") {
  throw new Error("This fixture script only runs against epl_settings_test on loopback port 55432 or 15432");
}
const countryId = "00000000-0000-4000-8000-000000000101";
const globalId = "00000000-0000-4000-8000-000000000102";
await db.insert(tenants).values([
  { id: countryId, name: "Ghana Test Hub", slug: "settings-test-ghana", countryCode: "GH", settings: { iso2: "GH", flag: "🇬🇭", color: "#4150A3" } },
  { id: globalId, name: "EPL Test Global", slug: "settings-test-global", countryCode: "GLOBAL" },
]).onConflictDoNothing();
for (const role of ["super_admin", "tenant_admin", "country_admin", "alumni_exec", "fellow", "viewer", "unassigned"]) {
  const email = "settings-" + role + "@example.test";
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) continue;
  await withAccessTransaction(transactionalDb, async (tx) => {
    const result = await createAccountInTransaction(tx, { name: "Settings " + role, email, password: "Settings-test-password-123" });
    if (role !== "unassigned") await tx.insert(userTenants).values({ userId: result.id, tenantId: role === "super_admin" ? globalId : countryId, role, permissions: {} });
  });
}
console.info("Seven isolated settings test accounts are ready");
process.exit(0);
