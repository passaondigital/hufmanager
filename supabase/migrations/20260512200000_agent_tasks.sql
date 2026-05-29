-- ============================================================================
-- Phase 2: Agent Tasks
--
-- Persistente Aufgaben-Queue für KI-vorgeschlagene Aktionen.
-- Workflow: suggested → approved → executing → executed | rejected | failed
--
-- Kernregel: Hufi schlägt vor, der Nutzer entscheidet.
-- Keine Aktion wird ohne status='approved' ausgeführt.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text,

  -- Aktionstyp — spiegelt HufiAction.type wider
  type          text NOT NULL CHECK (type IN (
    'create_appointment',
    'create_invoice',
    'send_message',
    'set_reminder',
    'create_note',
    'delete',
    'generic_action'
  )),

  -- Statusmaschine
  status        text NOT NULL DEFAULT 'suggested' CHECK (status IN (
    'suggested',   -- Hufi hat vorgeschlagen
    'approved',    -- Nutzer hat bestätigt
    'executing',   -- Aktion wird gerade ausgeführt
    'executed',    -- Erfolgreich ausgeführt
    'rejected',    -- Nutzer hat abgelehnt
    'failed'       -- Ausführung fehlgeschlagen
  )),

  -- Aktionsdaten
  payload       jsonb NOT NULL DEFAULT '{}',
  explanation   text,                        -- Warum schlägt Hufi das vor? (EU AI Act)
  user_message  text,                        -- Was der Nutzer ursprünglich gesagt hat

  -- Ergebnis nach Ausführung
  result        jsonb,

  -- Timestamps
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  executed_at   timestamptz
);

-- Automatisch updated_at setzen
CREATE OR REPLACE FUNCTION public.set_agent_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_agent_tasks_updated_at();

-- Index für pending tasks (häufigste Query)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_status
  ON public.agent_tasks(user_id, status)
  WHERE status IN ('suggested', 'approved', 'executing');

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht eigene Tasks"
  ON public.agent_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Nutzer erstellt eigene Tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nutzer aktualisiert eigene Tasks"
  ON public.agent_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Nutzer löscht eigene Tasks"
  ON public.agent_tasks FOR DELETE
  USING (auth.uid() = user_id);
