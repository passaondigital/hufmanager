
-- Cron: Monthly check-in (1. jeden Monats um 09:00)
SELECT cron.schedule(
  'autoflow-monthly-checkin',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/autoflow-monthly-checkin',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Cron: Feedback-Anfragen alle 2 Stunden prüfen
SELECT cron.schedule(
  'autoflow-feedback-check',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/autoflow-customer-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := '{"type": "feedback_request", "provider_id": "all"}'::jsonb
  ) AS request_id;
  $$
);

-- Trigger: Auto-Rechnung bei Termin-Abschluss
CREATE OR REPLACE FUNCTION public.autoflow_on_appointment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Nur bei Status-Wechsel zu "completed"
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.provider_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/autoflow-auto-invoice',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
      body := jsonb_build_object('appointment_id', NEW.id, 'trigger_type', 'on_completion')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_appointment_completed ON appointments;
CREATE TRIGGER trg_autoflow_appointment_completed
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION autoflow_on_appointment_completed();

-- Trigger: Auto-Rechnung bei Unterschrift
CREATE OR REPLACE FUNCTION public.autoflow_on_appointment_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Nur wenn signed_at neu gesetzt wird
  IF NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL AND NEW.provider_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/autoflow-auto-invoice',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
      body := jsonb_build_object('appointment_id', NEW.id, 'trigger_type', 'after_signature')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_appointment_signed ON appointments;
CREATE TRIGGER trg_autoflow_appointment_signed
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION autoflow_on_appointment_signed();

-- Trigger: Lead automatisch verarbeiten
CREATE OR REPLACE FUNCTION public.autoflow_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/autoflow-process-lead',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
      body := jsonb_build_object('lead_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_new_lead ON leads;
CREATE TRIGGER trg_autoflow_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION autoflow_on_new_lead();
