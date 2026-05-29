-- pg_cron job: run hufi-routines-runner every minute
SELECT cron.unschedule('routines-runner') FROM cron.job WHERE jobname = 'routines-runner';

SELECT cron.schedule(
  'routines-runner',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/hufi-routines-runner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
