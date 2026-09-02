import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/epldb"),
    BETTER_AUTH_SECRET: z.string().default("development_secret_32_characters_long_key"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    CORS_ORIGIN: z.string().url().default("http://localhost:3001"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    
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
