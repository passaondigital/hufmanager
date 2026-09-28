SELECT cron.unschedule('vacuum-net-http-response');
SELECT cron.unschedule('vacuum-cron-job-run-details');
DELETE FROM supabase_migrations.schema_migrations WHERE version='20260927180000';
