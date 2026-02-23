
-- ═══════════════════════════════════════════════════════
-- 1. service_id als echte FK auf appointments
-- ═══════════════════════════════════════════════════════

-- Neue Spalte service_id (nullable, da Altdaten keinen FK haben)
ALTER TABLE public.appointments
ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Index für performante Joins/Reporting
CREATE INDEX idx_appointments_service_id ON public.appointments(service_id);

-- Bestehende service_type Textwerte → service_id matchen (Backfill)
UPDATE public.appointments a
SET service_id = s.id
FROM public.services s
WHERE a.service_type = s.name
  AND a.provider_id = s.provider_id
  AND a.service_id IS NULL;

-- ═══════════════════════════════════════════════════════
-- 2. Aufräumen: Redundante Felder konsolidieren
-- ═══════════════════════════════════════════════════════

-- 2a) services: 3 Sortierfelder → 1 (sort_order bleibt)
-- Zuerst sort_order mit besten Daten befüllen
UPDATE public.services
SET sort_order = COALESCE(sort_order, position, rank, 0);

-- Dann die redundanten Spalten entfernen
ALTER TABLE public.services DROP COLUMN IF EXISTS position;
ALTER TABLE public.services DROP COLUMN IF EXISTS rank;

-- 2b) services: 2 Kategoriefelder → 1 (category bleibt)
-- Daten zusammenführen: service_category → category wenn category leer
UPDATE public.services
SET category = COALESCE(category, service_category)
WHERE category IS NULL AND service_category IS NOT NULL;

ALTER TABLE public.services DROP COLUMN IF EXISTS service_category;

-- 2c) offers.billing_type: text → enum (gleicher Typ wie services)
-- Bestehende Textwerte auf gültige Enum-Werte mappen
UPDATE public.offers SET billing_type = 'standard' WHERE billing_type = 'einmalig' OR billing_type IS NULL;
UPDATE public.offers SET billing_type = 'flat_rate' WHERE billing_type IN ('abo', 'flatrate', 'pauschal');
UPDATE public.offers SET billing_type = 'series' WHERE billing_type IN ('paket', 'series');

-- Spalte von text auf enum umwandeln
ALTER TABLE public.offers 
ALTER COLUMN billing_type DROP DEFAULT,
ALTER COLUMN billing_type TYPE billing_type USING billing_type::billing_type,
ALTER COLUMN billing_type SET DEFAULT 'standard';

-- ═══════════════════════════════════════════════════════
-- 3. Preishistorie: Änderungen ändern nicht die Vergangenheit
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.service_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  old_billing_type billing_type,
  new_billing_type billing_type,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

-- Index für schnelle Abfragen nach Service
CREATE INDEX idx_service_price_history_service_id ON public.service_price_history(service_id);
CREATE INDEX idx_service_price_history_changed_at ON public.service_price_history(changed_at);

-- RLS aktivieren
ALTER TABLE public.service_price_history ENABLE ROW LEVEL SECURITY;

-- Provider sieht nur seine eigene Preishistorie
CREATE POLICY "Provider can view own service price history"
ON public.service_price_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_price_history.service_id
      AND s.provider_id = auth.uid()
  )
);

-- Admins sehen alles
CREATE POLICY "Admins can view all price history"
ON public.service_price_history FOR SELECT
USING (public.is_admin(auth.uid()));

-- Trigger: Automatisch Preisänderungen loggen
CREATE OR REPLACE FUNCTION public.log_service_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Nur loggen wenn sich Preis oder billing_type geändert hat
  IF OLD.base_price IS DISTINCT FROM NEW.base_price 
     OR OLD.billing_type IS DISTINCT FROM NEW.billing_type THEN
    INSERT INTO public.service_price_history (
      service_id, old_price, new_price, 
      old_billing_type, new_billing_type, changed_by
    ) VALUES (
      NEW.id, OLD.base_price, NEW.base_price,
      OLD.billing_type, NEW.billing_type, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_service_price_change
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.log_service_price_change();

-- Partner-Services: gleicher Trigger für Preishistorie
CREATE TABLE public.partner_service_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_service_id uuid NOT NULL REFERENCES public.partner_services(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

ALTER TABLE public.partner_service_price_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_partner_price_history_service ON public.partner_service_price_history(partner_service_id);

CREATE POLICY "Partner can view own price history"
ON public.partner_service_price_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.partner_services ps
    WHERE ps.id = partner_service_price_history.partner_service_id
      AND ps.partner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all partner price history"
ON public.partner_service_price_history FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_partner_service_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
    INSERT INTO public.partner_service_price_history (
      partner_service_id, old_price, new_price, changed_by
    ) VALUES (
      NEW.id, OLD.base_price, NEW.base_price, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_partner_service_price_change
BEFORE UPDATE ON public.partner_services
FOR EACH ROW
EXECUTE FUNCTION public.log_partner_service_price_change();
