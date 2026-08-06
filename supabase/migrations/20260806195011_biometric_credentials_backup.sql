ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS webauthn_credentials JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.webauthn_credentials IS
  'User-owned WebAuthn credential identifiers for backup and device restore; no attestation or biometric data.';
