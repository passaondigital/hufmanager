-- Profiles: new columns for affiliate & education
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS affiliate_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS education_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_cooperation_badges BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

-- AFFILIATES
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  affiliate_type TEXT DEFAULT 'provider',
  commission_type TEXT DEFAULT 'flat',
  commission_rate_cents INT DEFAULT 1000,
  commission_percent NUMERIC(5,2),
  status TEXT DEFAULT 'pending',
  payout_method TEXT DEFAULT 'sepa',
  payout_iban TEXT,
  payout_paypal TEXT,
  minimum_payout_cents INT DEFAULT 2500,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access affiliates" ON affiliates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  converted_provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversion_type TEXT DEFAULT 'registration',
  plan_type TEXT,
  amount_cents INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  source_url TEXT,
  referrer_code TEXT,
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access affiliate_conversions" ON affiliate_conversions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Auth insert affiliate_conversions" ON affiliate_conversions FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  status TEXT DEFAULT 'pending',
  payout_method TEXT,
  reference TEXT,
  period_from DATE,
  period_to DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access affiliate_payouts" ON affiliate_payouts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- COOPERATION PARTNERS
CREATE TABLE IF NOT EXISTS cooperation_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  revenue_share_percent NUMERIC(5,2) DEFAULT 0,
  contract_url TEXT,
  contract_signed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'prospect',
  visibility TEXT DEFAULT 'hidden',
  badge_text TEXT,
  badge_color TEXT DEFAULT '#F5970A',
  priority INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cooperation_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access cooperation_partners" ON cooperation_partners FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS provider_cooperations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cooperation_id UUID REFERENCES cooperation_partners(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, cooperation_id)
);
ALTER TABLE provider_cooperations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access provider_cooperations" ON provider_cooperations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Provider read own cooperations" ON provider_cooperations FOR SELECT TO authenticated USING (provider_id = auth.uid());

-- HM INTERNAL STAFF
CREATE TABLE IF NOT EXISTS hm_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support',
  department TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  hired_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hm_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access hm_staff" ON hm_staff FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS hm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES hm_staff(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hm_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access hm_activity_log" ON hm_activity_log FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- EDUCATION / HUFSCHULEN
CREATE TABLE IF NOT EXISTS education_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  address TEXT,
  region TEXT,
  specialty TEXT[],
  status TEXT DEFAULT 'pending',
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  founded_year INT,
  social_instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE education_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access education_schools" ON education_schools FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Owner manage own school" ON education_schools FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Public read active schools" ON education_schools FOR SELECT TO anon USING (status = 'active');

CREATE TABLE IF NOT EXISTS education_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES education_schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  course_type TEXT DEFAULT 'workshop',
  duration_days INT,
  duration_hours INT,
  price_cents INT DEFAULT 0,
  max_participants INT,
  next_date DATE,
  location TEXT,
  certificate_title TEXT,
  certificate_validity_years INT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE education_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access education_courses" ON education_courses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "School owner manage courses" ON education_courses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM education_schools s WHERE s.id = school_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM education_schools s WHERE s.id = school_id AND s.owner_id = auth.uid()));
CREATE POLICY "Public read active courses" ON education_courses FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM education_schools s WHERE s.id = school_id AND s.status = 'active'));

CREATE TABLE IF NOT EXISTS education_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES education_courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  registered_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  grade TEXT,
  notes TEXT,
  UNIQUE(student_id, course_id)
);
ALTER TABLE education_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access education_enrollments" ON education_enrollments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Student read own enrollments" ON education_enrollments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "School owner read enrollments" ON education_enrollments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM education_courses c JOIN education_schools s ON s.id = c.school_id WHERE c.id = course_id AND s.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS provider_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES education_schools(id) ON DELETE SET NULL,
  course_id UUID REFERENCES education_courses(id) ON DELETE SET NULL,
  certificate_title TEXT NOT NULL,
  issuer_name TEXT,
  issued_at DATE,
  valid_until DATE,
  certificate_url TEXT,
  verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access provider_certifications" ON provider_certifications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Provider manage own certs" ON provider_certifications FOR ALL TO authenticated USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Public read public certs" ON provider_certifications FOR SELECT TO anon USING (is_public = true);

-- MODULE FLAGS in admin_settings (key-value store)
INSERT INTO admin_settings (key, value, description) VALUES
  ('affiliate_module_enabled', 'false', 'Affiliate-Modul fuer Provider'),
  ('cooperation_module_enabled', 'false', 'Kooperations-Modul'),
  ('internal_staff_module_enabled', 'false', 'Internes HM-Team Modul'),
  ('education_module_enabled', 'false', 'Hufschulen und Ausbildung Modul')
ON CONFLICT (key) DO NOTHING;

-- Seed: Uelzener Versicherung
INSERT INTO cooperation_partners (company_name, category, contact_name, contact_email, status, visibility, notes)
VALUES ('Uelzener Versicherung', 'insurance', 'Leonie Teschke', '', 'negotiating', 'hidden', 'Termin: 12. Maerz 2026');