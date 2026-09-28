-- Rollback 20260928100000: Termin-Guard-Fassung aus 20260927120000 (prosrc md5 f5395766c09a72b890dc0d0e740fa534)
BEGIN;
CREATE OR REPLACE FUNCTION public.hm_guard_appointment_relations_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor          uuid := auth.uid();
  v_owner          uuid;
  v_horse_deleted  timestamptz;
  v_tenant_changed boolean;
  v_assign_changed boolean;
  v_org_changed    boolean;
  v_is_admin       boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_tenant_changed := NEW.horse_id    IS DISTINCT FROM OLD.horse_id
                     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id;
    v_assign_changed := v_tenant_changed
                     OR NEW.assigned_to_user_id IS DISTINCT FROM OLD.assigned_to_user_id;
    v_org_changed    := v_tenant_changed
                     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id;
    IF NOT v_tenant_changed AND NOT v_assign_changed AND NOT v_org_changed
       AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id THEN
      RETURN NEW;
    END IF;
  ELSE
    v_tenant_changed := true;
    v_assign_changed := true;
    v_org_changed    := true;
  END IF;

  SELECT h.owner_id, h.deleted_at INTO v_owner, v_horse_deleted
  FROM public.horses h
  WHERE h.id = NEW.horse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pferd nicht gefunden'
      USING ERRCODE = '42501', DETAIL = 'appointments.horse_id references no horse';
  END IF;

  -- 1. Kunde passt zum Pferd. Einzige Ausnahme: vertrauenswürdiger
  --    Serverpfad (kein Endnutzer) hängt nur client_id um und die Zeile war
  --    schon vorher inkonsistent (z. B. Ghost-Merge nach Pferde-Umzug) —
  --    sonst würde eine Registrierung an Altdaten scheitern.
  IF NEW.client_id IS NOT NULL AND NEW.client_id <> v_owner THEN
    IF NOT (TG_OP = 'UPDATE'
            AND NOT v_tenant_changed
            AND v_actor IS NULL
            AND OLD.client_id IS NOT NULL
            AND OLD.client_id <> v_owner) THEN
      RAISE EXCEPTION 'Pferd gehört nicht zu diesem Kunden'
        USING ERRCODE = '42501', DETAIL = 'appointments.client_id must be the owner of appointments.horse_id';
    END IF;
  END IF;

  v_is_admin := v_actor IS NOT NULL
                AND (public.is_admin(v_actor) OR public.is_master_admin());

  -- 2. Handelnde Person: nur der Betrieb selbst, ein aktiver Mitarbeiter
  --    dieses Betriebs oder ein Admin. Ohne Endnutzer (service_role,
  --    Cron, Auth-Trigger) greift die Prüfung nicht — dort binden 3.-5.
  IF v_actor IS NOT NULL
     AND (v_tenant_changed OR (v_assign_changed AND NEW.assigned_to_user_id IS NOT NULL))
     AND v_actor <> NEW.provider_id
     AND NOT v_is_admin
     AND NOT public.is_employee_of_provider(v_actor, NEW.provider_id) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diesen Betrieb'
      USING ERRCODE = '42501', DETAIL = 'acting user is neither provider, active employee nor admin';
  END IF;

  -- 3. Pferd/Kunde gehört zum Betrieb
  IF v_tenant_changed THEN
    IF v_horse_deleted IS NOT NULL THEN
      RAISE EXCEPTION 'Pferd wurde gelöscht'
        USING ERRCODE = '42501', DETAIL = 'appointments.horse_id references a soft-deleted horse';
    END IF;

    IF v_owner IS DISTINCT FROM NEW.provider_id
       AND NOT public.has_active_access_grant(NEW.provider_id, v_owner)
       AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Kunde/Pferd gehört nicht zu diesem Betrieb'
        USING ERRCODE = '42501', DETAIL = 'no active access grant between provider and horse owner';
    END IF;
  END IF;

  -- 4. Zuständiger Mitarbeiter gehört zum Betrieb
  IF v_assign_changed
     AND NEW.assigned_to_user_id IS NOT NULL
     AND NEW.assigned_to_user_id <> NEW.provider_id
     AND NOT public.is_employee_of_provider(NEW.assigned_to_user_id, NEW.provider_id) THEN
    RAISE EXCEPTION 'Mitarbeiter gehört nicht zu diesem Betrieb'
      USING ERRCODE = '42501', DETAIL = 'appointments.assigned_to_user_id is no active employee of provider_id';
  END IF;

  -- 5. Organisation gehört zum Betrieb
  IF v_org_changed
     AND NEW.organization_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.organizations o
                     WHERE o.id = NEW.organization_id AND o.owner_id = NEW.provider_id)
     AND NOT EXISTS (SELECT 1 FROM public.organization_members m
                     WHERE m.org_id = NEW.organization_id AND m.user_id = NEW.provider_id
                       AND coalesce(m.is_active, true)) THEN
    RAISE EXCEPTION 'Organisation gehört nicht zu diesem Betrieb'
      USING ERRCODE = '42501', DETAIL = 'appointments.organization_id is not owned by provider_id';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.hm_guard_appointment_relations_v1() FROM PUBLIC, anon, authenticated;
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260928100000';
COMMIT;
