import { createAuthClient } from "@neondatabase/auth/next";

// Neon Auth manages sessions via httpOnly cookies set by the server route.
// No baseUrl config needed — routing is handled server-side by createNeonAuth.
export const authClient = createAuthClient();
