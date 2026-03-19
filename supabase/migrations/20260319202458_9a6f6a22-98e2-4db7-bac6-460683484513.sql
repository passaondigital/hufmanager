
-- ============================================
-- Phase 3: Retention rule for deceased horses
-- ============================================

-- Add retention rule for deceased horse records (2 years / 730 days)
INSERT INTO public.data_retention_rules (category, retention_days, action, description, target_table, target_date_column)
VALUES (
  'Verstorbene Pferde',
  730,
  'warn',
  'Akten verstorbener Pferde werden nach 2 Jahren zur Archivierung vorgeschlagen',
  'horses',
  'status_changed_at'
)
ON CONFLICT DO NOTHING;

-- Add retention rule for stolen horse records (5 years — legal relevance)
INSERT INTO public.data_retention_rules (category, retention_days, action, description, target_table, target_date_column)
VALUES (
  'Gestohlene Pferde',
  1825,
  'warn',
  'Akten gestohlener Pferde werden nach 5 Jahren zur Archivierung vorgeschlagen (Verjährungsfrist)',
  'horses',
  'status_changed_at'
)
ON CONFLICT DO NOTHING;

-- Add soft-delete support: deleted_at column for key pferdeakte tables that lack it
DO $$
BEGIN
  -- horse_diary_entries
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'horse_diary_entries' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.horse_diary_entries ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- horse_health_logs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'horse_health_logs' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.horse_health_logs ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- partner_treatment_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_treatment_notes' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.partner_treatment_notes ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- horse_vaccinations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'horse_vaccinations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.horse_vaccinations ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END
$$;

-- Add indexes for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_horse_diary_entries_deleted_at ON public.horse_diary_entries (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_horse_health_logs_deleted_at ON public.horse_health_logs (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partner_treatment_notes_deleted_at ON public.partner_treatment_notes (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_deleted_at ON public.horse_vaccinations (deleted_at) WHERE deleted_at IS NULL;
