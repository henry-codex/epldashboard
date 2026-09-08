import { db, transactionalDb, type AccessTransaction } from "@epl-fellows-platform/db";
import { env } from "@epl-fellows-platform/env/server";
import { sendPasswordResetEmail, sendInvitationEmail, sendOtpEmail } from "@epl-fellows-platform/email";
import { createAuth } from "./create-auth";
import { createInvitationService } from "./invitation-service";

export { fromNodeHeaders, toNodeHandler } from "better-auth/node";
const authOptions = {
  database: db, mfaDatabase: transactionalDb, secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL,
  trustedOrigin: env.CORS_ORIGIN, production: env.NODE_ENV === "production", sendPasswordResetEmail, sendOtpEmail, passkeyRpId: env.PASSKEY_RP_ID,
};

/** Trusted server/CLI provisioning. No HTTP handler is exposed for this auth instance. */
export async function createAccountInTransaction(tx: AccessTransaction, input: { name: string; email: string; password: string }) {
  const provisioning = createAuth({ ...authOptions, database: tx, mfaDatabase: tx, trustedAccountCreation: true });
  const result = await provisioning.api.signUpEmail({ body: input });
  return result.user;
}
export const invitationService = createInvitationService({
  database: transactionalDb, frontendURL: env.CORS_ORIGIN,
  createUser: createAccountInTransaction, sendEmail: sendInvitationEmail,
});
export const auth = createAuth({ ...authOptions, invitations: invitationService });
export * from "./permissions";
