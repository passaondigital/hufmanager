-- Speicher-Retention für net._http_response und cron.job_run_details (2026-09-27)
--
-- Befund: Zeilen-Retention funktioniert (pg_net.ttl = 6 h; Job 24 löscht
-- job_run_details > 7 Tage). Der freigewordene Platz wird aber nie
-- wiederverwendet: Die Hintergrund-Worker von pg_net und pg_cron melden ihre
-- Inserts/Deletes nicht an die Statistik (net._http_response: Statistik 150
-- Zeilen / 0 tote bei real 514 Zeilen und 311.236 Deletes; job_run_details:
-- 390 vs. real 6.778). Autovacuum sieht daher nie Arbeit — letzter Lauf auf
-- net._http_response am 05.08. Ergebnis: ~3 MB/Tag Wachstum, Vorbote des
-- Incidents vom 23./24.09. (267 MB für 566 Zeilen).
--
-- Maßnahme: VACUUM (ANALYZE) per pg_cron, unabhängig von der Statistik.
--   * normales VACUUM (kein FULL): SHARE UPDATE EXCLUSIVE — blockiert pg_net
--     und pg_cron nicht, macht Platz wiederverwendbar, stoppt das Wachstum
--   * postgres hat MAINTAIN auf beiden Tabellen (geprüft 27.09.)
--   * cron.use_background_workers = off → Befehl läuft als Einzelstatement
--     über libpq, VACUUM ist damit erlaubt (je Tabelle ein eigener Job)
--   * keine Geschäftsdaten betroffen, bestehende Jobs unverändert
--
-- Rollback:
--   SELECT cron.unschedule('vacuum-net-http-response');
--   SELECT cron.unschedule('vacuum-cron-job-run-details');

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('vacuum-net-http-response', 'vacuum-cron-job-run-details');
END $$;

-- alle 6 Stunden, versetzt zur vollen Stunde (Job 21 läuft jede Minute)
SELECT cron.schedule('vacuum-net-http-response', '23 */6 * * *',
  'VACUUM (ANALYZE) net._http_response');

-- täglich 30 min nach Job 24 (purge-cron-job-run-details, 03:17 UTC)
SELECT cron.schedule('vacuum-cron-job-run-details', '47 3 * * *',
  'VACUUM (ANALYZE) cron.job_run_details');
