import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { mfaBrowser, session } from "@epl-fellows-platform/db/schema/auth";
import { writeAudit } from "@epl-fellows-platform/db/audit";
import { revokeRememberedBrowsers } from "@epl-fellows-platform/db/mfa-browsers";
import { MFA_REMEMBER_SECONDS, type MfaMethod } from "./mfa-policy";
import type { MfaDatabase } from "./mfa-store";
import type { SecurityContext } from "./mfa-methods";
export const MFA_BROWSER_COOKIE = "epl_mfa_browser";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function readRememberedBrowser(db: MfaDatabase, ctx: SecurityContext, userId: string) {
  const token = await ctx.getSignedCookie(ctx.context.createAuthCookie(MFA_BROWSER_COOKIE).name, ctx.context.secret);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await db.select().from(mfaBrowser).where(and(eq(mfaBrowser.tokenHash, hash(token)), eq(mfaBrowser.userId, userId)));
  return row && !row.revokedAt && row.expiresAt > new Date() ? row : null;
}
export async function browserSessionState(db: MfaDatabase, userId: string, browserId?: string | null) {
  if (!browserId) return { browserValid: true, browserExpiresAt: null };
  const [row] = await db.select().from(mfaBrowser).where(and(eq(mfaBrowser.id, browserId), eq(mfaBrowser.userId, userId)));
  return { browserValid: Boolean(row && !row.revokedAt && row.expiresAt > new Date()), browserExpiresAt: row?.expiresAt ?? null };
}
/** Actual successful verification only. Sign-ins never renew this timestamp. */
export async function rememberBrowser(db: MfaDatabase, ctx: SecurityContext, userId: string, sessionId: string, method: MfaMethod) {
  const previous = await readRememberedBrowser(db, ctx, userId);
  if (previous) await revokeRememberedBrowsers(db, userId, { onlyId: previous.id, keepSessionId: sessionId, reason: "VERIFICATION_RENEWED" });
  const token = randomBytes(32).toString("base64url"), id = randomUUID(), now = new Date();
  const expiresAt = new Date(now.getTime() + MFA_REMEMBER_SECONDS * 1000);
  await db.insert(mfaBrowser).values({ id, userId, tokenHash: hash(token), verifiedAt: now, verificationMethod: method, expiresAt });
  await db.update(session).set({ mfaBrowserId: id, mfaVerifiedAt: now, mfaVerificationMethod: method }).where(and(eq(session.id, sessionId), eq(session.userId, userId)));
  await writeAudit(db, { action: "mfa.browser_remembered", actorId: userId, targetType: "remembered_browser", targetId: id, details: { method } });
  const cookie = ctx.context.createAuthCookie(MFA_BROWSER_COOKIE, { maxAge: MFA_REMEMBER_SECONDS });
  await ctx.setSignedCookie(cookie.name, token, ctx.context.secret, cookie.attributes);
}
