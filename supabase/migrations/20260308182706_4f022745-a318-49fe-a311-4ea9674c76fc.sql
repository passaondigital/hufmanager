-- Add client_id, last_sent_at, sent_via to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id);
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS sent_via TEXT;

-- Index for fast lookup by provider+client
CREATE INDEX IF NOT EXISTS idx_magic_links_provider_client ON magic_links(provider_id, client_id) WHERE is_active = true;