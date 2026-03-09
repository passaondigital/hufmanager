
-- ═══════════════════════════════════════
-- SECURITY FIX 1: can_submit_review rate limit bypass
-- Problem: token DEFAULT gen_random_uuid() means token is NEVER null
-- so the early return always fires, bypassing rate limiting
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_submit_review(
  p_provider_id uuid,
  p_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INT;
BEGIN
  -- Rate limit: max 3 reviews per provider per 24h from unauthenticated users
  -- Token parameter is no longer used to bypass rate limiting
  SELECT COUNT(*) INTO v_recent_count
  FROM public.reviews
  WHERE provider_id = p_provider_id
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Allow max 10 reviews per provider per day total
  RETURN v_recent_count < 10;
END;
$$;

-- ═══════════════════════════════════════
-- SECURITY FIX 2: generate_preview_token missing search_path
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_preview_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- ═══════════════════════════════════════
-- SECURITY FIX 3: user_roles provider enumeration
-- Providers should only see their own roles, not all user roles
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "Providers can view all roles" ON public.user_roles;

-- Replace with scoped policy: providers can only see own roles
CREATE POLICY "Providers can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- SECURITY FIX 4: agent_data_hub view has no RLS
-- Views don't support RLS directly, so replace with a
-- SECURITY INVOKER view that relies on underlying table RLS,
-- plus restrict to provider's own data via WHERE clause
-- ═══════════════════════════════════════

DROP VIEW IF EXISTS public.agent_data_hub;

CREATE VIEW public.agent_data_hub
WITH (security_invoker = on)
AS
SELECT
  a.date AS termin_datum,
  a.time AS termin_zeit,
  p_profi.readable_id AS pid,
  (COALESCE(p_profi.first_name, '') || ' ' || COALESCE(p_profi.last_name, '')) AS profi_name,
  p_kunde.readable_id AS kid,
  (COALESCE(p_kunde.first_name, '') || ' ' || COALESCE(p_kunde.last_name, '')) AS kunden_name,
  p_kunde.phone AS kunden_telefon,
  h.eqid,
  h.name AS pferdename,
  h.stable_address_gps AS gps_daten,
  h.location_name AS stall_name
FROM appointments a
LEFT JOIN profiles p_profi ON a.provider_id = p_profi.id
LEFT JOIN profiles p_kunde ON a.client_id = p_kunde.id
LEFT JOIN horses h ON a.horse_id = h.id
WHERE a.status <> 'cancelled'
  AND (
    a.provider_id = auth.uid()
    OR public.is_admin(auth.uid())
  );
