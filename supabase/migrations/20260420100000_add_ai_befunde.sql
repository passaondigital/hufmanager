-- Migration: AI Befunde (strukturierte Befunde aus Sprachnotizen)

CREATE TABLE IF NOT EXISTS ai_befunde (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
  voice_session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,

  -- Rohdaten
  transcript TEXT NOT NULL,

  -- Strukturierter Befund (extrahiert durch LLM)
  pferd_name TEXT,
  befund_text TEXT,
  massnahme TEXT,
  naechster_termin TEXT,
  fachbegriffe TEXT[] DEFAULT '{}',

  -- Vollständige LLM-Antwort als JSON
  structured_output JSONB,

  -- Metadaten
  model_used TEXT DEFAULT 'hufiai-fast',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle User-Abfragen
CREATE INDEX idx_ai_befunde_user_id ON ai_befunde(user_id);
CREATE INDEX idx_ai_befunde_horse_id ON ai_befunde(horse_id);
CREATE INDEX idx_ai_befunde_created_at ON ai_befunde(created_at DESC);

-- RLS
ALTER TABLE ai_befunde ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own befunde"
  ON ai_befunde FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated at Trigger
CREATE OR REPLACE FUNCTION update_ai_befunde_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_befunde_updated_at
  BEFORE UPDATE ON ai_befunde
  FOR EACH ROW EXECUTE FUNCTION update_ai_befunde_updated_at();
