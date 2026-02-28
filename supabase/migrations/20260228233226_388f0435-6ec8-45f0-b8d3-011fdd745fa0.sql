
-- Data Retention Rules table
CREATE TABLE public.data_retention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'warn' CHECK (action IN ('warn', 'delete')),
  description TEXT,
  target_table TEXT,
  target_date_column TEXT DEFAULT 'created_at',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_retention_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retention rules"
  ON public.data_retention_rules
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pre-fill with default rules
INSERT INTO public.data_retention_rules (category, retention_days, action, description, target_table, target_date_column) VALUES
  ('Rechnungen', 3650, 'warn', 'Steuerliche Aufbewahrungspflicht (§147 AO)', 'invoices', 'created_at'),
  ('Chat-Nachrichten', 180, 'warn', 'Kommunikation zwischen Provider und Client', 'messages', 'created_at'),
  ('Audit-Logs', 365, 'warn', 'Admin- und Mitarbeiter-Audit-Logs', 'admin_activity_log', 'created_at'),
  ('Soft-deleted Records', 90, 'warn', 'Profile und Pferde mit deleted_at Timestamp', 'profiles', 'deleted_at');
