# Account verification: authenticator, email OTP and passkeys

EPL uses Better Auth **1.5.6** and **@better-auth/passkey 1.5.6**. Super admins, tenant admins and country admins must enroll an authenticator app or a passkey. Policy checks every current membership. Alumni executives, fellows, viewers and accounts without memberships may also choose email OTP.

An enrolled account signing in with a password completes an eligible second step. A passkey with device PIN or biometric verification completes sign-in directly. Email codes never authorize administrator data or security management. An email-only user promoted to administrator receives restricted enrollment access after entering their password and must add a strong method. New accounts still require an invitation. Signed-in accounts without a hub land on their shared Profile settings page.

## Local setup

1. Start PostgreSQL and Mailpit using the existing Docker Compose configuration. Mailpit SMTP is **127.0.0.1:1025**, inbox **http://localhost:8025**, without SMTP authentication.
2. Confirm `apps/server/.env` points to the intended local database. Set the frontend URL in `CORS_ORIGIN` (normally `http://localhost:3001`).
3. Use `PASSKEY_RP_ID=localhost` for local development. Open the site as **localhost**, consistently; switching to a different hostname changes passkey scope.
4. Validate on the isolated database first, then apply the additive setup to development:

   ```powershell
   pnpm --filter @epl-fellows-platform/db db:setup-mfa
   ```

5. A new installation needs the trusted bootstrap in [USER-ONBOARDING.md](USER-ONBOARDING.md), including the Global hub for security activity entries.
6. Start the applications and sign in. Required administrators see method selection before protected dashboard content loads.

The repeatable setup adds independent authenticator/email flags, encrypted account-level backup codes, security-change timestamps, session proof metadata, the plugin's `passkey` table, and challenge/send-limit tables. It preserves authentication records and memberships. A one-time backfill copies existing authenticator enrollment and the existing encrypted unused backup-code set. Repeating setup does not re-enable removed methods or restore consumed codes. Legacy sessions without a proof method must verify once. Startup prints the setup command if schema is missing.

## Choosing and managing methods

**Authenticator app:** Confirm your current password, scan the locally generated QR code or enter the manual key, save recovery codes, then verify a six-digit time-based code. The issuer is **EPL Global Platform**, period 30 seconds. The previous/current/next period accommodate modest clock differences. Accepted steps cannot be replayed.

**Email code:** Available to non-administrators. Confirm your current password, save recovery codes, and verify the code sent to your existing account email. Codes are six digits and expire after five minutes. Login codes and enrollment codes have separate purposes and are bound to the account and requesting browser. Resend invalidates the previous code for that challenge. The UI reports SMTP acceptance or submission failure; acceptance does not guarantee arrival in an inbox.

**Passkey:** Confirm your password, save recovery codes if this is your first method, name the passkey, and complete the browser/device prompt using PIN or biometrics. A recent eligible verification is also required when the account already has protection. Supported browsers can use a local authenticator or compatible security key/device. Security lists multiple named passkeys and supports rename and confirmed removal. Cancelled prompts can be retried or another method chosen. WebAuthn user verification is requested and cryptographically required on the server for registration and sign-in; the 1.5.6 plugin defaults alone are insufficient.

Adding the first method rotates the current session and revokes other sessions. This implementation also rotates/revokes on subsequent method enrollment. Removing/replacing a method invalidates other sessions and pending challenges. An administrator cannot remove their last authenticator/passkey. Renaming requires an unrestricted session. Adding/removing methods and regenerating recovery codes require the current password; protected accounts also need an eligible proof from the previous five minutes.

The explicit **Replace authenticator** flow invalidates the old secret and restricts access until verification is restored. Existing unused backup codes remain valid when adding or replacing an authenticator.

## Shared recovery codes

Each account has ten single-use encrypted backup codes shared across methods, including passkey-only and email-only accounts. Adding a method preserves the existing unused set. Codes are shown only when generated, kept in component memory, and downloaded only by explicit action. Save them outside the browser and acknowledge that they have been saved.

Regeneration invalidates the old set immediately. Acknowledge the new set before using those codes. Administrators can use backup codes only while a strong method remains enrolled. Email-only backup codes cannot bypass required administrator enrollment.

Password changes and password recovery preserve all enrolled methods. They invalidate pending challenges. Account security-change timestamps also reject anonymous passkey requests issued before a password reset, even when their account was unknown at issuance. Password recovery revokes all sessions; it does not remove MFA.

## Operator recovery

If all enrolled methods and backup codes are lost, a trusted operator must verify identity through an established independent process and record the support case. Use the exact database user ID:

```powershell
pnpm --filter @epl-fellows-platform/auth mfa:recover --user-id "EXACT_USER_ID" --operator "OPERATOR_ID" --reason "Identity verified; support case CASE_ID" --identity-verified
```

