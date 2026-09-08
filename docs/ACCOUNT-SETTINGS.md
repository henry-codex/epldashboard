# Account settings and security

Every signed-in user can open /dashboard/settings/profile and /dashboard/settings/security from the account menu. Profile editing changes only the display name. Email, role, and country assignments remain managed by administrators.

Changing a password requires the current password and signs out every other session. Email recovery resets the password and signs out all sessions. Reset links expire after one hour and cannot be reused. Session controls display recorded browser/IP metadata, not a geographic location or historical audit log.

## Local email

Run `docker compose up -d mailpit`. The inbox is at http://localhost:8025; SMTP listens on 127.0.0.1:1025. These ports bind only to localhost.

Optional settings in apps/server/.env (these are the development defaults):

```dotenv
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@epl.local
```

Omit SMTP_USER and SMTP_PASS for Mailpit. Set NEXT_PUBLIC_APP_URL to the frontend address and CORS_ORIGIN to the same origin. BETTER_AUTH_URL and NEXT_PUBLIC_SERVER_URL must identify the API server. Open /forgot-password, submit a real local account email, and follow the message in Mailpit.

## Production

Configure SMTP_HOST, SMTP_PORT, SMTP_SECURE, and SMTP_FROM_EMAIL before starting the API. Configure SMTP_USER and SMTP_PASS together if the relay requires authentication. Use SMTP_SECURE=true for implicit TLS on port 465, or false for a STARTTLS relay on port 587. The server validates configuration at startup. Provide the variables to the existing Heroku process; do not put credentials in source control.

Reset email delivery runs in the long-lived server process without delaying the recovery response. Delivery failures are logged without recipient addresses, reset links, credentials, or provider response bodies. The response deliberately does not reveal whether an email is registered. Investigate delivery logs and SMTP settings if messages do not arrive. There is no durable retry queue in this release.

Better Auth's production rate limiter is enabled, with reset requests limited to three per minute and reset submissions to ten per minute per client IP. Its recovery limits are in memory per process; shared recovery rate-limit storage is needed before scaling across multiple API instances. MFA verification uses separate persisted IP counters, documented in [MFA.md](MFA.md). Existing cookie/origin configuration remains in use; verify the actual frontend/API domains in a deployment smoke test.

## Verification

`pnpm test` runs focused unit/component tests. The auth integration suite additionally needs TEST_DATABASE_URL and the schema applied to a disposable PostgreSQL database. It refuses any URL except a loopback connection to port 55432 and database epl_settings_test.

Start isolated services. If these containers already exist, use `docker start epl-settings-test-db epl-settings-test-mail` instead of creating them again:

```powershell
docker run --detach --name epl-settings-test-db --publish 127.0.0.1:55432:5432 --env POSTGRES_PASSWORD=epl_settings_test --env POSTGRES_DB=epl_settings_test postgres:16-alpine
docker run --detach --name epl-settings-test-mail --publish 127.0.0.1:11025:1025 --publish 127.0.0.1:18025:8025 axllent/mailpit:v1.27.4
$env:DATABASE_URL = 'postgres://postgres:epl_settings_test@127.0.0.1:55432/epl_settings_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:SMTP_HOST = '127.0.0.1'
$env:SMTP_PORT = '11025'
$env:SMTP_SECURE = 'false'
$env:SMTP_FROM_EMAIL = 'noreply@epl.local'
pnpm --filter @epl-fellows-platform/db db:push --force
pnpm test
pnpm check-types
pnpm build
```

Use separate browser contexts to verify that a revoked session cannot access protected data. Check desktop/mobile layouts, keyboard navigation, all roles, accounts without memberships, direct administration links, and recovery through the isolated inbox at http://localhost:18025. No production database is needed. Profile, password and session settings reuse existing auth tables; [invitation onboarding](USER-ONBOARDING.md) adds an invitations table, and [MFA](MFA.md) adds factor storage and verification fields.

For manual browser checks, seed the isolated database with `pnpm --filter server exec tsx ../../packages/auth/src/scripts/seed-settings-test.ts`. This creates `settings-<role>@example.test` for each of the six roles and `settings-unassigned@example.test`, all with initial password `Settings-test-password-123`. The script refuses other databases and leaves existing accounts untouched.

## Multi-factor authentication

Authenticator and passkey verification are available in Security; super, tenant and country administrators must enroll at least one. Other users may also opt into email OTP after their password. See [MFA setup and recovery](MFA.md). Password recovery preserves enrolled MFA.
