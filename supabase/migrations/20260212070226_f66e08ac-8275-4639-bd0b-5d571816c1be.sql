
-- ============================================================
-- FIX 1: Enable RLS on businesses table
-- ============================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own business"
ON public.businesses FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all businesses"
ON public.businesses FOR ALL
USING (public.is_admin(auth.uid()));

-- ============================================================
-- FIX 2: Recreate all views with security_invoker=on
-- This ensures views use the querying user's permissions, not the creator's
-- ============================================================

-- 2a) agent_data_hub
DROP VIEW IF EXISTS public.agent_data_hub;
CREATE VIEW public.agent_data_hub
WITH (security_invoker=on) AS
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
WHERE a.status <> 'cancelled';

-- 2b) safe_appointments
DROP VIEW IF EXISTS public.safe_appointments;
CREATE VIEW public.safe_appointments
WITH (security_invoker=on) AS
SELECT
  id, horse_id, provider_id, date, "time", duration, service_type, status,
  notes, is_confirmed_by_client, is_series_appointment, series_current,
  series_total, price, gait_analysis_done, gait_analysis_ok,
  completion_notes, completed_at, created_at, updated_at,
  CASE WHEN date >= (CURRENT_DATE - '7 days'::interval) THEN location ELSE NULL END AS location,
  CASE WHEN provider_id = auth.uid() THEN confirmation_token ELSE NULL END AS confirmation_token,
  CASE WHEN provider_id = auth.uid() THEN signature_url ELSE NULL END AS signature_url,
  CASE WHEN provider_id = auth.uid() THEN completion_pdf_url ELSE NULL END AS completion_pdf_url
FROM appointments;

-- 2c) safe_business_settings
DROP VIEW IF EXISTS public.safe_business_settings;
CREATE VIEW public.safe_business_settings
WITH (security_invoker=on) AS
SELECT
  id, user_id, business_name, owner_name, hero_headline, about_text,
  logo_url, primary_color, accept_new_customers, client_intake_status,
  gallery_images, impressum_text, terms_text, subdomain, reviews_layout,
  section_order, phone, email, address
FROM business_settings;

-- 2d) safe_feedbacks
DROP VIEW IF EXISTS public.safe_feedbacks;
CREATE VIEW public.safe_feedbacks
WITH (security_invoker=on) AS
SELECT
  id, provider_id, customer_name, rating, text, is_featured, created_at, source
FROM feedbacks;

-- 2e) safe_horses
DROP VIEW IF EXISTS public.safe_horses;
CREATE VIEW public.safe_horses
WITH (security_invoker=on) AS
SELECT
  id, owner_id, name, nickname, breed, birth_year, gender, color, height,
  photo_url, readable_id, equine_type, eqid, location_name, latitude,
  longitude, housing, discipline, usage, feeding_notes, shoeing_interval,
  last_anamnesis_date, anamnesis_interval_months, hoof_measurements,
  contacts, created_at, updated_at
FROM horses
WHERE deleted_at IS NULL;

-- 2f) safe_provider_profiles
DROP VIEW IF EXISTS public.safe_provider_profiles;
CREATE VIEW public.safe_provider_profiles
WITH (security_invoker=on) AS
SELECT
  id, full_name, avatar_url, readable_id, business_hours, email
FROM profiles
WHERE deleted_at IS NULL;

-- 2g) safe_reviews
DROP VIEW IF EXISTS public.safe_reviews;
CREATE VIEW public.safe_reviews
WITH (security_invoker=on) AS
SELECT
  id, provider_id, reviewer_name, rating, text, is_approved,
  created_at, updated_at, source, proof_image_url, is_visible,
  reactions, category
FROM reviews;
