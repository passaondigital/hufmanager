
-- ═══════════════════════════════════════════════════════════
-- SECURITY FIX MIGRATION – 05. März 2026
-- Step 1: Schema changes first (columns before policies)
-- ═══════════════════════════════════════════════════════════

-- ERROR 4: Add valid_until and auto_revoke to access_grants FIRST
ALTER TABLE public.access_grants
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_revoke_on_last_appointment BOOLEAN DEFAULT false;

-- WARNING: Add consent tracking to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS data_shared_with_partners BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_shared_with_employees BOOLEAN DEFAULT true;

-- ═══════════════════════════════════════════════════════════
-- ERROR 1: PROFILES – Strict SELECT policy
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Enable all access for users based on id" ON public.profiles;

CREATE POLICY "Users can select own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Verbundene Profile sehen" ON public.profiles;

CREATE POLICY "profiles_strict_connected_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.provider_id = auth.uid()
        AND ag.client_id = profiles.id
        AND ag.is_active = true
        AND ag.status = 'active'
        AND (ag.valid_until IS NULL OR ag.valid_until > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = auth.uid()
        AND ag.provider_id = profiles.id
        AND ag.is_active = true
        AND ag.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = auth.uid()
        AND ep.provider_id = profiles.id
        AND ep.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.employee_profiles ep
      WHERE ep.user_id = auth.uid()
        AND ep.status = 'active'
        AND EXISTS (
          SELECT 1 FROM public.access_grants ag
          WHERE ag.provider_id = ep.provider_id
            AND ag.client_id = profiles.id
            AND ag.is_active = true
            AND ag.status = 'active'
        )
    )
  );

-- ═══════════════════════════════════════════════════════════
-- ERROR 2: HORSES – Medical data segregation views
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.horses_basic
WITH (security_invoker = on)
AS SELECT
  id, owner_id, name, nickname, official_name, breed, birth_year, birth_date,
  gender, color, height, height_cm, chip_number, discipline, usage, housing,
  photo_url, readable_id, equine_type, holding_type, usage_type,
  location_name, latitude, longitude, stable_address_gps,
  shoeing_interval, shoeing_status, hoof_type, hoof_protection,
  hoof_measurements, hoof_details, hoof_data,
  last_anamnesis_date, anamnesis_interval_months,
  is_new_horse, last_appointment_date, next_appointment_due,
  created_at, updated_at, deleted_at, organization_id,
  primary_location_id, app_source, recall_interval_weeks
FROM public.horses;

CREATE OR REPLACE VIEW public.horses_medical
WITH (security_invoker = on)
AS SELECT
  id, owner_id, name, breed, photo_url, readable_id,
  health_status, medical_history, health_issues_general,
  feeding_notes, special_notes, contacts, documents_urls
FROM public.horses;

DROP POLICY IF EXISTS "Partners can view shared horses" ON public.horses;

CREATE POLICY "Partners can view shared horses basic"
  ON public.horses FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.horse_partner_access hpa
      WHERE hpa.horse_id = horses.id
        AND hpa.partner_profile_id = auth.uid()
        AND hpa.is_active = true
        AND hpa.status = 'active'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- ERROR 3: INVOICES – Client view without payment internals
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.invoices_client_view
WITH (security_invoker = on)
AS SELECT
  id, invoice_number, client_id, horse_id, issue_date, due_date,
  total_amount, status, pdf_url, notes, created_at, updated_at,
  provider_id, customer_type, payment_method, payment_status, paid_at,
  cancelled_at, cancellation_reason, credit_note_for, signature_url
FROM public.invoices;

-- ═══════════════════════════════════════════════════════════
-- ERROR 4: GPS/LOCATIONS – Time-limited access
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "provider_view_client_locations" ON public.client_locations;

CREATE POLICY "provider_view_client_locations_timed"
  ON public.client_locations FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = client_locations.client_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
        AND (ag.valid_until IS NULL OR ag.valid_until > now())
    )
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Provider can view client horses" ON public.horses;

CREATE POLICY "Provider can view client horses timed"
  ON public.horses FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = horses.owner_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
        AND (ag.valid_until IS NULL OR ag.valid_until > now())
    )
  );

-- Auto-revoke trigger
CREATE OR REPLACE FUNCTION public.auto_revoke_access_on_last_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_has_future boolean;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT h.owner_id INTO v_client_id
  FROM public.horses h WHERE h.id = NEW.horse_id AND h.deleted_at IS NULL;

  IF v_client_id IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.horses h ON h.id = a.horse_id AND h.deleted_at IS NULL
    WHERE a.provider_id = NEW.provider_id
      AND h.owner_id = v_client_id
      AND a.date > CURRENT_DATE
      AND a.status NOT IN ('completed', 'cancelled')
      AND a.id != NEW.id
  ) INTO v_has_future;

  IF NOT v_has_future THEN
    UPDATE public.access_grants
    SET valid_until = now() + INTERVAL '90 days'
    WHERE provider_id = NEW.provider_id
      AND client_id = v_client_id
      AND is_active = true
      AND auto_revoke_on_last_appointment = true
      AND valid_until IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_revoke_access ON public.appointments;
CREATE TRIGGER trg_auto_revoke_access
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_revoke_access_on_last_appointment();

-- ═══════════════════════════════════════════════════════════
-- WARNING: APPOINTMENTS – Partner consent
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Partners can view appointments for shared horses" ON public.appointments;

CREATE POLICY "Partners can view shared appointments with consent"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    data_shared_with_partners = true
    AND EXISTS (
      SELECT 1 FROM public.horse_partner_access hpa
      WHERE hpa.horse_id = appointments.horse_id
        AND hpa.partner_profile_id = auth.uid()
        AND hpa.is_active = true
        AND hpa.status = 'active'
    )
  );

CREATE OR REPLACE VIEW public.appointments_partner_view
WITH (security_invoker = on)
AS SELECT
  id, horse_id, date, time, service_type, status, location, duration,
  price, provider_id, is_confirmed_by_client, notes
FROM public.appointments
WHERE data_shared_with_partners = true;

-- ═══════════════════════════════════════════════════════════
-- HELPER: Timed access grant check function
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_active_access_grant(
  _provider_id uuid, _client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_grants
    WHERE provider_id = _provider_id
      AND client_id = _client_id
      AND is_active = true
      AND status = 'active'
      AND (valid_until IS NULL OR valid_until > now())
  )
$$;
