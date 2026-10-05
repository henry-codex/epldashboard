# Invitation-only onboarding

Accounts are created through email invitations. Existing users without hub memberships can accept after signing in as the recipient; their name and password stay unchanged. Accounts with any membership must use the separate role-management action. Fellow onboarding and additional hub assignments are outside this release.

## Authority and workflow

| Administrator | Invitations | Existing memberships |
| --- | --- | --- |
| Super admin | Super admin, tenant admin, country admin, alumni executive, viewer in an active hub | Change roles or remove a selected hub membership |
| Tenant admin (EPL Global Platform) | Country admin in any active country hub | No changes |
| Country admin | Country admin in their own hub | No changes |
| Other roles or unassigned users | None | None |

Open Settings > Users and switch between Members and Invitations. Country settings use the same panel scoped to the administrator's hub. Creating a regional hub sends an invitation to its first country admin; it does not create an account immediately. The server and interface share the role policy.

Invitations last 48 hours. Opening a link previews it without consuming it. A new recipient confirms their name and chooses an 8–128 character password, then returns to login. An existing recipient signs in before accepting. Acceptance verifies the recipient's email and creates the membership.

One pending invitation is allowed per trimmed, lowercase email address. Resend rotates the link and restarts its expiry; the previous link stops working immediately. A persisted 60-second cooldown applies even after SMTP failure. Pending or expired invitations can be resent; cancelled and accepted invitations cannot. Cancellation invalidates the link.

Role changes and removal sign the affected person out on every device. Removal deletes only the selected membership; the account and other memberships remain. Self-removal and self-demotion are blocked. The last super admin and the last country/tenant administrator of an active hub are protected. The issuer's current authority, hub activity, and recipient assignments are checked again during acceptance.

## Additive database change

Apply the Drizzle schema to a local or isolated database with `pnpm db:push` after configuring DATABASE_URL. This adds `invitations`, its foreign keys, a unique token-hash index, a partial unique index for pending email addresses, and a hub index. Existing authentication and membership tables are retained. Review schema changes before applying them to any deployed database; production rollout is separate.

If an existing local database is missing the invitation table, run `pnpm --filter @epl-fellows-platform/db db:setup-invitations`. This loads `apps/server/.env` and applies only [the additive invitation SQL](../packages/db/sql/add-invitations.sql) in a transaction. It is safe to repeat when the table is already current and preserves existing account, hub, and membership records. Review the SQL and target database before a production rollout. If an existing invitation table has outdated columns, use the reviewed Drizzle schema update instead.

Only SHA-256 token hashes are stored. Invitation and access writes use postgres-js transactions, including when reads use Neon HTTP. A PostgreSQL transaction advisory lock serializes these infrequent operations and protects concurrent acceptance, duplicate invitations, issuer-authority changes, and last-administrator checks. Private Better Auth account and credential creation uses the same transaction as the membership and acceptance update. Better Auth remains pinned to 1.5.6.

Public `/api/auth/sign-up/email` is disabled. The private account-creation helper is server-only, has automatic sign-in disabled, and is used only inside invitation acceptance, trusted bootstrap, and isolated fixtures. The unused Next.js Neon Auth proxy and public registration controls have been removed.

## Local SMTP and production configuration

Run `docker compose up -d mailpit`. SMTP is bound to 127.0.0.1:1025 and the inbox to http://localhost:8025. Local delivery needs no SMTP_USER or SMTP_PASS. Configure SMTP_HOST, SMTP_PORT, SMTP_SECURE and SMTP_FROM_EMAIL in apps/server/.env; set SMTP_USER and SMTP_PASS together only for authenticated relays. NEXT_PUBLIC_APP_URL must point to the frontend, CORS_ORIGIN must trust its origin, and BETTER_AUTH_URL must point to the API. Rebuild the frontend after changing its public URLs.

Invitation email is sent only after the database commit. The API waits for the SMTP attempt and records:
- **Pending:** the attempt has not been confirmed, including an interrupted server process.
- **Sent:** the SMTP server accepted the message; this does not establish inbox delivery.
- **Failed:** the SMTP attempt failed; the administrator can resend after the cooldown.

There is no background queue. Reset-email behavior and production relay requirements are documented in [Account settings](ACCOUNT-SETTINGS.md). Logs contain generic outcomes without credentials, tokens, links, or SMTP response bodies.

## Initial administrator bootstrap

Public registration is closed, so initialize a new local database using trusted bootstrap. Run `pnpm --filter @epl-fellows-platform/db db:setup-audit` first and supply `BOOTSTRAP_OPERATOR` for attribution; see [AUDIT-LOG.md](AUDIT-LOG.md). Supply BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD securely in the shell before `pnpm db:seed`; optionally supply BOOTSTRAP_ADMIN_NAME. No default password is accepted or printed. Names use the shared 1–100 character trimmed validation.

For PowerShell, collect the password without displaying it:

```powershell
$env:BOOTSTRAP_OPERATOR = Read-Host 'Operator identity'
$env:BOOTSTRAP_ADMIN_EMAIL = Read-Host 'Initial administrator email'
$bootstrapSecret = Read-Host 'Initial administrator password' -AsSecureString
$env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $bootstrapSecret).Password
try {
  pnpm db:seed
} finally {
  Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_OPERATOR -ErrorAction SilentlyContinue
  $bootstrapSecret.Dispose()
}
```

