ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS webauthn_credentials JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.webauthn_credentials IS
  'User-owned WebAuthn credential identifiers for reference synchronization only; no private keys, biometric data, or passkey recovery material.';
