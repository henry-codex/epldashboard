import "dotenv/config";
import { requestAuditContext, withAuditContext, writeAudit, auditFailure } from "@epl-fellows-platform/db/audit";
import { createAccountInTransaction } from "@epl-fellows-platform/auth";
import { withAccessTransaction } from "@epl-fellows-platform/auth/invitation-service";
import { invitationEmailSchema } from "@epl-fellows-platform/auth/invitation-policy";
import { profileNameSchema, newPasswordSchema } from "@epl-fellows-platform/auth/account-policy";
import { transactionalDb, tenants, userTenants, user } from "@epl-fellows-platform/db";
import { eq } from "drizzle-orm";

async function bootstrapAdmin() {
  const email = invitationEmailSchema.safeParse(process.env.BOOTSTRAP_ADMIN_EMAIL);
  const password = newPasswordSchema.safeParse(process.env.BOOTSTRAP_ADMIN_PASSWORD);
  const name = profileNameSchema.safeParse(process.env.BOOTSTRAP_ADMIN_NAME ?? "Super Admin");
  if (!email.success || !password.success || !name.success) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (8–128 characters). BOOTSTRAP_ADMIN_NAME is optional.");
  }
  await withAccessTransaction(transactionalDb, async (tx) => {
    const current = await tx.query.userTenants.findFirst({ where: eq(userTenants.role, "super_admin") });
    if (current) {
      const account = await tx.query.user.findFirst({ where: eq(user.id, current.userId) });
      if (account?.email === email.data) { console.info("Bootstrap administrator already exists; no changes made."); return; }
      throw new Error("A platform administrator already exists. Use an invitation instead.");
    }
    if (await tx.query.user.findFirst({ where: eq(user.email, email.data) })) {
      throw new Error("This email already has an account. Bootstrap never overwrites or promotes an existing account.");
    }
    let hub = await tx.query.tenants.findFirst({ where: eq(tenants.countryCode, "GLOBAL") });
    if (!hub) [hub] = await tx.insert(tenants).values({ name: "EPL Global Platform", slug: "default", countryCode: "GLOBAL", isActive: true }).returning();
    if (!hub) throw new Error("Could not create the platform workspace.");
    const account = await createAccountInTransaction(tx, { name: name.data, email: email.data, password: password.data });
    await tx.insert(userTenants).values({ userId: account.id, tenantId: hub.id, role: "super_admin", permissions: {} });
    await writeAudit(tx, { action: "system.bootstrap", category: "system", targetType: "account", targetId: account.id, targetLabel: name.data });
    console.info("Bootstrap administrator created. Sign in with the supplied credentials.");
  });
}
const bootstrapOperator = process.env.BOOTSTRAP_OPERATOR?.trim();
const bootstrap = () => {
  if (!bootstrapOperator) throw new Error("Set BOOTSTRAP_OPERATOR to the operator identity.");
  return withAuditContext({ ...requestAuditContext({ source: "cli" }), actor: { kind: "operator", id: bootstrapOperator, name: null, role: null }, procedure: "system.bootstrap" }, async () => {
    try { await bootstrapAdmin(); }
    catch (error) {
      await auditFailure(transactionalDb, { action: "system.bootstrap", category: "system", targetType: "account", outcome: "failed", details: { reasonCode: "BOOTSTRAP_FAILED" } });
      throw error;
    }
  });
};
Promise.resolve().then(bootstrap).then(() => process.exit(0)).catch((error: unknown) => {
  const safeMessages = ["Set BOOTSTRAP_", "A platform administrator", "This email already", "Could not create the platform"];
  console.error(error instanceof Error && safeMessages.some((text) => error.message.startsWith(text))
    ? error.message : "Bootstrap failed. Check database access and configuration. No partial account was committed.");
  process.exit(1);
});