The script creates the GLOBAL workspace if needed and atomically creates one super administrator. Repeating it for that existing super administrator is a no-op. It refuses to overwrite an existing account or create a different bootstrap administrator after one exists. Subsequent administrators must be invited. Bootstrap credentials are not a password-recovery mechanism.

## Operational recovery

- **Database setup incomplete:** a missing invitation table or column is reported as unavailable (HTTP 503). For the missing-table case on an existing local database, run the targeted setup command above, then refresh Invitations. Server logs identify the operation and PostgreSQL SQLSTATE without SQL text or parameters.
- **Failed or unconfirmed send:** check relay configuration and sanitized server logs; refresh Invitations and resend after 60 seconds. Only the newest email link works.
- **Expired, replaced, or cancelled link:** use a current administrator's invitation or resend. Accepted links send the user to normal login.
- **Issuer lost authority or hub became inactive:** a currently authorized administrator must resolve access/hub availability, then resend or cancel and issue a replacement. A resend makes the resending administrator the issuer.
- **Recipient already assigned:** use role management; additional hub assignment is intentionally unavailable.
- **Last-manager guard:** invite another country/tenant administrator and have them accept before changing or removing the current manager.
- **Account preserved after removal:** invite that account again only if it has no remaining memberships. Otherwise manage its remaining membership.
- **Administrator cannot sign in:** use password recovery. Do not reopen public signup or bypass membership guards.

Activity-log records cover invitation creation, resend, cancellation and acceptance, and membership role changes/removals. They include actor and affected record identifiers without passwords or invitation/session tokens.

## Verification

Follow the disposable PostgreSQL and Mailpit commands in [Account settings](ACCOUNT-SETTINGS.md). Both DATABASE_URL and TEST_DATABASE_URL must refer to the loopback database `epl_settings_test` on port 55432 (or the documented 15432 fallback). Set the isolated SMTP values and frontend/API URLs before applying the schema, then run:

```powershell
pnpm test
pnpm check-types
pnpm build
```

Without TEST_DATABASE_URL, integration tests are skipped. With it, the suite covers all six actor roles, direct API restrictions, new/unassigned recipients, wrong-account acceptance, origin checks, public-signup rejection, SMTP failure and actual Mailpit acceptance, expiry/cancellation/resend/reuse, concurrent requests, transaction rollback, last-administrator checks, and session revocation while retaining unrelated memberships. Existing account settings and recovery tests remain part of the same commands.

Manual checks use separate browser sessions and the isolated inbox: invite and accept, log in twice, change the role or remove the membership, and verify both sessions lose access. Also check mobile layouts, keyboard navigation, missing/invalid links and SMTP failure feedback. Production endpoint limits are 30 previews and five acceptance attempts per minute per client IP; origin validation is preserved. Limits use Better Auth's per-process storage, so configure shared rate-limit storage before running multiple API replicas.

## Local verification result

The implementation passed 106 tests: 52 auth tests, nine API tests, 41 frontend tests, and four email tests. This includes the existing account-settings and recovery coverage. Workspace type checks and both application builds passed; the frontend was rebuilt after the mobile layout correction.

Browser checks exercised real Mailpit invitation acceptance, a stopped SMTP service followed by resend, wrong-account switching, existing-profile preservation, and invitation reuse errors. Role changes and membership removal each invalidated two independently authenticated browsers; both returned 401 from protected APIs. Direct country-admin requests to change roles, remove memberships, or invite across hubs returned 403, and public signup was rejected. Desktop and 390px mobile forms and keyboard focus were checked, including the corrected country settings layout. The final browser reported no uncaught errors.

Trusted bootstrap was also run with supplied credentials against the existing isolated administrator and made no changes. The test services were stopped afterward. The schema regression test uses the disposable PostgreSQL database and rolls back its changes. The targeted setup command was also applied to the existing local development database to add its missing invitation table; the application's .env files and production services were not changed.


## Optional account protection

Invitations and role promotions do not require MFA enrollment. Every role can enable an authenticator, passkeys or email codes in Settings → Security. Enabled accounts still verify before invitation acceptance or dashboard access; validated invitation continuation is retained after verification or skipping optional setup. See [MFA setup and recovery](MFA.md) for database setup, backup codes and trusted operator recovery.


## Global Tenant Admin migration

Tenant Admin invitations target EPL Global Platform. Existing country-scoped Tenant Admin accounts require the repeatable migration described in [Global Tenant Admin](TENANT-ADMIN.md), including replacement Country Admins where needed, session revocation, and cancellation of old country-scoped Tenant Admin invitations.

## Weekly MFA verification

MFA is optional for every role. Enrolled accounts automatically remember each verified browser for seven days, including after ordinary sign-out. New browsers still require verification; password sign-ins do not extend the seven-day window. Security-method changes and backup-code regeneration still require the password and verification within five minutes. Settings > Security shows the expiry and offers **Forget this browser and sign out**. Password recovery and access/security revocation invalidate remembered browsers without disabling enrolled factors. See [MFA setup and recovery](MFA.md) for the additive `db:setup-mfa` command and rollout details.
