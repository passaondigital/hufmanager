
-- ============================================================
-- FIX 1: partner_business_settings – banking PII exposed to anon
-- ============================================================
DROP POLICY IF EXISTS "Public can view visible partner profiles" ON public.partner_business_settings;

CREATE OR REPLACE FUNCTION public.get_public_partner_profile(p_partner_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', pbs.id,
    'partner_id', pbs.partner_id,
    'business_name', pbs.business_name,
    'owner_name', pbs.owner_name,
    'phone', pbs.phone,
    'email', pbs.email,
    'logo_url', pbs.logo_url,
    'specialty', pbs.specialty,
    'qualifications', pbs.qualifications,
    'website', pbs.website,
    'bio', pbs.bio,
    'country', pbs.country
  )
  FROM public.partner_business_settings pbs
  WHERE pbs.partner_id = p_partner_id
    AND pbs.public_profile_visible = true
  LIMIT 1;
$$;

-- ============================================================
-- FIX 2: agent_data_hub – recreate with security_invoker
-- ============================================================
DROP VIEW IF EXISTS public.agent_data_hub;

CREATE VIEW public.agent_data_hub
WITH (security_invoker = on)
AS
SELECT
  a.date AS termin_datum,
  a."time" AS termin_zeit,
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
  AND (a.provider_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- FIX 3: Privilege escalation via profiles.role self-update
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() = OLD.id
     AND NOT public.is_admin(auth.uid())
  THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_role_self_update ON public.profiles;
CREATE TRIGGER tr_prevent_role_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_update();

DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;
CREATE POLICY "Admins can manage help articles"
  ON public.help_articles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage glossary entries" ON public.glossary_entries;
CREATE POLICY "Admins can manage glossary entries"
  ON public.glossary_entries
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
