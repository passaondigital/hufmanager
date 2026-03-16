CREATE TABLE IF NOT EXISTS portal_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  portal_type TEXT NOT NULL CHECK (portal_type IN (
    'insurance', 'manufacturer', 'veterinary', 'supplier',
    'school', 'association', 'media', 'other'
  )),
  website TEXT,
  description TEXT NOT NULL,
  expectations TEXT NOT NULL,
  estimated_users TEXT,
  contact_name TEXT NOT NULL,
  contact_position TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  referral_source TEXT,
  preferred_payment TEXT DEFAULT 'copecart' CHECK (preferred_payment IN ('copecart', 'transfer')),
  privacy_accepted BOOLEAN DEFAULT false,
  newsletter_accepted BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'reviewing', 'interview_scheduled', 'approved', 'rejected', 'onboarding'
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portal_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applications"
  ON portal_applications FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can apply"
  ON portal_applications FOR INSERT
  WITH CHECK (true);