# Account verification: authenticator, email OTP and passkeys

EPL uses Better Auth **1.5.6** and **@better-auth/passkey 1.5.6**. MFA enrollment is optional for every account: super admins, tenant admins, country admins, alumni executives, fellows, viewers and users without memberships. All roles can choose an authenticator app, passkeys or email codes in **Settings → Security**.

An enrolled account signing in with a password completes an eligible second step unless this browser has an unexpired seven-day allowance. A passkey with device PIN or biometric verification completes sign-in directly. Email codes are eligible for every role, including security management with recent verification and current-password confirmation. Invitations, multiple memberships and role promotions do not impose enrollment. Accounts without an enabled method can use their normally authorized pages after password sign-in. New accounts still require an invitation. Signed-in accounts without a hub land on their shared Profile settings page.

## Local setup

1. Start PostgreSQL and Mailpit using the existing Docker Compose configuration. Mailpit SMTP is **127.0.0.1:1025**, inbox **http://localhost:8025**, without SMTP authentication.
2. Confirm `apps/server/.env` points to the intended local database. Set the frontend URL in `CORS_ORIGIN` (normally `http://localhost:3001`).
3. Use `PASSKEY_RP_ID=localhost` for local development. Open the site as **localhost**, consistently; switching to a different hostname changes passkey scope.
4. Validate on the isolated database first, then apply the additive setup to development:

   ```powershell
   pnpm --filter @epl-fellows-platform/db db:setup-mfa
   ```

5. A new installation needs the trusted bootstrap in [USER-ONBOARDING.md](USER-ONBOARDING.md), including the Global hub for security activity entries.
6. Start the applications and sign in. Open **Settings → Security** to opt in. `/mfa/setup` also offers **Not now**, including during incomplete authenticator or email setup. Skipping refreshes server status before resuming a validated invitation or dashboard destination; already-protected accounts must still verify.

The repeatable setup adds independent authenticator/email flags, encrypted account-level backup codes, security-change timestamps, session proof metadata, the plugin's `passkey` table, and challenge/send-limit tables. It preserves authentication records and memberships. A one-time backfill copies existing authenticator enrollment and the existing encrypted unused backup-code set. Repeating setup does not re-enable removed methods or restore consumed codes. Legacy sessions without a proof method must verify once. Startup prints the setup command if schema is missing.

The optional-enrollment policy needs no additional migration and does not reset existing factors, backup codes or accounts. Restart the server with the updated code. Existing enabled methods remain active. Incomplete first-time setup does not enable protection or block dashboard access.

## Choosing and managing methods

**Authenticator app:** Confirm your current password, scan the locally generated QR code or enter the manual key, save recovery codes, then verify a six-digit time-based code. The issuer is **EPL Global Platform**, period 30 seconds. The previous/current/next period accommodate modest clock differences. Accepted steps cannot be replayed.

**Email code:** Available to every role. Confirm your current password, save recovery codes, and verify the code sent to your existing account email. Codes are six digits and expire after five minutes. Login codes and enrollment codes have separate purposes and are bound to the account and requesting browser. Resend invalidates the previous code for that challenge. The UI reports SMTP acceptance or submission failure; acceptance does not guarantee arrival in an inbox.

**Passkey:** Confirm your password, save recovery codes if this is your first method, name the passkey, and complete the browser/device prompt using PIN or biometrics. A recent eligible verification is also required when the account already has protection. Supported browsers can use a local authenticator or compatible security key/device. Security lists multiple named passkeys and supports rename and confirmed removal. Cancelled prompts can be retried or another method chosen. WebAuthn user verification is requested and cryptographically required on the server for registration and sign-in; the 1.5.6 plugin defaults alone are insufficient.

Adding the first method rotates the current session and revokes other sessions. This implementation also rotates/revokes on subsequent method enrollment. Removing/replacing a method invalidates other sessions and pending challenges. Every role can remove its last method; this turns off MFA and returns the account to password-only sign-in. Renaming requires an unrestricted session. Adding/removing methods and regenerating recovery codes require the current password; protected accounts also need an eligible proof from the previous five minutes.

The explicit **Replace authenticator** flow invalidates the old secret. If it was the only method, the account uses password-only sign-in until replacement setup is verified; any other enabled methods continue to protect sign-in. Existing unused backup codes remain valid when adding or replacing an authenticator.

## Shared recovery codes

Each account has ten single-use encrypted backup codes shared across methods, including passkey-only and email-only accounts. Adding a method preserves the existing unused set. Codes are shown only when generated, kept in component memory, and downloaded only by explicit action. Save them outside the browser and acknowledge that they have been saved.

Regeneration invalidates the old set immediately. Acknowledge the new set before using those codes. Backup codes work for every role while at least one method is enabled. Stored recovery codes alone do not enable MFA or allow backup-code sign-in after the last method is removed.

