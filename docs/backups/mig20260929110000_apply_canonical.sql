-- APPLY 20260929110000_add_profile_account_class_v1 auf PROD vnschgjxkzzwzefqlrji — erzeugt aus den Repo-Bytes (md5 0a30f650d0649adcde92b0ef7c1fef17).
-- Eine Transaktion: md5-Guard → Ausführung genau dieses Textes (ohne äußeres BEGIN/COMMIT) → Ledger-Eintrag.
-- Vorbedingung: prevent_billing_self_update md5 c25b2d0899e0496cae4c052ebd10011f (Stand 20260929100000).
BEGIN;
CREATE TEMP TABLE _mig (t text) ON COMMIT DROP;
INSERT INTO _mig (t) VALUES ($MIGTEXT$-- Kanonische Konto-Klassifizierung für Statistik/Admin-Filter (Owner-Entscheidung 28.09.2026, Variante B).
--
-- profiles.account_class ∈ {real, demo, qa, test_fixture}, NOT NULL, Default real.
--   * Ausschließlich Statistik, Admin-Filterung, QA-/Demo-Kennzeichnung und Audit-/Migrationskontext.
--   * Gewährt oder entzieht KEINEN Zugang: product_entitlements bleibt die einzige Access-Wahrheit
--     (keine Gate-/Writer-/Trigger-Funktion liest account_class).
--   * Setzen/Ändern nur durch Admin (Mission Control) oder service_role (admin-create-user).
--     Nutzer-JWT ohne Admin: UPDATE lässt den alten Wert stehen, INSERT erzwingt 'real'.
--
-- Kein Backfill in dieser Migration: bestehende Konten werden separat und nur über explizite IDs
-- klassifiziert (docs/backups/mig20260929110000_account_class_backfill_PROD.sql, eigene Freigabe).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'profile_account_class') THEN
    CREATE TYPE public.profile_account_class AS ENUM ('real', 'demo', 'qa', 'test_fixture');
  END IF;
END
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_class public.profile_account_class NOT NULL DEFAULT 'real';

COMMENT ON COLUMN public.profiles.account_class IS
  'Statistik-/Admin-Klassifizierung (real|demo|qa|test_fixture). Kein Zugangskriterium – Zugang nur über product_entitlements. Nur Admin/service_role.';

-- Profil-Härtung (20260929100000) um account_class erweitert; übriger Body unverändert.
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
    NEW.account_class            := OLD.account_class;
  END IF;

  RETURN NEW;
END;
$function$;

-- INSERT mit Nutzer-JWT (ohne Admin) kann keine Sonderklasse setzen.
CREATE OR REPLACE FUNCTION public.enforce_profile_account_class_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.account_class := 'real';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_profile_account_class_on_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_enforce_profile_account_class_on_insert ON public.profiles;
CREATE TRIGGER tr_enforce_profile_account_class_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_account_class_on_insert();

COMMIT;
$MIGTEXT$);
DO $apply$
DECLARE s text;
BEGIN
  SELECT t INTO s FROM _mig;
  IF md5(s) <> '0a30f650d0649adcde92b0ef7c1fef17' THEN
    RAISE EXCEPTION 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', md5(s);
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260929110000') THEN
    RAISE EXCEPTION 'ABORT: Ledger enthält 20260929110000 bereits';
  END IF;
  IF md5(pg_get_functiondef('public.prevent_billing_self_update()'::regprocedure)) <> 'c25b2d0899e0496cae4c052ebd10011f' THEN
    RAISE EXCEPTION 'ABORT: prevent_billing_self_update weicht vom erwarteten Vorzustand ab';
  END IF;
  EXECUTE replace(replace(s, E'\nBEGIN;\n', E'\n'), E'\nCOMMIT;\n', E'\n');
END
$apply$;
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
SELECT '20260929110000', 'add_profile_account_class_v1', ARRAY[t]::text[], 'passaondigital@gmail.com' FROM _mig;
COMMIT;
