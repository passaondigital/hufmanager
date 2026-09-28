-- ROLLBACK für 20260929090000 (Manual-Access-Writer) + 20260929100000 (Profil-Härtung) auf PROD vnschgjxkzzwzefqlrji.
-- PROD-Vorzustand geprüft 28.09.2026 vor Apply:
--   _hm_has_hufmanager_access_v1(uuid)   md5 3d27137a3693978b710e6bb361438b61
--   get_hufmanager_access_context_v1()   md5 b97958cf8135ed60b2082ea8a82205db
--   has_hufmanager_access_v1()           md5 236566b1c0506101d3318d6c20906767
--   → byte-identisch mit docs/backups/mig20260929_manual_access_prestate_functions_LOCAL.sql (dort die Definitionen)
--   prevent_billing_self_update()        md5 d4f6ea440a1f38b845f6082f4108537f (Body unten, inhaltsgleich zu PROD)
--   product_entitlements: 42 Zeilen, md5 da5543de754b8fa2e12019e2b129a982, 0 Zeilen billing_provider='manual'
--   Ledger max 20260928100000
--
-- VOR Gate-Rollback prüfen: select count(*) from product_entitlements where billing_provider='manual';
-- (> 0 → befristete Manual-Grants liefen mit altem Gate nicht mehr ab; einzeln entscheiden.)

BEGIN;
-- 1) Gates: Definitionen aus docs/backups/mig20260929_manual_access_prestate_functions_LOCAL.sql einspielen (\i).
-- 2) Writer entfernen
DROP FUNCTION IF EXISTS public.hm_admin_set_hufmanager_manual_access_v1(uuid, text, date, text);
DROP FUNCTION IF EXISTS public.hm_set_hufmanager_manual_access_v1(uuid, text, date, text, uuid);
DROP FUNCTION IF EXISTS public.hm_manual_access_exclusive_end_v1(date);
-- Enum-Werte manual_access_granted/revoked bleiben (nicht entfernbar, ungenutzt harmlos).

-- 3) Profil-Härtung zurück auf PROD-Vorzustand
CREATE OR REPLACE FUNCTION public.prevent_billing_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id AND NOT public.is_admin(auth.uid()) THEN
    NEW.plan_override       := OLD.plan_override;
    NEW.subscription_plan   := OLD.subscription_plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.feature_statuses    := OLD.feature_statuses;
    NEW.account_status      := OLD.account_status;
    NEW.is_suspended        := OLD.is_suspended;
    NEW.trial_ends_at       := OLD.trial_ends_at;
    NEW.trial_started_at    := OLD.trial_started_at;
  END IF;
  RETURN NEW;
END;
$function$;

DELETE FROM supabase_migrations.schema_migrations WHERE version IN ('20260929090000', '20260929100000');
COMMIT;
-- Edge: admin-create-user v134 = git show e78f6c17:supabase/functions/admin-create-user/index.ts erneut deployen.
-- Frontend: /srv/hufi/business/hufmanager/app/current auf previous-Release zurücksetzen (siehe deploy.sh).
