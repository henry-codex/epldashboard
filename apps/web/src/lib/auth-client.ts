import { createAuthClient } from "better-auth/react";

// Auth API is served by this Next.js app at /api/auth (proxies to Neon Auth)
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
});
