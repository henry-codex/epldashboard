# epl-fellows-platform

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: node
- **Package Manager**: pnpm

### Frontend

- Framework: next
- CSS: tailwind
- UI Library: shadcn-ui
- State: zustand

### Backend

- Framework: nestjs
- API: trpc
- Validation: zod

### Database

- Database: postgres
- ORM: drizzle

### Authentication

- Provider: better-auth

### Additional Features

- Testing: vitest
- AI: vercel-ai
- Email: nodemailer
- Realtime: socket-io
- Job Queue: bullmq

## Project Structure

```
epl-fellows-platform/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend API
├── packages/
│   ├── api/         # API layer
│   ├── auth/        # Authentication
│   └── db/          # Database schema
```

## Common Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm db:push` - Push database schema
- `pnpm db:studio` - Open database UI
- `pnpm db:seed` - Trusted initial administrator bootstrap; requires supplied BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD. See docs/USER-ONBOARDING.md. Public signup is disabled; subsequent accounts require invitations.

## Environment Variables

Each app has its own `.env` (gitignored) with a matching `.env.example` (committed template) — copy the example and fill in real values before running that app.

- `apps/server/.env` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, and optional S3/R2 storage vars. Schema validated in `packages/env/src/server.ts`.
- `apps/web/.env` — `NEXT_PUBLIC_SERVER_URL` (points at the API server) and `NEXT_PUBLIC_APP_URL`. Schema validated in `packages/env/src/web.ts`.

## Deployment

- **Frontend (`apps/web`)**: deployed to Vercel. Set `NEXT_PUBLIC_SERVER_URL` there to the API server's public URL.
- **API server (`apps/server`)**: deployed to Heroku from the repo root (`git push heroku master`) — see root `Procfile` and `app.json`.
  - Heroku's Node buildpack picks up `pnpm` via the `packageManager` field in the root `package.json`.
  - `heroku-postbuild` (root `package.json`) runs `turbo run build --filter=server...`, building only `apps/server` and its workspace dependencies (not `apps/web`).
  - The Procfile's `release` step runs `pnpm --filter @epl-fellows-platform/db db:push --force` automatically before every deploy, so schema changes go live without a manual step. This project uses Drizzle's `push` workflow (no versioned migration files) — the `out: ./src/migrations` folder in `packages/db/drizzle.config.ts` is unused.
  - `packages/db/src/index.ts` and `packages/db/drizzle.config.ts` both negotiate SSL automatically for any non-`localhost` `DATABASE_URL` (required by Heroku Postgres's self-signed cert).
  - Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the Heroku app's own URL), and `CORS_ORIGIN` (the Vercel frontend's URL) as Heroku config vars.

## Maintenance

Keep CLAUDE.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.

## Audit trail

Settings includes an administrator-only Audit Log. Apply `pnpm --filter @epl-fellows-platform/db db:setup-audit` before starting the server. Audited mutations use transaction context and PostgreSQL triggers for business records; security events share the auth transactions. Bootstrap requires `BOOTSTRAP_OPERATOR`; applied CLI imports require `--operator`. See `docs/AUDIT-LOG.md` for event coverage, redaction, authorization, and the dry-run-first 12-month retention command. Preserve audit history independently of the mutable activity feed.

## Account security

Shared account profile and security settings use Better Auth. Password resets use the shared `packages/email` Nodemailer transport, configured with SMTP_* variables; local mail is captured in Mailpit. Password changes revoke other sessions; recovery revokes all sessions. See `docs/ACCOUNT-SETTINGS.md` for configuration and isolated tests.

## Global Tenant Admin

Tenant Admin uses the existing active GLOBAL workspace for cross-country operations, global events and alumni board management. Super Admin retains hub and membership administration. Before startup, run the dry-run-first db:migrate-tenant-admins command and resolve reported blockers. See docs/TENANT-ADMIN.md. Shared capabilities come from current active memberships; do not grant global access from the role string alone.
