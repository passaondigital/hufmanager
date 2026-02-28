
-- HM Connect Invitations table
CREATE TABLE public.hm_connect_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  invited_name text,
  invite_message text,
  invite_role text NOT NULL DEFAULT 'provider' CHECK (invite_role IN ('provider', 'client', 'partner')),
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_email_format CHECK (invited_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT invite_message_length CHECK (char_length(invite_message) <= 500)
);

-- Index for token lookups
CREATE UNIQUE INDEX idx_hm_connect_invitations_token ON public.hm_connect_invitations(token);
-- Index for listing by inviter
CREATE INDEX idx_hm_connect_invitations_invited_by ON public.hm_connect_invitations(invited_by);
-- Index for email lookups on registration
CREATE INDEX idx_hm_connect_invitations_email ON public.hm_connect_invitations(invited_email);

-- RLS
ALTER TABLE public.hm_connect_invitations ENABLE ROW LEVEL SECURITY;

-- Users can see their own invitations (sent)
CREATE POLICY "Users can view own invitations"
  ON public.hm_connect_invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

-- Users can insert invitations
CREATE POLICY "Users can create invitations"
  ON public.hm_connect_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Users can cancel their own invitations
CREATE POLICY "Users can update own invitations"
  ON public.hm_connect_invitations FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid());

-- Rate limiting trigger: max 10 invites per user per day
CREATE OR REPLACE FUNCTION public.check_invite_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.hm_connect_invitations
    WHERE invited_by = NEW.invited_by
    AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Zu viele Einladungen. Maximal 10 pro Tag.';
  END IF;
  
  -- Sanitize inputs
  NEW.invited_email := LOWER(TRIM(NEW.invited_email));
  IF NEW.invited_name IS NOT NULL THEN
    NEW.invited_name := TRIM(regexp_replace(NEW.invited_name, '<[^>]*>', '', 'g'));
  END IF;
  IF NEW.invite_message IS NOT NULL THEN
    NEW.invite_message := TRIM(regexp_replace(NEW.invite_message, '<[^>]*>', '', 'g'));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invite_rate_limit_trigger
  BEFORE INSERT ON public.hm_connect_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_invite_rate_limit();
