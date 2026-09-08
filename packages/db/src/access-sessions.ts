import { and, eq, like, or, sql } from "drizzle-orm";
import { mfaChallenge, session, user, verification } from "./schema/auth";
import type { AccessTransaction } from "./index";
/** Caller holds the access lock; serialize with in-flight MFA completion too. */
export async function revokeAccessSessions(tx: AccessTransaction, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"epl-mfa:" + userId}, 0))`);
  await tx.delete(session).where(eq(session.userId, userId));
  await tx.delete(mfaChallenge).where(eq(mfaChallenge.userId, userId));
  await tx.update(user).set({ mfaSecurityChangedAt: new Date() }).where(eq(user.id, userId));
  await tx.delete(verification).where(and(eq(verification.value, userId), or(like(verification.identifier, "2fa-%"), like(verification.identifier, "trust-device-%"))));
}
