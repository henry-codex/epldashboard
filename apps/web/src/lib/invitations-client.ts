import { z } from "zod";
import { env } from "@epl-fellows-platform/env/web";
import { invitationRoleSchema } from "@epl-fellows-platform/auth/invitation-policy";

const previewSchema = z.object({
  name: z.string(), email: z.string(), role: invitationRoleSchema, tenantName: z.string(),
  expiresAt: z.coerce.date(), requiresSignIn: z.boolean(),
});
export type InvitationPreview = z.infer<typeof previewSchema>;
export class InvitationRequestError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
async function request<T>(path: string, body: object, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(new URL("/api/auth/invitations/" + path, env.NEXT_PUBLIC_SERVER_URL), {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store", signal,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = z.object({ message: z.string().optional() }).safeParse(data);
    const message = response.status === 429 ? "Too many attempts. Please wait a minute before trying again."
      : detail.success && detail.data.message ? detail.data.message : "Could not complete this invitation. Please try again.";
    throw new InvitationRequestError(response.status, message);
  }
  return schema.parse(data);
}
export const previewInvitation = (token: string, signal?: AbortSignal) => request("preview", { token }, previewSchema, signal);
export const acceptInvitation = (body: { token: string; name?: string; password?: string }) =>
  request("accept", body, z.object({ existingAccount: z.boolean() }));
