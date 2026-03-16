
-- 1. Add missing columns to horse_medications
ALTER TABLE public.horse_medications 
  ADD COLUMN IF NOT EXISTS active_ingredient TEXT,
  ADD COLUMN IF NOT EXISTS prescribing_vet TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS source_system TEXT,
  ADD COLUMN IF NOT EXISTS documented_by UUID REFERENCES auth.users(id);

-- Update source_system from source where exists
UPDATE public.horse_medications SET source_system = source WHERE source IS NOT NULL AND source_system IS NULL;

-- 2. Create horse_lab_results
CREATE TABLE IF NOT EXISTS public.horse_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE NOT NULL,
  documented_by UUID REFERENCES auth.users(id) NOT NULL,
  lab_type TEXT NOT NULL,
  lab_name TEXT,
  test_name TEXT NOT NULL,
  result_value TEXT,
  reference_range TEXT,
  unit TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  result_date DATE NOT NULL,
  document_url TEXT,
  notes TEXT,
  source_system TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.horse_lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horse owner can view lab results"
  ON public.horse_lab_results FOR SELECT
  USING (
    horse_id IN (SELECT id FROM public.horses WHERE owner_id = auth.uid())
    OR documented_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.horse_partner_access
      WHERE horse_id = horse_lab_results.horse_id
        AND partner_profile_id = auth.uid()
        AND can_view_medical = true
        AND status = 'active'
    )
  );

CREATE POLICY "Documenter can insert lab results"
  ON public.horse_lab_results FOR INSERT
  WITH CHECK (documented_by = auth.uid());

CREATE POLICY "Documenter can update lab results"
  ON public.horse_lab_results FOR UPDATE
  USING (documented_by = auth.uid());

-- 3. Add missing columns to vet_sync_connections
ALTER TABLE public.vet_sync_connections
  ADD COLUMN IF NOT EXISTS connection_name TEXT,
  ADD COLUMN IF NOT EXISTS clinic_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pms_type TEXT;

-- 4. Create equine_clinics table for seed data
CREATE TABLE IF NOT EXISTS public.equine_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'DE',
  clinic_type TEXT DEFAULT 'klinik',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  specializations TEXT[] DEFAULT '{}',
  emergency_service BOOLEAN DEFAULT false,
  emergency_phone TEXT,
  opening_hours JSONB DEFAULT '{}',
  description TEXT,
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equine_clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equine clinics are publicly readable"
  ON public.equine_clinics FOR SELECT
  USING (true);

CREATE POLICY "Only admins manage clinics"
  ON public.equine_clinics FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins update clinics"
  ON public.equine_clinics FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 5. Seed equine clinics (20+ DACH clinics)
