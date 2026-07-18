-- Folgetermin-Vorschläge (Hebel 4, Schritt 4 HUFI_ROADMAP.md):
-- Persistiert pro Pferd, wann laut individuellem shoeing_interval der nächste Termin fällig
-- wäre, und wann der Provider zuletzt per Push/Briefing darüber informiert wurde (Dedup).

CREATE TABLE IF NOT EXISTS public.hufi_followup_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_date date NOT NULL,
  weeks_overdue integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (horse_id)
);

ALTER TABLE public.hufi_followup_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider sieht eigene Folgetermin-Vorschläge"
  ON public.hufi_followup_suggestions FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Provider aktualisiert eigene Folgetermin-Vorschläge"
  ON public.hufi_followup_suggestions FOR UPDATE
  USING (auth.uid() = provider_id);

CREATE TRIGGER update_hufi_followup_suggestions_updated_at
  BEFORE UPDATE ON public.hufi_followup_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
