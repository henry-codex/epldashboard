ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS mfa_failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS mfa_locked_until timestamp;
ALTER TABLE public.session ADD COLUMN IF NOT EXISTS mfa_verified_at timestamp;
CREATE TABLE IF NOT EXISTS public.two_factor (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES public."user"(id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text NOT NULL,
  last_accepted_totp_step bigint
);

-- Independent method state and shared encrypted recovery codes; backfill exactly once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='totp_enabled') THEN
    ALTER TABLE public."user" ADD COLUMN totp_enabled boolean NOT NULL DEFAULT false;
    UPDATE public."user" SET totp_enabled = two_factor_enabled;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='mfa_backup_codes') THEN
    ALTER TABLE public."user" ADD COLUMN mfa_backup_codes text;
    ALTER TABLE public."user" ADD COLUMN mfa_backup_codes_confirmed boolean NOT NULL DEFAULT false;
    UPDATE public."user" u SET mfa_backup_codes=f.backup_codes, mfa_backup_codes_confirmed=u.totp_enabled
      FROM public.two_factor f WHERE f.user_id=u.id;
  END IF;
END $$;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS email_otp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS mfa_security_changed_at timestamp NOT NULL DEFAULT now();
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS mfa_email_last_sent_at timestamp;
ALTER TABLE public.session ADD COLUMN IF NOT EXISTS mfa_verification_method text;
CREATE TABLE IF NOT EXISTS public.passkey (
 id text PRIMARY KEY, name text, public_key text NOT NULL,
 user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 credential_id text NOT NULL UNIQUE, counter integer NOT NULL,
 device_type text NOT NULL, backed_up boolean NOT NULL, transports text,
 created_at timestamp DEFAULT now(), aaguid text
);
CREATE INDEX IF NOT EXISTS passkey_user_idx ON public.passkey(user_id);
CREATE TABLE IF NOT EXISTS public.mfa_challenge (
 id text PRIMARY KEY, user_id text REFERENCES public."user"(id) ON DELETE CASCADE,
 purpose text NOT NULL, binding text NOT NULL, code_hash text, data text,
 delivery_status text, created_at timestamp NOT NULL DEFAULT now(), expires_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS mfa_challenge_user_idx ON public.mfa_challenge(user_id);
CREATE TABLE IF NOT EXISTS public.mfa_email_send (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mfa_email_send_user_time_idx ON public.mfa_email_send(user_id, created_at);
