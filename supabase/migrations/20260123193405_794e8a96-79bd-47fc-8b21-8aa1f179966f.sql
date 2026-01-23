-- =====================================================
-- SICHERES SCHEMA-UPDATE FÜR DIE 5 A's ARCHITEKTUR
-- Regel: NUR ERWEITERUNGEN - KEINE LÖSCHUNGEN
-- =====================================================

-- =====================================================
-- 1. PROFILES TABELLE (Provider #pid)
-- Erweiterung für Business & Fahrzeug-Daten
-- =====================================================

-- Firmen-/Steuer-Daten für Rechnungsstellung
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bic text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name text;

-- Fahrzeug-Daten für Fahrtenbuch/Tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_plate text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_consumption_per_100km numeric;

-- Kunden-spezifische Felder (für Client-Rolle)
-- Payment Rating: A=Super, B=Ok, C=Naja, D=Warnung
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_rating text CHECK (payment_rating IN ('A', 'B', 'C', 'D') OR payment_rating IS NULL);
-- Client Status: lead, active, inactive, blocked
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'active';
-- Geo-Koordinaten für Stall/Koppel
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS geo_lat double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS geo_lng double precision;
-- Adress-Felder
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- =====================================================
-- 2. HORSES TABELLE (Equide #eqid)
-- Erweiterung für Huf-Daten und Haltung
-- =====================================================

-- Huf-spezifische Daten als JSONB (flexibel erweiterbar)
-- Struktur: { "size": "130x120", "stance": "normal", "notes": "..." }
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS hoof_data jsonb DEFAULT '{}'::jsonb;

-- Haltungsart: box, open_stable, paddock, mixed
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS holding_type text;

-- Beschlag-Status: barefoot, front_only, all_four, orthopedic
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS shoeing_status text;

-- =====================================================
-- 3. SERVICES TABELLE - Prüfen ob provider_id existiert
-- =====================================================

-- Services muss provider_id haben (sollte bereits existieren)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN provider_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- Service-Kategorie für Gruppierung
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_category text;

-- Tour-Logik: Einzeltermin vs. Sammeltermin
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_group_service boolean DEFAULT false;

-- =====================================================
-- 4. APPOINTMENTS - Sicherstellen dass provider_id da ist
-- =====================================================

-- Appointments sollte bereits provider_id haben, aber sichergehen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN client_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- =====================================================
-- 5. INVOICES TABELLE - Provider-Isolation sicherstellen
-- =====================================================

-- Falls invoices existiert, sicherstellen dass provider_id da ist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices'
  ) THEN
    -- Prüfen ob provider_id existiert
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'provider_id'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN provider_id uuid REFERENCES public.profiles(id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- 6. NEUE TABELLE: QUOTES (Kostenvoranschläge)
-- Für "Offene Angebote" unter Angebote
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id),
  client_id uuid REFERENCES public.profiles(id),
  horse_id uuid REFERENCES public.horses(id),
  
  -- Angebots-Details
  quote_number text,
  title text NOT NULL,
  description text,
  items jsonb DEFAULT '[]'::jsonb, -- [{name, quantity, unit_price, total}]
  total_amount numeric NOT NULL DEFAULT 0,
  
  -- Status-Tracking
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  responded_at timestamp with time zone,
  valid_until date,
  
  -- Konvertierung
  converted_to_invoice_id uuid,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index für schnelle Provider-Abfragen
CREATE INDEX IF NOT EXISTS idx_quotes_provider_id ON public.quotes(provider_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- RLS für Quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Provider kann eigene Quotes sehen/verwalten
DROP POLICY IF EXISTS "Provider can manage own quotes" ON public.quotes;
CREATE POLICY "Provider can manage own quotes" ON public.quotes
  FOR ALL USING (auth.uid() = provider_id);

-- Client kann Quotes sehen die an ihn gehen
DROP POLICY IF EXISTS "Client can view own quotes" ON public.quotes;
CREATE POLICY "Client can view own quotes" ON public.quotes
  FOR SELECT USING (auth.uid() = client_id);

-- =====================================================
-- 7. NEUE TABELLE: VEHICLE_LOGS (Fahrtenbuch)
-- Für Tracking unter "Auffassen"
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id),
  
  -- Fahrt-Details
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  start_km integer,
  end_km integer,
  distance_km integer GENERATED ALWAYS AS (end_km - start_km) STORED,
  
  -- Route
  start_location text,
  end_location text,
  route_description text,
  
  -- Verknüpfung zu Terminen
  appointment_ids uuid[] DEFAULT '{}',
  
  -- Kosten
  fuel_cost numeric,
  toll_cost numeric,
  other_costs numeric,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index für schnelle Provider-Abfragen
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_provider_id ON public.vehicle_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_date ON public.vehicle_logs(log_date);

-- RLS für Vehicle Logs
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;

-- Provider kann nur eigene Logs sehen
DROP POLICY IF EXISTS "Provider can manage own vehicle logs" ON public.vehicle_logs;
CREATE POLICY "Provider can manage own vehicle logs" ON public.vehicle_logs
  FOR ALL USING (auth.uid() = provider_id);

-- =====================================================
-- 8. NEUE TABELLE: WORK_SESSIONS (Arbeitszeiterfassung)
-- Für Stoppuhr/Timer unter "Auffassen"
-- =====================================================

CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id),
  appointment_id uuid REFERENCES public.appointments(id),
  horse_id uuid REFERENCES public.horses(id),
  
  -- Zeit-Tracking
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  duration_minutes integer,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  
  -- Notizen
  notes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index für schnelle Provider-Abfragen
CREATE INDEX IF NOT EXISTS idx_work_sessions_provider_id ON public.work_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_appointment_id ON public.work_sessions(appointment_id);

-- RLS für Work Sessions
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- Provider kann nur eigene Sessions sehen
DROP POLICY IF EXISTS "Provider can manage own work sessions" ON public.work_sessions;
CREATE POLICY "Provider can manage own work sessions" ON public.work_sessions
  FOR ALL USING (auth.uid() = provider_id);

-- =====================================================
-- 9. TRIGGER FÜR updated_at
-- =====================================================

-- Quotes
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vehicle Logs
DROP TRIGGER IF EXISTS update_vehicle_logs_updated_at ON public.vehicle_logs;
CREATE TRIGGER update_vehicle_logs_updated_at
  BEFORE UPDATE ON public.vehicle_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENDE - Keine bestehenden Daten wurden verändert!
-- =====================================================