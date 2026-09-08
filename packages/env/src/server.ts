import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { isIP } from "node:net";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/epldb"),
    BETTER_AUTH_SECRET: z.string().default("development_secret_32_characters_long_key"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    CORS_ORIGIN: z.string().url().default("http://localhost:3001"),
    PASSKEY_RP_ID: z.string().trim().min(1).optional(),
    TRUSTED_PROXY_CIDRS: z.string().default("").transform((value) => value.split(",").map((part) => part.trim()).filter(Boolean))
      .refine((values) => values.every((value) => {
        const [address, prefix, extra] = value.split("/");
        const version = isIP(address ?? "");
        return Boolean(version) && extra === undefined && (prefix === undefined || (String(Number(prefix)) === prefix && Number(prefix) > 0 && Number(prefix) <= (version === 4 ? 32 : 128)));
      }), "Use a comma-separated list of trusted proxy IP addresses or CIDRs; catch-all ranges are not allowed."),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(process.env.NODE_ENV === "production" ? 587 : 1025),
    SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().email().optional(),
    
    // Cloudflare R2 / S3 Compatible Storage Configuration
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_PUBLIC_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
