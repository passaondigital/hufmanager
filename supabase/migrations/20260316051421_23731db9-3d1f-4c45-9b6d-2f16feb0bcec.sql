
-- 1. horse_medications
CREATE TABLE IF NOT EXISTS public.horse_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE NOT NULL,
  prescribed_by UUID REFERENCES auth.users(id),
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT,
  start_date DATE,
  end_date DATE,
  reason TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.horse_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horse owner and provider can access medications"
  ON public.horse_medications FOR SELECT
  USING (
    horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid())
    OR prescribed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.horse_partner_access
      WHERE horse_id = horse_medications.horse_id
        AND partner_profile_id = auth.uid()
        AND can_view_medical = true
        AND status = 'active'
    )
  );

CREATE POLICY "Prescriber can insert medications"
  ON public.horse_medications FOR INSERT
  WITH CHECK (prescribed_by = auth.uid());

CREATE POLICY "Prescriber can update medications"
  ON public.horse_medications FOR UPDATE
  USING (prescribed_by = auth.uid());

-- 2. vet_profiles
CREATE TABLE IF NOT EXISTS public.vet_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  organization_id UUID REFERENCES public.organizations(id),
  display_name TEXT NOT NULL,
  clinic_name TEXT,
  specializations TEXT[] DEFAULT '{}',
  clinic_type TEXT DEFAULT 'praxis',
  description TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_state TEXT,
  address_country TEXT DEFAULT 'DE',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours JSONB DEFAULT '{}',
  emergency_service BOOLEAN DEFAULT false,
  photo_url TEXT,
  languages TEXT[] DEFAULT '{Deutsch}',
  accepts_new_patients BOOLEAN DEFAULT true,
  pms_software TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'basis',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vet_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public vet profiles are readable"
  ON public.vet_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Own vet profile management"
  ON public.vet_profiles FOR ALL
  USING (user_id = auth.uid());

-- 3. vet_sync_connections
CREATE TABLE IF NOT EXISTS public.vet_sync_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  credentials_encrypted TEXT,
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMPTZ,
  external_clinic_id TEXT,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_interval_minutes INTEGER DEFAULT 60,
  sync_config JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_type)
);

ALTER TABLE public.vet_sync_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own sync connections only"
  ON public.vet_sync_connections FOR ALL
  USING (user_id = auth.uid());

-- 4. vet_sync_log
CREATE TABLE IF NOT EXISTS public.vet_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.vet_sync_connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.vet_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own sync logs only"
  ON public.vet_sync_log FOR ALL
  USING (user_id = auth.uid());

-- 5. got_positions (GOT 2022)
CREATE TABLE IF NOT EXISTS public.got_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price_1x DECIMAL(10,2) NOT NULL,
  price_2x DECIMAL(10,2),
  price_3x DECIMAL(10,2),
  price_4x DECIMAL(10,2),
  unit TEXT DEFAULT 'Stück',
  notes TEXT,
  is_equine_relevant BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.got_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GOT is public readable"
  ON public.got_positions FOR SELECT
  USING (true);

CREATE POLICY "Only admins insert GOT"
  ON public.got_positions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Extend organizations type check for 'veterinary'
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_type_check 
  CHECK (type IN ('insurance', 'manufacturer', 'supplier', 'school', 'association', 'event', 'media', 'veterinary', 'other'));

-- Seed GOT positions
INSERT INTO public.got_positions (position_number, category, description, price_1x, price_2x, price_3x, price_4x, is_equine_relevant) VALUES
  ('E1', 'allgemein', 'Allgemeine Untersuchung mit Beratung (Pferd)', 30.78, 61.56, 92.34, 123.12, true),
  ('E2', 'allgemein', 'Eingehende Untersuchung einzelner Organe', 23.08, 46.16, 69.24, 92.32, true),
  ('E3', 'allgemein', 'Beratung ohne Untersuchung', 11.54, 23.08, 34.62, 46.16, true),
  ('E10', 'orthopaedie', 'Lahmheitsuntersuchung', 61.56, 123.12, 184.68, 246.24, true),
  ('E11', 'orthopaedie', 'Provokationsproben (Beugeprobe)', 23.08, 46.16, 69.24, 92.32, true),
  ('E12', 'orthopaedie', 'Diagnostische Anästhesie (Leitungsanästhesie)', 30.78, 61.56, 92.34, 123.12, true),
  ('E20', 'bildgebung', 'Röntgenaufnahme (1. Aufnahme)', 30.78, 61.56, 92.34, 123.12, true),
  ('E21', 'bildgebung', 'Röntgenaufnahme (jede weitere)', 23.08, 46.16, 69.24, 92.32, true),
  ('E22', 'bildgebung', 'Ultraschalluntersuchung', 46.16, 92.32, 138.48, 184.64, true),
  ('E30', 'zahnheilkunde', 'Zahnbehandlung Pferd (einfach)', 46.16, 92.32, 138.48, 184.64, true),
  ('E31', 'zahnheilkunde', 'Zahnextraktion', 69.24, 138.48, 207.72, 276.96, true),
  ('E40', 'chirurgie', 'Wundversorgung (einfach)', 23.08, 46.16, 69.24, 92.32, true),
  ('E41', 'chirurgie', 'Wundversorgung (chirurgisch, Naht)', 69.24, 138.48, 207.72, 276.96, true),
  ('E42', 'chirurgie', 'Kastration Pferd', 192.32, 384.64, 576.96, 769.28, true),
  ('E50', 'innere', 'Magenspiegelung (Gastroskopie)', 153.86, 307.72, 461.58, 615.44, true),
  ('E51', 'innere', 'Kolik-Untersuchung', 46.16, 92.32, 138.48, 184.64, true),
  ('E52', 'innere', 'Rektale Untersuchung', 23.08, 46.16, 69.24, 92.32, true),
  ('E60', 'labor', 'Blutentnahme', 11.54, 23.08, 34.62, 46.16, true),
  ('E61', 'labor', 'Großes Blutbild (Labor)', 30.78, 61.56, 92.34, 123.12, true),
  ('E70', 'impfung', 'Impfung (inkl. Untersuchung)', 15.39, 30.78, 46.17, 61.56, true),
  ('E71', 'impfung', 'Entwurmung', 7.69, 15.38, 23.07, 30.76, true),
  ('E80', 'notdienst', 'Notdienstzuschlag (Nacht/Wochenende)', 50.00, 100.00, 150.00, 200.00, true),
  ('E81', 'notdienst', 'Wegegeld pro km (einfache Strecke)', 3.50, 3.50, 3.50, 3.50, true),
  ('E90', 'kaufuntersuchung', 'Kaufuntersuchung (klinisch, ohne Röntgen)', 250.00, 500.00, 750.00, 1000.00, true),
  ('E91', 'kaufuntersuchung', 'Kaufuntersuchung (inkl. Röntgen Standard 18 Bilder)', 500.00, 1000.00, 1500.00, 2000.00, true)
ON CONFLICT (position_number) DO NOTHING;
