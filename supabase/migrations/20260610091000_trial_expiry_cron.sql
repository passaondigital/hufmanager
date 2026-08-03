-- Täglich abgelaufene Trials auf den kostenlosen Starter-Plan DOWNGRADEN
-- (Produktentscheidung 12.06.2026: nicht sperren, sondern weiterarbeiten lassen
--  mit Starter-Limits — 20 Pferdeakten, 5 Rechnungen/Monat).
--
-- Schutzlogik:
--   plan_override IS NULL  → alle CopeCart-Käufer (plan_override = 'copecart_pro' etc.),
--                            lifetime_grant, manual_cash_1y und beta_tester-Accounts
--                            werden NICHT angefasst.
--   subscription_status = 'trialing' → aktive Abos ('active') und echte Kündigungen
--                                      ('cancelled') sind nicht betroffen.
--   Trial-Dauer = 14 Tage (Landing-Page maßgeblich).
--
-- feature_statuses wird KOMPLETT auf das kanonische 23-Key-Starter-Set gesetzt
-- (Quelle: src/lib/plan-features.ts) — keine Halbzustände.
--
-- Idempotent: unschedule-Guard verhindert doppelten Job bei Re-Run der Migration;
-- entfernt zugleich den alten 'expire-trialing-accounts'-Job (cancelled-Logik), falls vorhanden.

DO $guard$
BEGIN
  PERFORM cron.unschedule('downgrade-expired-trials');
EXCEPTION WHEN OTHERS THEN NULL;
END $guard$;

DO $guard$
BEGIN
  PERFORM cron.unschedule('expire-trialing-accounts');
EXCEPTION WHEN OTHERS THEN NULL;
END $guard$;

SELECT cron.schedule(
  'downgrade-expired-trials',
  '0 2 * * *',
  $$
    -- account_status='expired' = einheitlicher Trial-Ende-Marker; löst NUR den
    -- nicht-blockierenden TrialPaywall-Banner aus (keine Sperre). subscription_status
    -- bleibt 'active' (Starter-Kunde) — 'cancelled' ist echten Kündigungen vorbehalten.
    UPDATE public.profiles
    SET subscription_status = 'active',
        account_status      = 'expired',
        subscription_plan   = 'starter',
        feature_statuses = jsonb_build_object(
          'module_invoicing',       'public',
          'module_chat',            'public',
          'module_maps',            'public',
          'module_academy',         'public',
          'module_hufanalyse',      'public',
          'module_network',         'disabled',
          'module_analytics',       'public',
          'module_office',          'public',
          'module_lager',           'public',
          'module_team',            'disabled',
          'autoflow_reminders',     'disabled',
          'autoflow_invoicing',     'disabled',
          'autoflow_scheduling',    'disabled',
          'autoflow_feedback',      'disabled',
          'autoflow_checkin',       'disabled',
          'beta_features',          'disabled',
          'widget_embed',           'public',
          'widget_custom_style',    'disabled',
          'widget_white_label',     'disabled',
          'custom_domain_addon',    'disabled',
          'affiliate_program',      'disabled',
          'cooperation_visibility', 'disabled',
          'education_certificates', 'public'
        )
    WHERE subscription_status = 'trialing'
      AND plan_override IS NULL
      AND created_at < now() - interval '14 days';
  $$
);
