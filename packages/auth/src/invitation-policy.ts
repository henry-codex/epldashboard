import { z } from "zod";
import type { UserRole } from "./permissions";
import { profileNameSchema } from "./account-policy";

export const invitationRoleSchema = z.enum(["super_admin", "tenant_admin", "country_admin", "alumni_exec", "viewer"]);
export type InvitationRole = z.infer<typeof invitationRoleSchema>;
export const invitationRoleLabels: Record<InvitationRole, string> = {
  super_admin: "Super Admin", tenant_admin: "Tenant Admin", country_admin: "Country Admin",
  alumni_exec: "Alumni Executive", viewer: "Viewer",
};
export const invitationEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const inviteInputSchema = z.object({
  name: profileNameSchema, email: invitationEmailSchema,
  role: invitationRoleSchema, tenantId: z.string().uuid(),
}).strict();
export type InviteInput = z.infer<typeof inviteInputSchema>;
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "This invitation link is invalid. Ask your administrator for a new invitation.");
export const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export function assignableInvitationRoles(role: UserRole | string): InvitationRole[] {
  if (role === "super_admin") return [...invitationRoleSchema.options];
  if (role === "country_admin" || role === "tenant_admin") return ["country_admin"];
  return [];
}
export function canManageMemberships(role: UserRole | string) { return role === "super_admin"; }
export function canIssueInvitation(actor: { role: string; tenantId: string | null; countryCode?: string | null }, role: string, tenantId: string, countryCode?: string | null) {
  if (role === "tenant_admin" && countryCode !== "GLOBAL") return false;
  if (role === "country_admin" && countryCode === "GLOBAL") return false;
  if (actor.role === "tenant_admin") return actor.countryCode === "GLOBAL" && role === "country_admin" && countryCode !== "GLOBAL";
  return assignableInvitationRoles(actor.role).includes(role as InvitationRole)
    && (actor.role === "super_admin" || actor.tenantId === tenantId);
}