INSERT INTO public.equine_clinics (name, city, state, country, clinic_type, latitude, longitude, specializations, emergency_service, description) VALUES
  ('Klinik für Pferde – TiHo Hannover', 'Hannover', 'NI', 'DE', 'uniklinik', 52.3841, 9.7970, ARRAY['chirurgie','orthopaedie','innere','reproduktion','bildgebung'], true, 'Universitätsklinik der Stiftung Tierärztliche Hochschule Hannover'),
  ('Klinik für Pferde – FU Berlin', 'Berlin', 'BE', 'DE', 'uniklinik', 52.4285, 13.2384, ARRAY['chirurgie','innere','zahnheilkunde'], true, 'Freie Universität Berlin, Fachbereich Veterinärmedizin'),
  ('Chirurgische Tierklinik – LMU München', 'München', 'BY', 'DE', 'uniklinik', 48.1695, 11.5945, ARRAY['chirurgie','orthopaedie','bildgebung'], true, 'Ludwig-Maximilians-Universität München'),
  ('Klinik für Pferde – JLU Gießen', 'Gießen', 'HE', 'DE', 'uniklinik', 50.5840, 8.6784, ARRAY['chirurgie','innere','reproduktion'], true, 'Justus-Liebig-Universität Gießen'),
  ('Tierklinik Lüsche', 'Bakum', 'NI', 'DE', 'klinik', 52.7340, 8.2350, ARRAY['chirurgie','orthopaedie','innere','reproduktion'], true, 'Größte private Pferdeklinik Europas'),
  ('Tierklinik Hochmoor', 'Gescher', 'NRW', 'DE', 'klinik', 51.9633, 7.0145, ARRAY['orthopaedie','chirurgie','bildgebung'], true, 'GPM-Fortbildungspartner, spezialisiert auf Orthopädie'),
  ('Tierklinik Domäne Karthaus', 'Dülmen', 'NRW', 'DE', 'klinik', 51.8313, 7.2795, ARRAY['orthopaedie','chirurgie','bildgebung'], true, 'Spezialisiert auf MRT und Orthopädie'),
  ('Pferdeklinik Kirchheim', 'Kirchheim/Teck', 'BW', 'DE', 'klinik', 48.6481, 9.4530, ARRAY['sportmedizin','orthopaedie','chirurgie'], true, 'Sportpferde-Spezialklinik'),
  ('Tiergesundheitszentrum Isernhagen', 'Isernhagen', 'NI', 'DE', 'klinik', 52.4600, 9.8600, ARRAY['orthopaedie','innere','zahnheilkunde'], true, 'Modernes Pferdezentrum bei Hannover'),
  ('Pferdeklinik Altano', 'Gessertshausen', 'BY', 'DE', 'klinik', 48.3280, 10.7230, ARRAY['zahnheilkunde','orthopaedie','chirurgie'], true, 'GPM-Zahnheilkunde Referenzklinik'),
  ('Pferdeklinik Seeburg', 'Dallgow-Döberitz', 'BB', 'DE', 'klinik', 52.5380, 13.0510, ARRAY['chirurgie','orthopaedie','innere'], true, 'Pferdeklinik im Havelland'),
  ('Pferdeklinik Burg Müggenhausen', 'Weilerswist', 'NRW', 'DE', 'klinik', 50.7490, 6.8480, ARRAY['orthopaedie','chirurgie','sportmedizin'], true, 'GPM-Youngster Events und Fortbildungen'),
  ('Tierklinik Wahlstedt', 'Wahlstedt', 'SH', 'DE', 'klinik', 53.9520, 10.2160, ARRAY['chirurgie','innere','reproduktion'], true, 'Pferdeklinik in Schleswig-Holstein'),
  ('Pferdeklinik Bargteheide', 'Bargteheide', 'SH', 'DE', 'klinik', 53.7260, 10.2570, ARRAY['orthopaedie','chirurgie','innere'], true, 'Norddeutsche Pferdeklinik'),
  ('Pferdeklinik Aschheim', 'Aschheim', 'BY', 'DE', 'klinik', 48.1690, 11.7170, ARRAY['orthopaedie','bildgebung','chirurgie'], true, 'Pferdeklinik im Münchner Osten'),
  ('Pferdeklinik Großostheim', 'Großostheim', 'BY', 'DE', 'klinik', 49.9230, 9.0780, ARRAY['innere','chirurgie','zahnheilkunde'], true, 'Pferdeklinik in Unterfranken'),
  ('Pferdeklinik Sottrum', 'Sottrum', 'NI', 'DE', 'klinik', 53.1130, 9.2270, ARRAY['orthopaedie','chirurgie','reproduktion'], true, 'Pferdeklinik zwischen Bremen und Hamburg'),
  ('Tierklinik Mühlen', 'Steinfeld', 'NI', 'DE', 'klinik', 52.5930, 8.2110, ARRAY['chirurgie','orthopaedie','innere'], true, 'Moderne Pferdeklinik im Oldenburger Land'),
  ('Klinik für Pferde – Vetsuisse Zürich', 'Zürich', 'ZH', 'CH', 'uniklinik', 47.3769, 8.5417, ARRAY['chirurgie','orthopaedie','innere','bildgebung'], true, 'Universität Zürich, Vetsuisse Fakultät'),
  ('Klinik für Pferde – Vetsuisse Bern', 'Bern', 'BE', 'CH', 'uniklinik', 46.9480, 7.4474, ARRAY['chirurgie','innere','reproduktion'], true, 'Universität Bern, Vetsuisse Fakultät'),
  ('Pferdeklinik Aggertal', 'Lohmar', 'NRW', 'DE', 'klinik', 50.8340, 7.2130, ARRAY['orthopaedie','chirurgie','sportmedizin'], true, 'Sportpferde-Klinik im Rheinland'),
  ('Vetmeduni Wien – Pferdeklinik', 'Wien', 'Wien', 'AT', 'uniklinik', 48.2553, 16.4234, ARRAY['chirurgie','innere','orthopaedie','reproduktion','bildgebung'], true, 'Veterinärmedizinische Universität Wien'),
  ('Pferdeklinik Tillysburg', 'St. Florian', 'OÖ', 'AT', 'klinik', 48.2100, 14.3830, ARRAY['orthopaedie','chirurgie','innere'], true, 'Oberösterreichische Pferdeklinik')
ON CONFLICT DO NOTHING;

-- 6. Add soap_data JSONB to partner_treatment_notes if not exists
ALTER TABLE public.partner_treatment_notes 
  ADD COLUMN IF NOT EXISTS soap_data JSONB,
  ADD COLUMN IF NOT EXISTS treatment_category TEXT,
  ADD COLUMN IF NOT EXISTS next_check_date DATE,
  ADD COLUMN IF NOT EXISTS recommendation_for_farrier TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_for_owner TEXT;
