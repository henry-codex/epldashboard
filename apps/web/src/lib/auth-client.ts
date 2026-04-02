import { createAuthClient } from "@neondatabase/auth/next/client";

// Auth API is served by this Next.js app at /api/auth (proxies to Neon Auth)
export const authClient = createAuthClient({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
});
