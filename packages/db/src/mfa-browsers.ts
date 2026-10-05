import { and, eq, isNull, ne } from "drizzle-orm";
import { mfaBrowser, session } from "./schema/auth";
import { auditStorage, writeAudit } from "./audit";
import type { AccessTransaction, TransactionalDatabase } from "./index";

/** Call under the account lock, in the same transaction as the security change. */
export async function revokeRememberedBrowsers(db: AccessTransaction | TransactionalDatabase, userId: string,
  options: { onlyId?: string; exceptId?: string | null; keepSessionId?: string; reason: string; actorId?: string }) {
  const rows = await db.update(mfaBrowser).set({ revokedAt: new Date() }).where(and(
    eq(mfaBrowser.userId, userId), isNull(mfaBrowser.revokedAt),
    options.onlyId ? eq(mfaBrowser.id, options.onlyId) : undefined,
    options.exceptId ? ne(mfaBrowser.id, options.exceptId) : undefined,
  )).returning({ id: mfaBrowser.id });
  for (const row of rows) {
    if (options.keepSessionId) await db.update(session).set({ mfaBrowserId: null }).where(and(
      eq(session.id, options.keepSessionId), eq(session.userId, userId), eq(session.mfaBrowserId, row.id)));
    const actor = auditStorage.getStore()?.actor;
    await writeAudit(db, { action: "mfa.browser_revoked", ...(options.actorId ? { actorId: options.actorId } : actor && actor.kind !== "anonymous" ? { actor } : { actorId: userId }),
      targetType: "remembered_browser", targetId: row.id, details: { reasonCode: options.reason } });
  }
}
