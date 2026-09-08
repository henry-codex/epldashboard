import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx, originCheckMiddleware } from "better-auth/api";
import { z } from "zod";
import { invitationTokenSchema } from "./invitation-policy";
import { InvitationError } from "./invitation-error";

export interface InvitationEndpoints {
  preview(token: string): Promise<{ name: string; email: string; role: string; tenantName: string; expiresAt: Date; requiresSignIn: boolean }>;
  accept(token: string, input: { name?: string; password?: string }, userId?: string): Promise<{ existingAccount: boolean }>;
}
export function invitationPlugin(service: InvitationEndpoints, origin: string) {
  const requireOrigin = createAuthMiddleware(async (ctx) => {
    if (ctx.headers?.get("origin") !== new URL(origin).origin) {
      throw new APIError("FORBIDDEN", { message: "Invalid invitation request origin" });
    }
  });
  async function run<T>(action: () => Promise<T>) {
    try { return await action(); }
    catch (error) {
      if (error instanceof InvitationError) throw new APIError(error.code, { message: error.message });
      console.error("Invitation request failed");
      throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not complete this invitation. Please try again." });
    }
  }
  return {
    id: "epl-invitations",
    endpoints: {
      previewInvitation: createAuthEndpoint("/invitations/preview", {
        method: "POST", body: z.object({ token: invitationTokenSchema }).strict(),
        use: [originCheckMiddleware, requireOrigin],
      }, async (ctx) => {
        ctx.setHeader("Cache-Control", "no-store");
        return ctx.json(await run(() => service.preview(ctx.body.token)));
      }),
      acceptInvitation: createAuthEndpoint("/invitations/accept", {
        method: "POST",
        body: z.object({ token: invitationTokenSchema, name: z.string().max(1000).optional(), password: z.string().max(1000).optional() }).strict(),
        use: [originCheckMiddleware, requireOrigin],
      }, async (ctx) => {
        ctx.setHeader("Cache-Control", "no-store");
        const session = await getSessionFromCtx(ctx);
        return ctx.json(await run(() => service.accept(ctx.body.token, ctx.body, session?.user.id)));
      }),
    },
  };
}
