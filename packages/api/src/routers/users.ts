import { z } from "zod";
import { and, desc, eq, ne } from "drizzle-orm";
import { invitationService, type UserRole } from "@epl-fellows-platform/auth";
import { inviteInputSchema, invitationRoleSchema } from "@epl-fellows-platform/auth/invitation-policy";
import { db, tenants, userTenants } from "@epl-fellows-platform/db";
import { user } from "@epl-fellows-platform/db/schema/auth";
import { router, requirePermission, superAdminProcedure } from "../index";
import { invitationCall } from "../lib/invitation-call";

const idInput = z.object({ id: z.string().uuid() }).strict();
export const usersRouter = router({
  list: requirePermission("users:manage").query(async ({ ctx }) => {
    const actor = await invitationCall(() => invitationService.actorAccess(ctx.session.user.id));
    const rows = await db.select({
      id: userTenants.id, userId: user.id, name: user.name, email: user.email, image: user.image,
      role: userTenants.role, tenantId: userTenants.tenantId, tenantName: tenants.name,
      countryCode: tenants.countryCode, createdAt: userTenants.createdAt,
    }).from(userTenants).innerJoin(user, eq(userTenants.userId, user.id))
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(actor.role === "super_admin" ? undefined : actor.role === "tenant_admin" ? and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)) : eq(userTenants.tenantId, actor.tenantId))
      .orderBy(desc(userTenants.createdAt));
    return rows.map((row) => ({ ...row, role: row.role as UserRole, tenantName: row.countryCode === "GLOBAL" ? "EPL Global Platform" : row.tenantName, countryCode: row.countryCode ?? "" }));
  }),
  invitationOptions: requirePermission("users:manage").query(({ ctx }) => invitationCall(() => invitationService.invitationOptions(ctx.session.user.id))),
  invite: requirePermission("users:manage").input(inviteInputSchema).mutation(({ ctx, input }) =>
    invitationCall(() => invitationService.issue(ctx.session.user.id, input))),
  listInvitations: requirePermission("users:manage").query(({ ctx }) =>
    invitationCall(() => invitationService.list(ctx.session.user.id), "listInvitations")),
  resendInvitation: requirePermission("users:manage").input(idInput).mutation(({ ctx, input }) =>
    invitationCall(() => invitationService.resend(ctx.session.user.id, input.id))),
  cancelInvitation: requirePermission("users:manage").input(idInput).mutation(({ ctx, input }) =>
    invitationCall(() => invitationService.cancel(ctx.session.user.id, input.id))),
  updateRole: superAdminProcedure.input(idInput.extend({ role: invitationRoleSchema, tenantId: z.string().uuid().optional() })).mutation(({ ctx, input }) =>
    invitationCall(() => invitationService.changeMembership(ctx.session.user.id, input.id, input.role, input.tenantId))),
  removeMembership: superAdminProcedure.input(idInput).mutation(({ ctx, input }) =>
    invitationCall(() => invitationService.changeMembership(ctx.session.user.id, input.id, null))),
});
