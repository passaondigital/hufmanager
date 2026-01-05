-- Enable pg_cron extension (must be in pg_catalog schema)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the publish-scheduled-posts job to run every 5 minutes
SELECT cron.schedule(
  'publish-scheduled-posts-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/publish-scheduled-posts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2NoZ2p4a3p6d3plZnFscmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDQ0MDEsImV4cCI6MjA4MDMyMDQwMX0.DMeqIJjj99sl-Rlo5dRyBmVD1WZWaayxeppa51reocs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);