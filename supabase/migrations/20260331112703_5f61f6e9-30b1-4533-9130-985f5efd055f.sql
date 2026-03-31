-- Account-level notes (admin notes, system notes, reminders)
CREATE TABLE IF NOT EXISTS public.account_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  account_type text NOT NULL DEFAULT 'provider',
  note_text text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  reminder_at timestamptz
);

ALTER TABLE public.account_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage account_notes"
  ON public.account_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_account_notes_account ON public.account_notes(account_id, account_type);
CREATE INDEX idx_account_notes_reminder ON public.account_notes(reminder_at) WHERE reminder_at IS NOT NULL AND resolved_at IS NULL;

-- Document-level event log (invoices, contracts)
CREATE TABLE IF NOT EXISTS public.document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_type text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage document_events"
  ON public.document_events
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_document_events_doc ON public.document_events(document_id, document_type);
CREATE INDEX idx_document_events_created ON public.document_events(created_at DESC);