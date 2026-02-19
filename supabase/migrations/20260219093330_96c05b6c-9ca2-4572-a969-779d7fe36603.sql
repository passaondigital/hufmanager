
-- Add partner fields to access_grants for ecosystem partner invitations
ALTER TABLE public.access_grants 
ADD COLUMN IF NOT EXISTS partner_email text,
ADD COLUMN IF NOT EXISTS partner_name text;

-- Create index for partner_email lookups (used by HufiAi proxy)
CREATE INDEX IF NOT EXISTS idx_access_grants_partner_email 
ON public.access_grants (partner_email) 
WHERE partner_email IS NOT NULL;

-- Create a secure function for HufiAi to query partner shared data
CREATE OR REPLACE FUNCTION public.get_partner_shared_data(p_partner_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate email format
  IF p_partner_email IS NULL OR p_partner_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('error', 'Invalid email');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'grant_id', ag.id,
      'provider_id', ag.provider_id,
      'client_id', ag.client_id,
      'status', ag.status,
      'is_active', ag.is_active,
      'can_view_basic', ag.can_view_basic,
      'can_view_medical', ag.can_view_medical,
      'can_create_appointments', ag.can_create_appointments,
      'granted_at', ag.granted_at,
      'provider_name', (SELECT full_name FROM profiles WHERE id = ag.provider_id AND deleted_at IS NULL),
      'client_name', (SELECT full_name FROM profiles WHERE id = ag.client_id AND deleted_at IS NULL)
    )
  )
  INTO result
  FROM access_grants ag
  WHERE ag.partner_email = p_partner_email
    AND ag.is_active = true;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Update RLS: Allow partner_email-based select for ecosystem access
CREATE POLICY "Partners can view their own grants by email"
ON public.access_grants
FOR SELECT
USING (
  partner_email IS NOT NULL 
  AND partner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
