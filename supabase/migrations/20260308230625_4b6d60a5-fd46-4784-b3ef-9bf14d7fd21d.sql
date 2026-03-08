
-- Preview Links table
CREATE TABLE IF NOT EXISTS preview_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  link_type TEXT DEFAULT 'draft' CHECK (link_type IN ('draft', 'feedback', 'live_share')),
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  feedback_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_viewed_at TIMESTAMPTZ
);

ALTER TABLE preview_links ENABLE ROW LEVEL SECURITY;

-- Provider can manage own links
CREATE POLICY "provider_own_preview_links" ON preview_links
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Anon/anyone can read active non-expired links by token
CREATE POLICY "anon_read_active_preview_links" ON preview_links
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND expires_at > now());

-- Preview Feedback table
CREATE TABLE IF NOT EXISTS preview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_link_id UUID REFERENCES preview_links(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  reviewer_name TEXT,
  reviewer_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE preview_feedback ENABLE ROW LEVEL SECURITY;

-- Provider can read own feedbacks
CREATE POLICY "provider_read_own_feedback" ON preview_feedback
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Anyone can insert feedback (with valid link)
CREATE POLICY "anon_insert_feedback" ON preview_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Token generation function
CREATE OR REPLACE FUNCTION generate_preview_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;
