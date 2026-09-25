BEGIN;
-- HufManager Slim: Trial nur fuer echte HufManager-Provider-Registrierungen (2026-09-25)
--
-- Befund (Release-Check 25.09.): trg_user_roles_start_slim_trial startete den
-- 14-Tage-Slim-Trial fuer JEDE neue Provider-Rolle, unabhaengig von der App,
-- ueber die registriert wurde. Kuenftige HufiApp-Provider haetten damit einen
-- HufManager-Slim-Trial erhalten.
--
-- Regel (fail-closed, Owner-Freigabe 24./25.09.):
--   Der Signup-Trigger startet den Trial NUR, wenn profiles.signup_app =
--   'hufmanager'. handle_new_user schreibt profiles (inkl. signup_app aus
--   user_metadata) VOR user_roles in derselben Transaktion, der Wert ist hier
--   also bereits sichtbar. hufiapp, NULL (Skript-/Admin-Anlagen) oder jeder
--   andere Wert -> kein automatischer Trial.
--
-- Unveraendert: hm_start_hufmanager_slim_trial_v1 (service_role-only) bleibt
-- fuer bewusste manuelle Freischaltung nutzbar; Writer-Guard, Idempotenz und
-- "nie bestehende Entitlements ueberschreiben" bleiben wie in 20260924120000.
-- Bestehende Entitlements/Trials werden von dieser Migration nicht angefasst.
--
-- Rollback: Funktionskoerper aus 20260924120000 (hm_user_roles_start_slim_trial_trigger_v1)
-- erneut ausfuehren.


CREATE OR REPLACE FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.role = 'provider' THEN
    BEGIN
      -- Nur HufManager-Registrierungen erhalten automatisch den Slim-Trial.
      IF EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = NEW.user_id AND signup_app = 'hufmanager'
      ) THEN
        PERFORM public.hm_start_hufmanager_slim_trial_v1(NEW.user_id, 'provider_role_assigned');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Sichtbar machen, aber NIE die Registrierung abbrechen: das Logging
      -- selbst ist nochmals abgesichert. origin_event_id ist NOT NULL, daher
      -- eine deterministische ID pro User (Wiederholungen fallen zusammen).
      BEGIN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'TRIAL_START_UNEXPECTED_ERROR', 'HIGH', md5('hm-slim-trial:' || NEW.user_id::text)::uuid,
          'admin', NEW.user_id, NULL, 'hm-slim-trial:' || NEW.user_id::text, NULL,
          jsonb_build_object('sqlstate', SQLSTATE, 'sqlerrm', SQLERRM)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM anon;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM authenticated;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements, created_by)
VALUES ('20260925080000', 'limit_slim_trial_to_hufmanager_signup_v1', ARRAY[$mig$-- HufManager Slim: Trial nur fuer echte HufManager-Provider-Registrierungen (2026-09-25)
--
-- Befund (Release-Check 25.09.): trg_user_roles_start_slim_trial startete den
-- 14-Tage-Slim-Trial fuer JEDE neue Provider-Rolle, unabhaengig von der App,
-- ueber die registriert wurde. Kuenftige HufiApp-Provider haetten damit einen
-- HufManager-Slim-Trial erhalten.
--
-- Regel (fail-closed, Owner-Freigabe 24./25.09.):
--   Der Signup-Trigger startet den Trial NUR, wenn profiles.signup_app =
--   'hufmanager'. handle_new_user schreibt profiles (inkl. signup_app aus
--   user_metadata) VOR user_roles in derselben Transaktion, der Wert ist hier
--   also bereits sichtbar. hufiapp, NULL (Skript-/Admin-Anlagen) oder jeder
--   andere Wert -> kein automatischer Trial.
--
-- Unveraendert: hm_start_hufmanager_slim_trial_v1 (service_role-only) bleibt
-- fuer bewusste manuelle Freischaltung nutzbar; Writer-Guard, Idempotenz und
-- "nie bestehende Entitlements ueberschreiben" bleiben wie in 20260924120000.
-- Bestehende Entitlements/Trials werden von dieser Migration nicht angefasst.
--
-- Rollback: Funktionskoerper aus 20260924120000 (hm_user_roles_start_slim_trial_trigger_v1)
-- erneut ausfuehren.

BEGIN;

CREATE OR REPLACE FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.role = 'provider' THEN
    BEGIN
      -- Nur HufManager-Registrierungen erhalten automatisch den Slim-Trial.
      IF EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = NEW.user_id AND signup_app = 'hufmanager'
      ) THEN
        PERFORM public.hm_start_hufmanager_slim_trial_v1(NEW.user_id, 'provider_role_assigned');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Sichtbar machen, aber NIE die Registrierung abbrechen: das Logging
      -- selbst ist nochmals abgesichert. origin_event_id ist NOT NULL, daher
      -- eine deterministische ID pro User (Wiederholungen fallen zusammen).
      BEGIN
        PERFORM public._hm_reconciliation_issue_upsert_v1(
          'TRIAL_START_UNEXPECTED_ERROR', 'HIGH', md5('hm-slim-trial:' || NEW.user_id::text)::uuid,
          'admin', NEW.user_id, NULL, 'hm-slim-trial:' || NEW.user_id::text, NULL,
          jsonb_build_object('sqlstate', SQLSTATE, 'sqlerrm', SQLERRM)
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM anon;
REVOKE ALL ON FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1() FROM authenticated;

COMMIT;
$mig$], 'claude-code');
COMMIT;
