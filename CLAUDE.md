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
