
-- Drop the view and replace with a secure RPC function
-- that explicitly checks admin or provider role
DROP VIEW IF EXISTS public.agent_data_hub;

-- Create a secure table-returning function instead of a view
CREATE OR REPLACE FUNCTION public.get_agent_data_hub()
RETURNS TABLE (
  termin_datum date,
  termin_zeit text,
  pid text,
  profi_name text,
  kid text,
  kunden_name text,
  kunden_telefon text,
  eqid text,
  pferdename text,
  gps_daten text,
  stall_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND (
      a.provider_id = auth.uid()
      OR public.is_admin(auth.uid())
    );
$$;
