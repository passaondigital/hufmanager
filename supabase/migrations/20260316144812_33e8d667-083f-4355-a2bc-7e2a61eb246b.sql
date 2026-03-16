
-- Add missing columns to pferdeakte_botschafter for the full portal
ALTER TABLE pferdeakte_botschafter 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS sponsoring_page_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_paid_out_cents INTEGER DEFAULT 0;

-- Botschafter campaigns for tracking different link sources
CREATE TABLE IF NOT EXISTS botschafter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  botschafter_id UUID REFERENCES pferdeakte_botschafter(id) ON DELETE CASCADE NOT NULL,
  campaign_name TEXT NOT NULL,
  source_tag TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  registrations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE botschafter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own campaigns select" ON botschafter_campaigns 
  FOR SELECT USING (
    botschafter_id IN (SELECT id FROM pferdeakte_botschafter WHERE user_id = auth.uid())
  );

CREATE POLICY "Own campaigns insert" ON botschafter_campaigns 
  FOR INSERT WITH CHECK (
    botschafter_id IN (SELECT id FROM pferdeakte_botschafter WHERE user_id = auth.uid())
  );

CREATE POLICY "Own campaigns update" ON botschafter_campaigns 
  FOR UPDATE USING (
    botschafter_id IN (SELECT id FROM pferdeakte_botschafter WHERE user_id = auth.uid())
  );

CREATE POLICY "Own campaigns delete" ON botschafter_campaigns 
  FOR DELETE USING (
    botschafter_id IN (SELECT id FROM pferdeakte_botschafter WHERE user_id = auth.uid())
  );

-- Add RLS policy for botschafter_updates to allow read for authenticated botschafter
-- (botschafter_updates already exists, just ensure read policy)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'botschafter_updates' AND policyname = 'Botschafter read published updates'
  ) THEN
    CREATE POLICY "Botschafter read published updates" ON botschafter_updates
      FOR SELECT USING (
        published_at IS NOT NULL 
        AND EXISTS (SELECT 1 FROM pferdeakte_botschafter WHERE user_id = auth.uid() AND status = 'active')
      );
  END IF;
END $$;
