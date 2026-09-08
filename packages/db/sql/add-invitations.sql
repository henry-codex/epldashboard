-- Additive setup for databases that already have EPL authentication and hub tables.
-- Execute this file in a transaction. Existing accounts and memberships are retained.
CREATE TABLE IF NOT EXISTS "public"."invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "tenant_id" uuid NOT NULL,
  "issuer_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "delivery_status" text DEFAULT 'pending' NOT NULL,
  "last_attempt_at" timestamp DEFAULT now() NOT NULL,
  "sent_at" timestamp,
  "accepted_at" timestamp,
  "accepted_by" text,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "invitations_token_hash_unique" UNIQUE ("token_hash"),
  CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id"),
  CONSTRAINT "invitations_issuer_id_user_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."user"("id"),
  CONSTRAINT "invitations_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user"("id")
);
CREATE INDEX IF NOT EXISTS "invitations_tenant_idx" ON "public"."invitations" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_pending_email_idx" ON "public"."invitations" ("email") WHERE "status" = 'pending';
