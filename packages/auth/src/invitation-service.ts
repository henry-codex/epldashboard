import { createHash, randomBytes } from "node:crypto";
import { configureAuditTransaction, writeAudit } from "@epl-fellows-platform/db/audit";
import type { AuditAction } from "@epl-fellows-platform/db/audit-policy";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import { invitations, tenants, userTenants, activityLog, type AccessTransaction, type TransactionalDatabase } from "@epl-fellows-platform/db";
import { resolveAccess } from "./access-policy";
import { lockMfaAccount, revokeMfaSessions } from "./mfa-store";
import { user } from "@epl-fellows-platform/db/schema/auth";
import { profileNameSchema, newPasswordSchema } from "./account-policy";
import { InvitationError } from "./invitation-error";
import { canIssueInvitation, assignableInvitationRoles, inviteInputSchema, invitationRoleLabels, invitationRoleSchema, invitationTokenSchema, INVITATION_TTL_MS, RESEND_COOLDOWN_MS, type InviteInput, type InvitationRole } from "./invitation-policy";

type InvitationRow = typeof invitations.$inferSelect;
type Actor = { role: string; tenantId: string; countryCode: string | null };
type Options = {
  database: TransactionalDatabase;
  frontendURL: string;
  createUser: (tx: AccessTransaction, input: { name: string; email: string; password: string }) => Promise<{ id: string }>;
  sendEmail: (data: { to: string; name: string; hubName: string; roleLabel: string; url: string }) => Promise<unknown>;
};
type HubInput = { name: string; slug: string; countryCode: string; settings: Record<string, unknown> };
type Delivery = { row: InvitationRow; token: string; hubName: string };
const managerRoles = ["country_admin"];
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const badLink = "This invitation link is invalid or has been replaced. Ask your administrator for a new invitation.";

export function withAccessTransaction<T>(database: TransactionalDatabase, action: (tx: AccessTransaction) => Promise<T>) {
  return database.transaction(async (tx) => {
    await configureAuditTransaction(tx);
    // All invitation and membership writes share this lock. Recheck authorization after acquiring it.
    // Administration is low volume; one lock also protects last-admin and cross-email acceptance races.
    await tx.execute(sql`select pg_advisory_xact_lock(158610, 2026)`);
    return action(tx);
  });
}
function publicInvitation(row: InvitationRow, tenantName: string) {
  return {
    id: row.id, name: row.name, email: row.email, role: row.role as InvitationRole,
    tenantId: row.tenantId, tenantName, issuerId: row.issuerId,
    status: row.status === "pending" && row.expiresAt.getTime() <= Date.now() ? "expired" as const : row.status,
    expiresAt: row.expiresAt, deliveryStatus: row.deliveryStatus, sentAt: row.sentAt,
    resendAvailableAt: new Date(row.lastAttemptAt.getTime() + RESEND_COOLDOWN_MS),
    createdAt: row.createdAt,
  };
}
async function actorFor(tx: AccessTransaction, actorId: string): Promise<Actor> {
  const memberships = await tx.select({ role: userTenants.role, tenantId: userTenants.tenantId, countryCode: tenants.countryCode, isActive: tenants.isActive })
    .from(userTenants).innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(and(eq(userTenants.userId, actorId), eq(tenants.isActive, true)));
  const access = resolveAccess(memberships);
  const actor = memberships.find(m => m.role === access.role && m.tenantId === access.tenantId);
  if (!actor || !assignableInvitationRoles(actor.role).length) throw new InvitationError("FORBIDDEN", "Your account cannot manage invitations.");
  return actor;
}
async function audit(tx: AccessTransaction, tenantId: string, eventType: string, metadata: Record<string, unknown>) {
  const [legacy] = await tx.insert(activityLog).values({ tenantId, eventType, metadata }).returning({ id: activityLog.id });
  const targetId = String(metadata.invitationId ?? metadata.membershipId ?? metadata.userId ?? "");
  const recipient = metadata.userId ? await tx.query.user.findFirst({ where: eq(user.id, String(metadata.userId)) }) : null;
  const invitation = metadata.invitationId ? await tx.query.invitations.findFirst({ where: eq(invitations.id, String(metadata.invitationId)) }) : null;
  await writeAudit(tx, { action: eventType as AuditAction, category: "access", actorId: String(metadata.actorId),
    tenantId, targetType: eventType.split(".")[0]!, targetId, targetLabel: recipient?.name ?? invitation?.name,
    before: metadata.previousRole ? { role: metadata.previousRole, tenantId: metadata.previousTenantId ?? tenantId } : undefined,
    after: { role: metadata.role ?? null, tenantId: metadata.nextTenantId ?? tenantId }, legacyId: legacy?.id });

}