This server-only command preserves the account and password, deletes authenticator and passkey records, clears email enrollment and shared recovery codes, clears lockout state, invalidates pending challenges and revokes every session. It records operator/reason in the Global hub activity log. Administrators sign in and enroll a strong method again. No signed-in administrator is required to recover the last super admin. Never include passwords, codes, tokens or identity-document contents in the reason.

## Configuration and operations

- **PASSKEY_RP_ID:** Explicitly required in production. Use the stable frontend domain (or a suitable parent domain); no scheme, path or port. The configured frontend URL determines the only permitted browser origin. Use HTTPS outside localhost. Changing the RP domain can make existing passkeys unusable; plan domain continuity before rollout.
- **BETTER_AUTH_SECRET:** Encrypts authenticator secrets and recovery codes and keys OTP hashes. Preserve it securely alongside database backups. Losing/changing it can make existing factors unreadable. Do not rotate it as an ordinary configuration edit.
- **SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL:** Shared with invitations and recovery. Configure the production relay and sender; use both authentication fields together when required. Local Mailpit needs neither. OTP submission is awaited and failure is shown explicitly; no queue is introduced.
- Ten-minute browser challenges are consumed atomically with credential counters, sessions and security state. Account locks serialize concurrent operations; failed verification counters persist even when the verification transaction rolls back. Failed transactions do not publish cookies for uncommitted sessions.
- Production verification has a shared **five attempts/minute/IP** limit across authenticator, email, backup and passkey verification. Ten consecutive failures lock an account for 15 minutes; successful verification clears failures.
- Email sends have a persisted **60-second cooldown**, **three sends/minute/IP** production limit and **ten/hour/account** limit. Failed submissions retain cooldown/limit reservations. Challenge and send records contain no plaintext codes.
- The Nest server derives the internal client IP from the connection. Configure `TRUSTED_PROXY_CIDRS` only for actual trusted proxy addresses. Without it, requests through a proxy share its limit.
- Central API enforcement and account mutation checks remain independent of UI routing. `account.mfaStatus` remains available during restricted enrollment and returns existing flags/reasons plus enrolled methods, eligible verification methods and the recorded proof method. Server-only proof fields, secrets and recovery codes are excluded from identity/session-list output.
- Origin validation, disabled trusted devices, uncached session checks and production secure cookies remain enabled. Authentication responses for these methods use `Cache-Control: no-store`. Logs and activity entries exclude passwords, codes, secrets and tokens.
- Keep server time synchronized. SMTP availability affects email verification; authenticator and passkey methods work independently of SMTP.

## Verification

Use the guarded isolated `epl_settings_test` PostgreSQL database at loopback port **55432** and isolated Mailpit SMTP **11025**, inbox **18025**. Set both `DATABASE_URL` and `TEST_DATABASE_URL` to that database; follow [ACCOUNT-SETTINGS.md](ACCOUNT-SETTINGS.md#verification) for service/environment commands. Integration tests reject other targets.

Run sequentially on memory-constrained machines:

```powershell
pnpm --filter @epl-fellows-platform/db db:setup-mfa
pnpm --filter @epl-fellows-platform/auth test --maxWorkers=1 --minWorkers=1
pnpm --filter @epl-fellows-platform/api test --maxWorkers=1 --minWorkers=1
pnpm --filter @epl-fellows-platform/email test --maxWorkers=1 --minWorkers=1
pnpm --filter web test --maxWorkers=1 --minWorkers=1 --testTimeout=15000
pnpm check-types --concurrency=1
pnpm --filter server build
pnpm --filter web build
```

The suites cover existing settings/recovery/invitations, all roles and unassigned users, promotion, OTP purpose/browser/account binding, expiry, rotation, SMTP acceptance/failure, shared limits/lockouts, signed WebAuthn registration and assertions, required user verification, origin rejection, replay/concurrency, last-strong-factor removal, rollback, password recovery, legacy sessions and operator recovery. Browser verification additionally exercises a virtual WebAuthn authenticator, separate sessions, keyboard controls, desktop/laptop/mobile layouts and both themes.

Production deployment and provider provisioning are separate. Apply schema before starting the new server, preserve encryption secrets/backups, confirm the stable RP domain and notify administrators. Retain additive data when rolling back application code; rolling back to authenticator-only code while accounts use passkeys/email requires a separate compatibility plan. SMS, magic links, social login, public signup and in-app administrator resets remain excluded.

## Global Tenant Admin access

Tenant Admins use EPL Global Platform and land on the global dashboard after MFA. Required authenticator/passkey enrollment is unchanged. Migration and role changes revoke sessions and pending challenges while retaining factors. See [Global Tenant Admin](TENANT-ADMIN.md).