Password changes and password recovery preserve all enrolled methods. They invalidate pending challenges. Account security-change timestamps also reject anonymous passkey requests issued before a password reset, even when their account was unknown at issuance. Password recovery revokes all sessions; it does not remove MFA.

## Operator recovery

If all enrolled methods and backup codes are lost, a trusted operator must verify identity through an established independent process and record the support case. Use the exact database user ID:

```powershell
pnpm --filter @epl-fellows-platform/auth mfa:recover --user-id "EXACT_USER_ID" --operator "OPERATOR_ID" --reason "Identity verified; support case CASE_ID" --identity-verified
```

This server-only command preserves the account and password, deletes authenticator and passkey records, clears email enrollment and shared recovery codes, clears lockout state, invalidates pending challenges and revokes every session. It records operator/reason in the Global hub activity log. Recovered users sign in with their password and can choose to enroll again from Security, including administrators. No signed-in administrator is required to recover the last super admin. Never include passwords, codes, tokens or identity-document contents in the reason.

## Configuration and operations

- **PASSKEY_RP_ID:** Explicitly required in production. Use the stable frontend domain (or a suitable parent domain); no scheme, path or port. The configured frontend URL determines the only permitted browser origin. Use HTTPS outside localhost. Changing the RP domain can make existing passkeys unusable; plan domain continuity before rollout.
- **BETTER_AUTH_SECRET:** Encrypts authenticator secrets and recovery codes and keys OTP hashes. Preserve it securely alongside database backups. Losing/changing it can make existing factors unreadable. Do not rotate it as an ordinary configuration edit.
- **SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL:** Shared with invitations and recovery. Configure the production relay and sender; use both authentication fields together when required. Local Mailpit needs neither. OTP submission is awaited and failure is shown explicitly; no queue is introduced.
- Ten-minute browser challenges are consumed atomically with credential counters, sessions and security state. Account locks serialize concurrent operations; failed verification counters persist even when the verification transaction rolls back. Failed transactions do not publish cookies for uncommitted sessions.
- Production verification has a shared **five attempts/minute/IP** limit across authenticator, email, backup and passkey verification. Ten consecutive failures lock an account for 15 minutes; successful verification clears failures.
- Email sends have a persisted **60-second cooldown**, **three sends/minute/IP** production limit and **ten/hour/account** limit. Failed submissions retain cooldown/limit reservations. Challenge and send records contain no plaintext codes.
- The Nest server derives the internal client IP from the connection. Configure `TRUSTED_PROXY_CIDRS` only for actual trusted proxy addresses. Without it, requests through a proxy share its limit.
- Central API enforcement and account mutation checks remain independent of UI routing. `account.mfaStatus` remains available to sessions awaiting verification and preserves its response shape, with `required: false` for everyone. It returns enrolled methods, eligible verification methods and the recorded proof method. Enabled accounts without a valid proof remain restricted through backend guards and the dashboard gate. Server-only proof fields, secrets and recovery codes are excluded from identity/session-list output.
- Origin validation, fixed seven-day browser allowances, uncached session checks and production secure cookies remain enabled. Authentication responses for these methods use `Cache-Control: no-store`. Logs and activity entries exclude passwords, codes, secrets and tokens.
- Keep server time synchronized. SMTP availability affects email verification; authenticator and passkey methods work independently of SMTP.

## Verification

