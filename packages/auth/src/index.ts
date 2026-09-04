import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
export { fromNodeHeaders, toNodeHandler } from "better-auth/node";

import { db } from "@epl-fellows-platform/db";
import * as schema from "@epl-fellows-platform/db/schema/auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "development_secret_32_characters_long_key",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:3001"],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      // The deployed frontend (Vercel) and API (Heroku) are different sites,
      // so the session cookie needs SameSite=None to survive cross-site
      // fetch — Lax is only sent on top-level navigations, not XHR/fetch.
      // None requires Secure, which only makes sense (and is set) in prod.
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
  plugins: [],
});

export * from "./permissions";

