-- Task Queue
CREATE TABLE IF NOT EXISTS hufi_task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  trigger_phrase TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','awaiting_confirm','done','failed','cancelled')),
  priority INT DEFAULT 5,
  steps JSONB NOT NULL DEFAULT '[]',
  current_step INT DEFAULT 0,
  context JSONB DEFAULT '{}',
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ
);
ALTER TABLE hufi_task_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON hufi_task_queue
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_user_status
  ON hufi_task_queue(user_id, status);

-- Skills
CREATE TABLE IF NOT EXISTS hufi_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_pattern TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  learned_from TEXT,
  confidence FLOAT DEFAULT 0.5,
  times_used INT DEFAULT 0,
  times_confirmed INT DEFAULT 0,
  times_rejected INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  suggested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skills" ON hufi_skills
  USING (auth.uid() = user_id);

-- Observations
CREATE TABLE IF NOT EXISTS hufi_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES hufi_conversations(id),
  observation_type TEXT NOT NULL,
  pattern TEXT,
  context JSONB DEFAULT '{}',
  occurrence_count INT DEFAULT 1,
  skill_id UUID REFERENCES hufi_skills(id),
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own observations" ON hufi_observations
  USING (auth.uid() = user_id);
