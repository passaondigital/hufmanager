-- Migration: Add voice_sessions and autoflow_log tables

CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    audio_url TEXT,
    processed_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autoflow_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES voice_sessions(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    payload JSONB,
    status VARCHAR(50) DEFAULT 'success',
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoflow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice sessions" ON voice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own voice sessions" ON voice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their autoflow logs" ON autoflow_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM voice_sessions vs WHERE vs.id = autoflow_log.session_id AND vs.user_id = auth.uid())
);
