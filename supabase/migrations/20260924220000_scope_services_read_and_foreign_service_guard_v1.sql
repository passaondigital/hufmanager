-- P0 Leistungskatalog (24.09.2026): Leistungen sind Provider-Daten, kein globaler Katalog.
--
-- Vorher: Policy "Authenticated users can view active services" = jeder eingeloggte Nutzer
-- sah alle aktiven Leistungen aller Provider inkl. Preis; Termin-Formulare haben darüber
-- fremde service_id/Preise übernommen (22 Termine bei 5 Providern, bewusst NICHT angefasst).
--
-- 1) Lesen nur noch: eigener Provider, aktiver Mitarbeiter des Providers, Kunde mit aktivem
--    gültigem Access-Grant, Admin (user_roles) / Master-Admin (master_admins). Keine
--    Metadata-Prüfung. "Providers can view own services" (auch inaktive) bleibt unverändert.
-- 2) Schreibschutz: service_id muss dem Eigentümer der Zeile gehören. Geprüft nur bei INSERT
--    oder wenn Service- bzw. Eigentümer-Spalte sich ändert -> Bestandszeilen bleiben
--    bearbeitbar. Gilt für jede Rolle (auch service_role, RPCs, Edge Functions).

DROP POLICY IF EXISTS "Authenticated users can view active services" ON public.services;
DROP POLICY IF EXISTS "Scoped users can view active services" ON public.services;
CREATE POLICY "Scoped users can view active services" ON public.services
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      provider_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.is_master_admin()
      OR public.is_employee_of_provider(auth.uid(), provider_id)
      OR public.has_active_access_grant(provider_id, auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.hm_guard_service_owner_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_col   text := TG_ARGV[0];
  v_service_col text := TG_ARGV[1];
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb;
  v_service_id uuid := (v_new ->> v_service_col)::uuid;
  v_owner_id   uuid := (v_new ->> v_owner_col)::uuid;
BEGIN
  IF v_service_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    IF (v_old ->> v_service_col) IS NOT DISTINCT FROM (v_new ->> v_service_col)
       AND (v_old ->> v_owner_col) IS NOT DISTINCT FROM (v_new ->> v_owner_col) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_owner_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = v_service_id AND s.provider_id = v_owner_id
  ) THEN
    RAISE EXCEPTION 'Leistung gehört nicht zu diesem Betrieb'
      USING ERRCODE = '42501',
            DETAIL = format('%s.%s must reference a service of %s', TG_TABLE_NAME, v_service_col, v_owner_col);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.hm_guard_service_owner_v1() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.appointments;
CREATE TRIGGER trg_hm_guard_service_owner_v1
  BEFORE INSERT OR UPDATE OF service_id, provider_id ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.hm_guard_service_owner_v1('provider_id', 'service_id');

DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.service_price_overrides;
CREATE TRIGGER trg_hm_guard_service_owner_v1
  BEFORE INSERT OR UPDATE OF service_id, provider_id ON public.service_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.hm_guard_service_owner_v1('provider_id', 'service_id');

DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.autoflow_settings;
CREATE TRIGGER trg_hm_guard_service_owner_v1
  BEFORE INSERT OR UPDATE OF default_service_id, provider_id ON public.autoflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.hm_guard_service_owner_v1('provider_id', 'default_service_id');

DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.payment_products;
CREATE TRIGGER trg_hm_guard_service_owner_v1
  BEFORE INSERT OR UPDATE OF service_id, user_id ON public.payment_products
  FOR EACH ROW EXECUTE FUNCTION public.hm_guard_service_owner_v1('user_id', 'service_id');
