import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "http://localhost:3001",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "development_secret_32_characters_long_key",
  },
});
