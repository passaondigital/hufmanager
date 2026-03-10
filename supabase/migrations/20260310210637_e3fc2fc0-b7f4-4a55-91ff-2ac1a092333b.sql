
CREATE TABLE public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own consent
CREATE POLICY "Users can insert own consent"
ON public.consent_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own consent
CREATE POLICY "Users can read own consent"
ON public.consent_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all consents
CREATE POLICY "Admins can read all consents"
ON public.consent_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_consent_log_user_id ON public.consent_log(user_id);
CREATE INDEX idx_consent_log_consent_type ON public.consent_log(consent_type);
