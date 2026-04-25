-- ── hufi_offers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_offers (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id     UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  client_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  horse_name      TEXT,
  service_type    TEXT        NOT NULL,
  price_estimate  NUMERIC(10,2),
  message         TEXT,
  status          TEXT        DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','declined','expired')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);
ALTER TABLE hufi_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_offers_provider" ON hufi_offers
  FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "hufi_offers_client_read" ON hufi_offers
  FOR SELECT USING (auth.uid() = client_id);

-- ── hufi_feedback ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_feedback (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id  UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  horse_name      TEXT,
  rating          INT         CHECK (rating BETWEEN 1 AND 5),
  response        TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent            BOOLEAN     DEFAULT FALSE,
  responded_at    TIMESTAMPTZ
);
ALTER TABLE hufi_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_feedback_owner" ON hufi_feedback
  FOR ALL USING (auth.uid() = user_id);

-- ── hufi_routes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_routes (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id           UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  date                  DATE        NOT NULL,
  stops                 JSONB       NOT NULL DEFAULT '[]',
  total_distance_km     NUMERIC(7,2),
  estimated_duration_min INT,
  google_maps_url       TEXT,
  optimized             BOOLEAN     DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hufi_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_routes_provider" ON hufi_routes
  FOR ALL USING (auth.uid() = provider_id);

-- ── hufi_service_relationships ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_service_relationships (
  id                     UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id            UUID  REFERENCES profiles(id) ON DELETE CASCADE,
  client_id              UUID  REFERENCES profiles(id) ON DELETE CASCADE,
  horse_id               UUID  REFERENCES horses(id)   ON DELETE SET NULL,
  service_interval_weeks INT,
  last_service_date      DATE,
  next_service_due       DATE,
  notes                  TEXT,
  active                 BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, client_id, horse_id)
);
ALTER TABLE hufi_service_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_svc_provider" ON hufi_service_relationships
  FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "hufi_svc_client_read" ON hufi_service_relationships
  FOR SELECT USING (auth.uid() = client_id);
