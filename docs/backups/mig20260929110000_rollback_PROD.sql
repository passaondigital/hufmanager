-- ROLLBACK 20260929110000 (account_class) auf PROD. Zugang ist nicht betroffen (keine Gate-Funktion liest account_class).
BEGIN;
DROP TRIGGER IF EXISTS tr_enforce_profile_account_class_on_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_profile_account_class_on_insert();
-- prevent_billing_self_update zurück auf Stand 20260929100000 (md5 c25b2d08…):
CREATE OR REPLACE FUNCTION public.prevent_billing_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Nur echte Self-Updates durch Nicht-Admins einschränken (bestehendes Verhalten).
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_admin(auth.uid())
  THEN
    NEW.plan_override       := OLD.plan_override;
    NEW.subscription_plan   := OLD.subscription_plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.feature_statuses    := OLD.feature_statuses;
    NEW.account_status      := OLD.account_status;
    NEW.is_suspended        := OLD.is_suspended;
    NEW.trial_ends_at       := OLD.trial_ends_at;
    NEW.trial_started_at    := OLD.trial_started_at;
    -- force_password_reset BEWUSST NICHT geschützt: UpdatePassword.tsx löscht das
    -- Flag legitim per Self-Update nach erfolgreichem Passwortwechsel.
  END IF;

  -- Neu (P2, 28.09.2026): serverseitige Billing-/Access-Felder für jeden Nicht-Admin mit Nutzer-JWT.
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
  THEN
    NEW.access_valid_until       := OLD.access_valid_until;
    NEW.copecart_subscription_id := OLD.copecart_subscription_id;
    NEW.is_manually_managed      := OLD.is_manually_managed;
    NEW.signup_app               := OLD.signup_app;
    NEW.vault_plan               := OLD.vault_plan;
    NEW.vault_plan_status        := OLD.vault_plan_status;
    NEW.vault_subscription_id    := OLD.vault_subscription_id;
    NEW.vault_billing_cycle      := OLD.vault_billing_cycle;
    NEW.suspended_at             := OLD.suspended_at;
    NEW.suspended_reason         := OLD.suspended_reason;
  END IF;

  RETURN NEW;
END;
$function$;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_class;
DROP TYPE IF EXISTS public.profile_account_class;
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260929110000';
COMMIT;
-- Frontend/Edge vorher zurückrollen (sie lesen/schreiben account_class): ./deploy.sh hufmanager --rollback, Edge v135.
