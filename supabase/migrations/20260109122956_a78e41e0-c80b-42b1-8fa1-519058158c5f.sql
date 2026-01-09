-- =============================================
-- SECURITY FIX: 5 Error-Level Issues beheben
-- =============================================

-- 1. BUSINESS_SETTINGS: Sichere View ohne Finanz-/Bankdaten für Clients
-- =============================================
CREATE OR REPLACE VIEW public.safe_business_settings AS
SELECT 
  id, 
  user_id, 
  business_name, 
  owner_name, 
  hero_headline, 
  about_text, 
  logo_url, 
  primary_color,
  accept_new_customers, 
  client_intake_status, 
  gallery_images,
  impressum_text, 
  terms_text, 
  subdomain, 
  reviews_layout, 
  section_order,
  phone,
  email,
  address
  -- AUSGESCHLOSSEN: iban, bic, bank_name, tax_number, stripe_public_key, paypal_link, copecart_vendor_id, copecart_customer_portal_url
FROM public.business_settings;

-- RLS für die View aktivieren
ALTER VIEW public.safe_business_settings SET (security_invoker = true);

-- 2. PROFILES: Sichere View für Provider-Profile (nur öffentliche Daten)
-- =============================================
CREATE OR REPLACE VIEW public.safe_provider_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  readable_id,
  business_hours,
  email
  -- AUSGESCHLOSSEN: phone, city, zip_code, stable_*, emergency_contacts, subscription_*, feature_flags
FROM public.profiles
WHERE deleted_at IS NULL;

-- RLS für die View aktivieren
ALTER VIEW public.safe_provider_profiles SET (security_invoker = true);

-- 3. CONTACTS: Policies verschärfen - Email-basierte Policy entfernen
-- =============================================
DROP POLICY IF EXISTS "Contacts access for providers and owners" ON contacts;

-- Neue Policy: Nur Provider können ihre eigenen Kontakte verwalten
CREATE POLICY "Providers manage own contacts" 
ON public.contacts
FOR ALL 
USING (provider_id = auth.uid());

-- Benutzer können ihren eigenen Kontakt-Eintrag sehen (via profile_id)
CREATE POLICY "Users view own contact entry" 
ON public.contacts
FOR SELECT 
USING (profile_id = auth.uid());

-- Admins können alle Kontakte sehen
CREATE POLICY "Admins can view all contacts" 
ON public.contacts
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- 4. HORSES: Medical-Daten nur mit can_view_medical Berechtigung
-- =============================================

-- Sichere Function für Medical-Daten Zugriff
CREATE OR REPLACE FUNCTION public.get_horse_medical_data(p_horse_id uuid)
RETURNS TABLE (
  medical_history text, 
  health_status text, 
  special_notes text,
  hoof_protection text,
  hoof_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    h.medical_history, 
    h.health_status, 
    h.special_notes,
    h.hoof_protection,
    h.hoof_type
  FROM horses h
  WHERE h.id = p_horse_id
    AND h.deleted_at IS NULL
    AND (
      -- Owner hat immer Zugriff
      h.owner_id = auth.uid()
      -- Provider mit can_view_medical = true
      OR EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.client_id = h.owner_id
          AND ag.provider_id = auth.uid()
          AND ag.is_active = true
          AND ag.status = 'active'
          AND ag.can_view_medical = true
      )
      -- Admins haben immer Zugriff
      OR public.is_admin(auth.uid())
    );
$$;

-- Sichere View für Pferde ohne sensible Medical-Daten
CREATE OR REPLACE VIEW public.safe_horses AS
SELECT 
  id,
  owner_id,
  name,
  nickname,
  breed,
  birth_year,
  gender,
  color,
  height,
  photo_url,
  readable_id,
  equine_type,
  eqid,
  location_name,
  latitude,
  longitude,
  housing,
  discipline,
  usage,
  feeding_notes,
  shoeing_interval,
  last_anamnesis_date,
  anamnesis_interval_months,
  hoof_measurements,
  contacts,
  created_at,
  updated_at
  -- AUSGESCHLOSSEN für Provider ohne can_view_medical: 
  -- medical_history, health_status, special_notes, hoof_protection, hoof_type
FROM public.horses
WHERE deleted_at IS NULL;

ALTER VIEW public.safe_horses SET (security_invoker = true);

-- 5. APPOINTMENTS: Location nur für relevante Zeiträume sichtbar
-- =============================================
CREATE OR REPLACE VIEW public.safe_appointments AS
SELECT 
  id, 
  horse_id, 
  provider_id, 
  date, 
  time, 
  duration,
  service_type, 
  status, 
  notes,
  is_confirmed_by_client,
  is_series_appointment,
  series_current,
  series_total,
  price,
  gait_analysis_done,
  gait_analysis_ok,
  completion_notes,
  completed_at,
  created_at,
  updated_at,
  -- Location nur für aktuelle/zukünftige Termine + 7 Tage zurück
  CASE 
    WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN location
    ELSE NULL 
  END as location,
  -- Sensible Felder nur für beteiligte Parteien
  CASE 
    WHEN provider_id = auth.uid() THEN confirmation_token
    ELSE NULL 
  END as confirmation_token,
  CASE 
    WHEN provider_id = auth.uid() THEN signature_url
    ELSE NULL 
  END as signature_url,
  CASE 
    WHEN provider_id = auth.uid() THEN completion_pdf_url
    ELSE NULL 
  END as completion_pdf_url
FROM public.appointments;

ALTER VIEW public.safe_appointments SET (security_invoker = true);

-- =============================================
-- ZUSÄTZLICHE SICHERHEIT: Function für Provider-Settings Zugriff
-- =============================================
CREATE OR REPLACE FUNCTION public.get_provider_business_settings(p_provider_id uuid)
RETURNS TABLE (
  business_name text,
  owner_name text,
  phone text,
  email text,
  address text,
  logo_url text,
  about_text text,
  hero_headline text,
  primary_color text,
  accept_new_customers boolean,
  subdomain text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bs.business_name,
    bs.owner_name,
    bs.phone,
    bs.email,
    bs.address,
    bs.logo_url,
    bs.about_text,
    bs.hero_headline,
    bs.primary_color,
    bs.accept_new_customers,
    bs.subdomain
  FROM business_settings bs
  WHERE bs.user_id = p_provider_id
    AND EXISTS (
      -- Nur wenn Client eine aktive Verbindung hat
      SELECT 1 FROM access_grants ag
      WHERE ag.provider_id = p_provider_id
        AND ag.client_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
    );
$$;