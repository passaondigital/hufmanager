
-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron Job 1: Send appointment reminders every 30 minutes
SELECT cron.schedule(
  'send-appointment-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/send-appointment-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Cron Job 2: Morning briefing at 06:00 UTC (07:00 CET) for providers
SELECT cron.schedule(
  'morning-briefing',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/morning-briefing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Cron Job 3: Escalate unconfirmed appointments every 2 hours
SELECT cron.schedule(
  'escalate-unconfirmed',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/escalate-unconfirmed',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
