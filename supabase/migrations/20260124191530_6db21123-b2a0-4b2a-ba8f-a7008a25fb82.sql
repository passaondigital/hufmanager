-- ============================================
-- DATENMODELL FINALISIERUNG: profiles (Clients #KID) & horses (#EQID)
-- Verwendet ADD COLUMN IF NOT EXISTS für sichere Erweiterung
-- ============================================

-- ============================================
-- 1. ENUMS ERSTELLEN (falls nicht vorhanden)
-- ============================================

DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('private', 'commercial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lifecycle_status AS ENUM ('new', 'active', 'archive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_rating AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE holding_type AS ENUM ('box', 'open_stable', 'mixed', 'pasture');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE usage_type AS ENUM ('leisure', 'sport', 'western', 'dressage', 'jumping', 'breeding', 'therapy', 'school', 'retirement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. PROFILES TABELLE ERWEITERN (Clients #KID)
-- ============================================

-- Stammdaten
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_landline TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_mobile TEXT;

-- Business-Logik
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'private';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifecycle_status lifecycle_status DEFAULT 'new';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_rating payment_rating DEFAULT 'A';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS order_authorization BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reliability_score INTEGER CHECK (reliability_score IS NULL OR (reliability_score >= 1 AND reliability_score <= 5));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS working_conditions TEXT;

-- Rechtliches
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions_granted JSONB DEFAULT '[]'::jsonb;

-- GPS-Koordinaten für Clients
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_name TEXT;

-- ============================================
-- 3. HORSES TABELLE ERWEITERN (#EQID)
-- ============================================

-- Stammdaten (einige existieren bereits, prüfen)
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS official_name TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS chip_number TEXT;

-- Haltung & Nutzung
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS holding_type holding_type;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS usage_type usage_type;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS stable_address_gps JSONB;

-- Huf-Status (Der Kern)
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS shoeing_status BOOLEAN DEFAULT false;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS hoof_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS health_issues_general TEXT;

-- Logik
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS is_new_horse BOOLEAN DEFAULT true;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS last_appointment_date DATE;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS next_appointment_due DATE;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS documents_urls TEXT[];

-- ============================================
-- 4. INDIZES FÜR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle_status ON public.profiles(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_rating ON public.profiles(payment_rating);
CREATE INDEX IF NOT EXISTS idx_profiles_zip_code ON public.profiles(zip_code);
CREATE INDEX IF NOT EXISTS idx_horses_next_appointment_due ON public.horses(next_appointment_due);
CREATE INDEX IF NOT EXISTS idx_horses_holding_type ON public.horses(holding_type);
CREATE INDEX IF NOT EXISTS idx_horses_usage_type ON public.horses(usage_type);
CREATE INDEX IF NOT EXISTS idx_horses_shoeing_status ON public.horses(shoeing_status);

-- ============================================
-- 5. KOMMENTARE FÜR DOKUMENTATION
-- ============================================

COMMENT ON COLUMN public.profiles.client_type IS 'Kundentyp: private (Privat) oder commercial (Gewerbe)';
COMMENT ON COLUMN public.profiles.lifecycle_status IS 'Kundenstatus: new (Neukunde), active (Bestandskunde), archive (Archiv)';
COMMENT ON COLUMN public.profiles.payment_rating IS 'Zahlungsmoral: A (sehr gut) bis D (problematisch)';
COMMENT ON COLUMN public.profiles.reliability_score IS 'Zuverlässigkeit: 1-5 Sterne';
COMMENT ON COLUMN public.profiles.working_conditions IS 'Arbeitsbedingungen vor Ort (z.B. Beleuchtung, Untergrund)';
COMMENT ON COLUMN public.profiles.permissions_granted IS 'Erteilte Genehmigungen als Array: ["Video", "Foto", "Marketing"]';

COMMENT ON COLUMN public.horses.official_name IS 'Offizieller Name laut Pferdepass';
COMMENT ON COLUMN public.horses.holding_type IS 'Haltungsform: box, open_stable, mixed, pasture';
COMMENT ON COLUMN public.horses.usage_type IS 'Nutzungsart: leisure, sport, western, dressage, jumping, etc.';
COMMENT ON COLUMN public.horses.stable_address_gps IS 'Abweichender Stallstandort als JSON: {lat, lng, address}';
COMMENT ON COLUMN public.horses.hoof_details IS 'Strukturierte Hufdaten je Huf: {vl: {size, condition, stance, issues}, ...}';
COMMENT ON COLUMN public.horses.shoeing_status IS 'true = Eisen, false = Barhuf';
COMMENT ON COLUMN public.horses.is_new_horse IS 'true = Neuzugang, false = Bestandspferd';
COMMENT ON COLUMN public.horses.documents_urls IS 'Array von URLs zu Dokumenten (Röntgenbilder, PDFs)';