export function createInvitationService(options: Options) {
  const database = options.database;
  const transact = <T>(action: (tx: AccessTransaction) => Promise<T>) => withAccessTransaction(database, action);
  async function hubFor(tx: AccessTransaction, tenantId: string, role?: string) {
    const hub = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!hub?.isActive) throw new InvitationError("BAD_REQUEST", "This hub is unavailable. Contact a platform administrator.");
    if (role === "tenant_admin" && hub.countryCode !== "GLOBAL") throw new InvitationError("BAD_REQUEST", "Tenant Admin belongs to EPL Global Platform. Select that workspace.");
    if (role === "tenant_admin") {
      const globals = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.countryCode, "GLOBAL"));
      if (globals.length !== 1 || globals[0]?.id !== hub.id) throw new InvitationError("CONFLICT", "EPL Global Platform must be unique. Contact a Super Admin.");
    }
    if (role === "country_admin" && hub.countryCode === "GLOBAL") throw new InvitationError("BAD_REQUEST", "Country Admin requires an active country hub.");
    return hub.countryCode === "GLOBAL" ? { ...hub, name: "EPL Global Platform" } : hub;
  }
  async function recipientAvailable(tx: AccessTransaction, email: string) {
    const account = await tx.query.user.findFirst({ where: eq(user.email, email) });
    if (account && await tx.query.userTenants.findFirst({ where: eq(userTenants.userId, account.id) })) {
      throw new InvitationError("CONFLICT", "This account already has assigned access. Ask a platform administrator to change its role or remove its current assignment first.");
    }
    return account;
  }
  async function expirePending(tx: AccessTransaction, email: string) {
    await tx.update(invitations).set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(invitations.email, email), eq(invitations.status, "pending"), lte(invitations.expiresAt, new Date())));
  }
  async function issueWithin(tx: AccessTransaction, actorId: string, input: InviteInput): Promise<Delivery> {
    const actor = await actorFor(tx, actorId);
    const hub = await hubFor(tx, input.tenantId, input.role);
    if (!canIssueInvitation(actor, input.role, input.tenantId, hub.countryCode)) throw new InvitationError("FORBIDDEN", "You cannot grant this role in this workspace.");
    await recipientAvailable(tx, input.email);
    await expirePending(tx, input.email);
    if (await tx.query.invitations.findFirst({ where: and(eq(invitations.email, input.email), eq(invitations.status, "pending")) })) {
      throw new InvitationError("CONFLICT", "An invitation is already pending for this email. Resend or cancel it first.");
    }
    const token = randomBytes(32).toString("base64url");
    const [row] = await tx.insert(invitations).values({
      ...input, issuerId: actorId, tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    }).returning();
    if (!row) throw new Error("Invitation insert failed");
    await audit(tx, row.tenantId, "invitation.created", { actorId, invitationId: row.id, role: row.role });
    return { row, token, hubName: hub.name };
  }
  async function deliver(ticket: Delivery) {
    const url = new URL("/accept-invitation", options.frontendURL);
    url.searchParams.set("token", ticket.token);
    let deliveryStatus: "sent" | "failed" = "sent";
    try {
      await options.sendEmail({ to: ticket.row.email, name: ticket.row.name, hubName: ticket.hubName,
        roleLabel: invitationRoleLabels[ticket.row.role as InvitationRole], url: url.toString() });
    } catch { deliveryStatus = "failed"; }
    // A delayed SMTP result must not overwrite a newer resend or a cancelled/accepted invitation.
    await database.transaction(async (tx) => {
      await tx.update(invitations).set({
        deliveryStatus, sentAt: deliveryStatus === "sent" ? new Date() : null, updatedAt: new Date(),
      }).where(and(eq(invitations.id, ticket.row.id), eq(invitations.tokenHash, ticket.row.tokenHash), eq(invitations.status, "pending")));
      await writeAudit(tx, { action: "invitation.email_submitted", category: "access", outcome: deliveryStatus === "sent" ? "success" : "failed",
        tenantId: ticket.row.tenantId, targetType: "invitation", targetId: ticket.row.id, targetLabel: ticket.row.name });
    });
    console.info(deliveryStatus === "sent" ? "Invitation email accepted by SMTP" : "Invitation email sending failed");
    const row = await database.query.invitations.findFirst({ where: eq(invitations.id, ticket.row.id) });
    if (!row) throw new Error("Invitation disappeared");
    return publicInvitation(row, ticket.hubName);
  }
  async function invitationFor(tx: AccessTransaction, token: string) {
    if (!invitationTokenSchema.safeParse(token).success) throw new InvitationError("BAD_REQUEST", badLink);
    const row = await tx.query.invitations.findFirst({ where: eq(invitations.tokenHash, hashToken(token)) });
    if (!row) throw new InvitationError("BAD_REQUEST", badLink);
    if (row.status === "accepted") throw new InvitationError("BAD_REQUEST", "This invitation has already been accepted. Sign in to your account.");
    if (row.status === "cancelled") throw new InvitationError("BAD_REQUEST", "This invitation was cancelled. Ask your administrator for a new invitation.");
    if (row.status === "expired" || row.expiresAt.getTime() <= Date.now()) throw new InvitationError("BAD_REQUEST", "This invitation has expired. Ask your administrator to resend it.");
    const actor = await actorFor(tx, row.issuerId);
    const hub = await hubFor(tx, row.tenantId, row.role);
    if (!canIssueInvitation(actor, row.role, row.tenantId, hub.countryCode)) throw new InvitationError("FORBIDDEN", "The issuer can no longer grant this access. Ask a current administrator for a new invitation.");
    return { row, hub };
  }
  async function managedInvitation(tx: AccessTransaction, actorId: string, id: string) {
    const actor = await actorFor(tx, actorId);
    const row = await tx.query.invitations.findFirst({ where: eq(invitations.id, id) });
    if (!row) throw new InvitationError("FORBIDDEN", "You cannot manage this invitation.");
    const hub = await hubFor(tx, row.tenantId, row.role);
    if (!canIssueInvitation(actor, row.role, row.tenantId, hub.countryCode)) throw new InvitationError("FORBIDDEN", "You cannot manage this invitation.");
    return row;
  }

  return {
    actorAccess: (actorId: string) => transact((tx) => actorFor(tx, actorId)),
    invitationOptions: (actorId: string) => transact(async tx => {
      const actor = await actorFor(tx, actorId);
      const hubs = await tx.select().from(tenants).where(eq(tenants.isActive, true));
      return assignableInvitationRoles(actor.role).map(role => ({ role,
        workspaces: hubs.filter(hub => canIssueInvitation(actor, role, hub.id, hub.countryCode)).map(hub => ({
          id: hub.id, name: hub.countryCode === "GLOBAL" ? "EPL Global Platform" : hub.name,
          kind: hub.countryCode === "GLOBAL" ? "global" as const : "country" as const,
        })),
      }));
    }),
    async issue(actorId: string, input: InviteInput) {
      return deliver(await transact((tx) => issueWithin(tx, actorId, inviteInputSchema.parse(input))));
    },
    async createWithHub(actorId: string, hubInput: HubInput, recipient: { name: string; email: string }) {
      const ticket = await transact(async (tx) => {
        if ((await actorFor(tx, actorId)).role !== "super_admin") throw new InvitationError("FORBIDDEN", "Only platform administrators can create hubs.");
        if (await tx.query.tenants.findFirst({ where: eq(tenants.countryCode, hubInput.countryCode) })) throw new InvitationError("CONFLICT", "A hub already exists for this country.");
        const [hub] = await tx.insert(tenants).values({ ...hubInput, isActive: true }).returning();
        if (!hub) throw new Error("Hub insert failed");
        const delivery = await issueWithin(tx, actorId, inviteInputSchema.parse({ ...recipient, tenantId: hub.id, role: "country_admin" }));
        return { hub, delivery };
      });
      const invitation = await deliver(ticket.delivery);
      return { hub: ticket.hub, invitation };
    },
    async list(actorId: string) {
      return transact(async (tx) => {
        const actor = await actorFor(tx, actorId);
        const rows = await tx.select({ invitation: invitations, tenantName: tenants.name, countryCode: tenants.countryCode, isActive: tenants.isActive }).from(invitations)
          .innerJoin(tenants, eq(invitations.tenantId, tenants.id))
          .where(actor.role === "super_admin" || actor.role === "tenant_admin" ? undefined : eq(invitations.tenantId, actor.tenantId))
          .orderBy(desc(invitations.createdAt));
        return rows.filter(({ invitation, countryCode, isActive }) => actor.role === "super_admin" || (isActive && canIssueInvitation(actor, invitation.role, invitation.tenantId, countryCode)))
          .map(({ invitation, tenantName, countryCode }) => publicInvitation(invitation, countryCode === "GLOBAL" ? "EPL Global Platform" : tenantName));
      });
    },
    async resend(actorId: string, id: string) {
      const ticket = await transact(async (tx) => {
        const row = await managedInvitation(tx, actorId, id);
        if (row.status !== "pending" && row.status !== "expired") throw new InvitationError("BAD_REQUEST", "Only pending or expired invitations can be resent.");
        if (Date.now() - row.lastAttemptAt.getTime() < RESEND_COOLDOWN_MS) throw new InvitationError("TOO_MANY_REQUESTS", "Wait 60 seconds between invitation emails.");
        const hub = await hubFor(tx, row.tenantId, row.role);
        await recipientAvailable(tx, row.email);
        await expirePending(tx, row.email);
        if (await tx.query.invitations.findFirst({ where: and(eq(invitations.email, row.email), eq(invitations.status, "pending"), ne(invitations.id, row.id)) })) throw new InvitationError("CONFLICT", "A newer invitation is pending. Manage that invitation instead.");
        const token = randomBytes(32).toString("base64url");
        const [updated] = await tx.update(invitations).set({
          tokenHash: hashToken(token), issuerId: actorId, status: "pending",
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS), lastAttemptAt: new Date(),
          deliveryStatus: "pending", sentAt: null, updatedAt: new Date(),
        }).where(eq(invitations.id, id)).returning();
        if (!updated) throw new Error("Invitation update failed");
        await audit(tx, row.tenantId, "invitation.resent", { actorId, invitationId: id });
        return { row: updated, token, hubName: hub.name };
      });
      return deliver(ticket);
    },
    async cancel(actorId: string, id: string) {
      return transact(async (tx) => {
        const row = await managedInvitation(tx, actorId, id);
        if (row.status === "accepted") throw new InvitationError("BAD_REQUEST", "This invitation was already accepted. Manage the user's membership instead.");
        if (row.status !== "cancelled") {
          await tx.update(invitations).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(invitations.id, id));
          await audit(tx, row.tenantId, "invitation.cancelled", { actorId, invitationId: id });
        }
        return { success: true };
      });
    },
    async preview(token: string) {
      return transact(async (tx) => {
        const { row, hub } = await invitationFor(tx, token);
        const account = await recipientAvailable(tx, row.email);
        return { name: row.name, email: row.email, role: row.role, tenantName: hub.name,
          expiresAt: row.expiresAt, requiresSignIn: Boolean(account) };
      });
    },
    async accept(token: string, input: { name?: string; password?: string }, signedInUserId?: string) {
      return transact(async (tx) => {
        const { row } = await invitationFor(tx, token);
        const existing = await recipientAvailable(tx, row.email);
        let userId: string;
        if (existing) {
          if (!signedInUserId) throw new InvitationError("UNAUTHORIZED", "Sign in with the invited email before accepting.");
          if (signedInUserId !== existing.id) throw new InvitationError("FORBIDDEN", "You are signed in with a different account. Switch to the invited account.");
          userId = existing.id;
        } else {
          if (signedInUserId) throw new InvitationError("FORBIDDEN", "Sign out of your current account before creating the invited account.");
          const name = profileNameSchema.safeParse(input.name);
          const password = newPasswordSchema.safeParse(input.password);
          if (!name.success) throw new InvitationError("BAD_REQUEST", "Name must contain 1–100 characters.");
          if (!password.success) throw new InvitationError("BAD_REQUEST", "Password must contain 8–128 characters.");
          userId = (await options.createUser(tx, { name: name.data, email: row.email, password: password.data })).id;
        }
        await tx.update(user).set({ emailVerified: true, updatedAt: new Date() }).where(eq(user.id, userId));
        await tx.insert(userTenants).values({ userId, tenantId: row.tenantId, role: row.role, permissions: {} });
        await tx.update(invitations).set({ status: "accepted", acceptedBy: userId, acceptedAt: new Date(), updatedAt: new Date() }).where(eq(invitations.id, row.id));
        await audit(tx, row.tenantId, "invitation.accepted", { actorId: userId, issuerId: row.issuerId, invitationId: row.id, role: row.role });
        return { existingAccount: Boolean(existing) };
      });
    },
    async changeMembership(actorId: string, id: string, nextRole: InvitationRole | null, destinationTenantId?: string) {
      return transact(async (tx) => {
        if ((await actorFor(tx, actorId)).role !== "super_admin") throw new InvitationError("FORBIDDEN", "Only platform administrators can change roles or remove access.");
        const target = await tx.query.userTenants.findFirst({ where: eq(userTenants.id, id) });
        if (!target) throw new InvitationError("NOT_FOUND", "This membership no longer exists.");
        await lockMfaAccount(tx, target.userId);
        if (target.role === nextRole && (!destinationTenantId || destinationTenantId === target.tenantId)) return { success: true };
        if (target.userId === actorId) throw new InvitationError("FORBIDDEN", "You cannot remove or change your own access.");
        if (nextRole !== null && !invitationRoleSchema.safeParse(nextRole).success) throw new InvitationError("BAD_REQUEST", "Unsupported role.");
        const all = await tx.select().from(userTenants);
        if (target.role === "super_admin" && nextRole !== "super_admin" && !all.some((m) => m.id !== id && m.role === "super_admin")) throw new InvitationError("CONFLICT", "The last super admin cannot be removed.");
        const hub = await tx.query.tenants.findFirst({ where: eq(tenants.id, target.tenantId) });
        let nextTenantId = target.tenantId;
        if (nextRole === "tenant_admin") {
          const globals = await tx.select().from(tenants).where(eq(tenants.countryCode, "GLOBAL"));
          if (globals.length !== 1 || !globals[0]?.isActive) throw new InvitationError("CONFLICT", "EPL Global Platform must be active and unique.");
          nextTenantId = globals[0].id;
          if (destinationTenantId && destinationTenantId !== nextTenantId) throw new InvitationError("BAD_REQUEST", "Tenant Admin belongs to EPL Global Platform.");
        } else if (nextRole && target.role === "tenant_admin" && nextRole !== "super_admin") {
          if (!destinationTenantId) throw new InvitationError("BAD_REQUEST", "Select an active country hub for this role.");
          const destination = await hubFor(tx, destinationTenantId);
          if (destination.countryCode === "GLOBAL") throw new InvitationError("BAD_REQUEST", "Select an active country hub for this role.");
          nextTenantId = destination.id;
        } else if (destinationTenantId && destinationTenantId !== target.tenantId) {
          throw new InvitationError("BAD_REQUEST", "Hub transfers are supported only when entering or leaving Tenant Admin.");
        }
        if (nextRole) await hubFor(tx, nextTenantId, nextRole);
        if (nextTenantId !== target.tenantId && all.some(m => m.id !== id && m.userId === target.userId && m.tenantId === nextTenantId)) throw new InvitationError("CONFLICT", "This account already has access in the destination workspace. Resolve that membership first.");
        if (hub?.isActive && hub.countryCode !== "GLOBAL" && (managerRoles.includes(target.role) || target.role === "tenant_admin") && (nextTenantId !== target.tenantId || !managerRoles.includes(nextRole ?? ""))
          && !all.some((m) => m.id !== id && m.tenantId === target.tenantId && managerRoles.includes(m.role))) {
          throw new InvitationError("CONFLICT", "Add another Country Admin before moving or removing this hub's last manager.");
        }
        if (nextRole === null) await tx.delete(userTenants).where(eq(userTenants.id, id));
        else await tx.update(userTenants).set({ role: nextRole, tenantId: nextTenantId, permissions: {} }).where(eq(userTenants.id, id));
        await revokeMfaSessions(tx, target.userId);
        await audit(tx, hub?.countryCode === "GLOBAL" || nextRole === "tenant_admin" ? (nextRole === "tenant_admin" ? nextTenantId : target.tenantId) : target.tenantId, nextRole === null ? "membership.removed" : "membership.role_changed",
          { actorId, userId: target.userId, membershipId: id, previousRole: target.role, role: nextRole, previousTenantId: target.tenantId, nextTenantId: nextRole === null ? null : nextTenantId });
        return { success: true };
      });
    },
  };
}
export type InvitationService = ReturnType<typeof createInvitationService>;