Use the guarded isolated `epl_settings_test` PostgreSQL database at loopback port **55432** (or **15432** if Windows reserves 55432; update both database URLs and the Docker port mapping) and isolated Mailpit SMTP **11025**, inbox **18025**. Set both `DATABASE_URL` and `TEST_DATABASE_URL` to that database; follow [ACCOUNT-SETTINGS.md](ACCOUNT-SETTINGS.md#verification) for service/environment commands. Integration tests reject other targets.

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

The suites cover existing settings/recovery/invitations, all roles and unassigned users, promotion, OTP purpose/browser/account binding, expiry, rotation, SMTP acceptance/failure, shared limits/lockouts, signed WebAuthn registration and assertions, required user verification, origin rejection, replay/concurrency, optional setup cancellation, last-method removal, rollback, password recovery, legacy sessions and operator recovery. Browser verification additionally exercises a virtual WebAuthn authenticator, separate sessions, keyboard controls, desktop/laptop/mobile layouts and both themes.

Production deployment and provider provisioning are separate. Apply schema before starting the new server, preserve encryption secrets/backups, confirm the stable RP domain and notify administrators. Retain additive data when rolling back application code; rolling back to authenticator-only code while accounts use passkeys/email requires a separate compatibility plan. SMS, magic links, social login, public signup and in-app administrator resets remain excluded.

## Global Tenant Admin access

Tenant Admins use EPL Global Platform and land on the global dashboard after sign-in. MFA enrollment is optional; users who enable protection must complete it. Migration and role changes revoke sessions and pending challenges while retaining factors. See [Global Tenant Admin](TENANT-ADMIN.md).


## Optional MFA verification — 9 September 2026

Validated 278 unique tests: 140 authentication, 52 API, 80 frontend and six email tests. Two recovery/rollback checks passed on a focused rerun after extending the full recovery scenario's timeout and scoping its audit-failure mock to the fixture account. Workspace type checks and both production builds passed.

Two isolated Tenant Admin browsers verified password-only access, incomplete authenticator setup cancellation with Tab/Enter, email enrollment and sign-in through Mailpit, revocation of the other session after enrollment and final-method removal, incorrect-password feedback, and restored password-only sign-in. Security and optional setup were checked at laptop (1366px), desktop (1920px) and mobile (390px) sizes, with both themes and no horizontal overflow or uncaught browser errors. All-role, unassigned-account, multiple-membership, invitation, passkey, recovery and audit behavior is covered by the automated suites; this browser pass used the synthetic Tenant Admin account.

Windows reserved the usual isolated database port, so verification used the documented loopback 15432 fallback. The synthetic account was removed and the verification browsers and applications were closed afterward. No development accounts, enrolled factors, environment files or production services were changed. The optional policy itself needs no database migration.

## Seven-day browser verification

MFA remains optional for all roles. After an authenticator, email code, backup code, or passkey is successfully verified, this browser is automatically remembered for exactly seven days. Ordinary sign-out preserves that allowance. Password sign-ins and session renewal do not extend it; new browsers and cleared cookies require MFA. A passkey still requires its device PIN or biometrics when used to sign in.

The server denies protected requests when verification expires, even for continuously active sessions. Security changes continue to require the current password and actual verification within five minutes. Settings > Security shows the expiry and provides **Forget this browser and sign out**.

A random HttpOnly cookie identifies a server-side `mfa_browser` record containing only a token hash, account, original proof time/method, expiry and revocation state. Sessions reference that record using `mfa_browser_id`. Neither field is returned by normal authentication/session-list APIs. `account.mfaStatus` adds `verificationExpiresAt` and `browserRememberedUntil`; existing flags remain compatible. No localStorage or JavaScript-readable trust tokens are used.

Run `pnpm --filter @epl-fellows-platform/db db:setup-mfa` for the additive, repeatable schema setup before restarting the API. Validate it against the isolated database first. Existing factors and backup codes are preserved. Existing sessions use their recorded proof time with the seven-day limit; they receive a remembered-browser cookie only after a new actual verification. Keep the existing authentication/encryption secret unchanged.

Password changes/recovery, factor changes, backup-code regeneration, operator recovery and access revocation invalidate browser allowances. Session revocation also invalidates its associated allowance; signing out other devices preserves only the current browser allowance. The existing current-session exception remains for password/security changes. Ordinary sign-out clears pending challenges without revoking remembered browsers. Removing the last factor restores password-only access.

Browser records are revocable bearer credentials, not hardware fingerprints. Changing IP or browser-reported metadata alone does not identify a different browser. A copied session or browser cookie must therefore be protected like any other authentication cookie. Production retains Secure cookies and origin validation. Audit events contain record IDs, methods and reasons, never browser tokens or hashes.

## Seven-day browser verification results - 9 September 2026

Validated 309 unique tests across authentication (165), API (53), frontend (85), and email (six), plus all six workspace type-check tasks and both production builds. Resource-related integration timeouts were rerun sequentially and passed. The repeatable MFA schema command passed against the isolated database on port 15432 before being applied to the configured local development database; existing factors and backup codes were preserved.

An isolated Tenant Admin account verified real Mailpit email enrollment, same-browser password sign-in after ordinary sign-out, persistence across a browser restart, and a new browser requiring MFA. Database checks confirmed repeated password sign-ins kept the original verification time and expiry. Adding a passkey required a fresh email check after five minutes; virtual WebAuthn registration and sign-in then succeeded. Forgetting the browser forced another MFA challenge. An active session returned to verification at its shortened test deadline while preserving its Security return path.

Security was inspected at laptop (1366px), desktop (1920px), and mobile (390px) sizes in light and dark themes. The confirmation opened with Enter, cancellation restored focus, and mobile content had no horizontal overflow or uncaught browser errors. Browser-runner waits occasionally timed out; the visible state and successful actions were checked directly. Authenticator/backup-code edge cases, invitation continuation, revocation races, rollback, and all-role authorization remain covered by automated regressions; those complete flows were not all repeated manually in this browser pass. Production rollout remains separate.

The synthetic browser-test account was removed and the isolated applications and browsers were closed. The normal development API (3000), frontend (3001), and Mailpit inbox (8025) were confirmed reachable.
