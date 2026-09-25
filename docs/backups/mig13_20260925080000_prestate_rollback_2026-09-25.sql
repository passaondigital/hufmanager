-- Rollback fuer 20260925080000_limit_slim_trial_to_hufmanager_signup_v1
-- Stellt den Trigger-Body exakt wie vor der Migration her (md5(prosrc)=37f3d54fc3f0120a70c7c11329939271,
-- live von PROD gelesen 25.09.2026). Bereits erzeugte Trials bleiben unveraendert.
BEGIN;
CREATE OR REPLACE FUNCTION public.hm_user_roles_start_slim_trial_trigger_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'provider' THEN
    BEGIN
      PERFORM public.hm_start_hufmanager_slim_trial_v1(NEW.user_id, 'provider_role_assigned');
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
$function$;
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260925080000';
COMMIT;
