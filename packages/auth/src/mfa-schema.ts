import { sql } from "drizzle-orm";
import type { MfaDatabase } from "./mfa-store";
export async function assertMfaSchema(database: MfaDatabase) {
  try {
    await database.execute(sql`select u.two_factor_enabled, u.mfa_failed_attempts, u.mfa_locked_until, u.totp_enabled, u.email_otp_enabled, u.mfa_backup_codes, u.mfa_backup_codes_confirmed, u.mfa_security_changed_at, u.mfa_email_last_sent_at, s.mfa_browser_id, b.token_hash, b.verified_at, b.verification_method, b.expires_at, b.revoked_at, s.mfa_verified_at, s.mfa_verification_method, p.credential_id, c.code_hash, c.delivery_status, e.created_at, f.last_accepted_totp_step, f.secret, f.backup_codes from public."user" u left join public.mfa_browser b on false left join public.session s on false left join public.two_factor f on false left join public.passkey p on false left join public.mfa_challenge c on false left join public.mfa_email_send e on false limit 0`);
  } catch { throw new Error("MFA database setup is missing. Run pnpm --filter @epl-fellows-platform/db db:setup-mfa against this database before starting the server."); }
}
