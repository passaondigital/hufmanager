-- APPLY 20260929100000_harden_profile_billing_fields_v1 auf PROD vnschgjxkzzwzefqlrji — erzeugt aus den Repo-Bytes (md5 de4643ac5065a48c3fc2d416d293e54f).
-- Eine Transaktion: md5-Guard → Ausführung genau dieses Textes (ohne äußeres BEGIN/COMMIT) → Ledger-Eintrag.
BEGIN;
CREATE TEMP TABLE _mig (t text) ON COMMIT DROP;
INSERT INTO _mig (t) VALUES ($MIGTEXT$-- P2 Hardening: serverseitige Billing-/Access-Felder in profiles gegen Nicht-Admin-Updates sperren.
--
-- STATUS: VORBEREITET, NICHT AUF PROD. Unabhängig vom Manual-Access-Writer (20260929090000) ausrollbar.
--
-- Befund (Audit 28.09.2026): prevent_billing_self_update schützte access_valid_until,
-- copecart_subscription_id, is_manually_managed, signup_app, vault_* und suspended_* NICHT.
-- Heute ohne Slim-Zugangswirkung (kanonisch = product_entitlements), aber:
--   * useAuth._checkProviderHasPro / ClientHome werten access_valid_until clientseitig aus (Legacy-Anzeige),
--   * Mission Control / KPIs zeigen diese Felder als Wahrheit an.
--
-- Legitime Schreiber (geprüft 28.09.): nur Admin-UI (Mission Control, God-Mode, ProviderManualActions) und
-- Service-Role-Functions (admin-create-user, copecart-webhook). Kein Frontend-Flow schreibt diese Felder als
-- normaler Nutzer; signup_app kommt ausschließlich über user_metadata im Auth-Insert (handle_new_user).
--
-- Regel: Bei JEDEM Update mit Nutzer-JWT (auth.uid() gesetzt) durch einen Nicht-Admin bleiben die neuen
-- Felder unverändert — auch bei Updates fremder Profile über „Providers can update connected profiles“.
-- Die bisherigen Felder behalten ihr bisheriges Verhalten (nur Self-Update gesperrt) — bewusst unverändert.
-- Service-Role (auth.uid() IS NULL) und Admins sind nicht betroffen. Kein user_metadata.

BEGIN;

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

COMMIT;
$MIGTEXT$);
DO $apply$
DECLARE s text;
BEGIN
  SELECT t INTO s FROM _mig;
  IF md5(s) <> 'de4643ac5065a48c3fc2d416d293e54f' THEN
    RAISE EXCEPTION 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', md5(s);
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260929100000') THEN
    RAISE EXCEPTION 'ABORT: Ledger enthält 20260929100000 bereits';
  END IF;
  EXECUTE replace(replace(s, E'\nBEGIN;\n', E'\n'), E'\nCOMMIT;\n', E'\n');
END
$apply$;
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
SELECT '20260929100000', 'harden_profile_billing_fields_v1', ARRAY[t]::text[], 'passaondigital@gmail.com' FROM _mig;
COMMIT;
