-- HufCam Pro: Bildarchiv + Analysen

-- Bucket wird via Supabase Dashboard oder API erstellt (hufcam-images)

CREATE TABLE IF NOT EXISTS hufcam_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  horse_id    UUID REFERENCES horses(id) ON DELETE SET NULL,
  position    TEXT CHECK (position IN ('LV','LH','RV','RH','sole','frog','unknown')) DEFAULT 'unknown',
  storage_path TEXT NOT NULL,
  thumb_path  TEXT,
  file_size   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hufcam_analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id         UUID REFERENCES hufcam_images(id) ON DELETE CASCADE NOT NULL,
  horse_id         UUID REFERENCES horses(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_used       TEXT DEFAULT 'moondream',
  analysis_type    TEXT DEFAULT 'general',
  description      TEXT,
  crack_analysis   TEXT,
  crack_detected   BOOLEAN DEFAULT false,
  tags             TEXT[] DEFAULT '{}',
  alert_triggered  BOOLEAN DEFAULT false,
  compare_summary  TEXT,
  prev_image_id    UUID REFERENCES hufcam_images(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hufcam_images_horse ON hufcam_images(horse_id, position, created_at DESC);
CREATE INDEX idx_hufcam_analyses_horse ON hufcam_analyses(horse_id, created_at DESC);
CREATE INDEX idx_hufcam_alerts ON hufcam_analyses(user_id, alert_triggered) WHERE alert_triggered = true;

ALTER TABLE hufcam_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hufcam_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own hufcam images"    ON hufcam_images   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own hufcam analyses"  ON hufcam_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
