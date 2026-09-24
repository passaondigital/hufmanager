-- Retention fuer cron.job_run_details (Incident 24.09.2026).
--
-- Ursache: pg_cron protokolliert jeden Lauf und loescht nie. Bei ~2.400 Laeufen/Tag
-- wuchs die Tabelle seit Dez. 2025 auf 373.248 Zeilen / 410 MB (Befehlstext pro Zeile),
-- was zusammen mit dem aufgeblaehten net._http_response die DB-Instanz ueberlastete.
--
-- Loesung: ein zusaetzlicher, eigenstaendiger Cron-Job loescht taeglich Protokolle
-- aelter als 7 Tage. Bestehende Cron-Jobs werden NICHT veraendert.
-- Idempotent: cron.schedule mit gleichem job_name aktualisiert statt zu duplizieren.
--
-- Rollback: SELECT cron.unschedule('purge-cron-job-run-details');

SELECT cron.schedule(
  'purge-cron-job-run-details',
  '17 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days'$$
);
