import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), passkeyClient()],
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
});
