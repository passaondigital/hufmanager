-- SICHERHEIT: Verhindert Self-Escalation / Payment-Bypass über profiles.
--
-- Problem: Die Policies "Users can update own profile" und "Final permissive update"
-- erlauben einem authentifizierten Nutzer, JEDE Spalte seiner EIGENEN profiles-Zeile
-- zu ändern (WITH CHECK nur auth.uid()=id, keine Spaltenrestriktion). Kein Trigger
-- schützt die Abrechnungs-/Plan-Spalten. Ein Nutzer könnte per direktem Client-Update
-- plan_override='lifetime_grant', subscription_plan='team', subscription_status='active'
-- oder feature_statuses=Vollset setzen und so kostenlos alle Pro/Team-Features freischalten.
--
-- Lösung: BEFORE UPDATE Trigger (analog prevent_role_self_update). Bei einem echten
-- Self-Update (auth.uid() = OLD.id) durch einen Nicht-Admin werden die geschützten
-- Spalten zwangsweise auf OLD zurückgesetzt — die Änderung wird still verworfen.
--
-- Kompatibilität:
--   * Service-Role / pg_cron (Trial-Downgrade): auth.uid() IS NULL → Bedingung greift NICHT,
--     diese Kontexte dürfen die Spalten weiterhin ändern.
--   * Admins (is_admin): ausgenommen.
--   * CopeCart-Webhook (service_role): unberührt.
--   * Provider, die fremde (connected) Profile updaten: OLD.id <> auth.uid() → unberührt
--     (deren Schutz läuft bereits über check_provider_profile_update_allowed).

CREATE OR REPLACE FUNCTION public.prevent_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Nur echte Self-Updates durch Nicht-Admins einschränken.
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
    -- Flag legitim per Self-Update nach erfolgreichem Passwortwechsel. Es ist kein
    -- Payment-/Privilege-Escalation-Vektor (ein Nutzer entkommt nur seinem eigenen
    -- erzwungenen Reset). Schutz dieser Spalte würde den Reset-Flow brechen.
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_prevent_billing_self_update ON public.profiles;
CREATE TRIGGER tr_prevent_billing_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_self_update();
