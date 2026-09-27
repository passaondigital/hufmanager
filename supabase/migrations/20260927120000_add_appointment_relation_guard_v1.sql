-- P1 Termin-DB-Guard: Pferd/Kunde/Mitarbeiter/Organisation <-> Betrieb
--
-- Bisher prüft die DB bei appointments nur provider_id = auth.uid() (RLS) und
-- die Leistung (trg_hm_guard_service_owner_v1). Ob Pferd und Kunde überhaupt
-- zu diesem Betrieb gehören, prüfte nur die Oberfläche. Service-Role-Pfade
-- (hufi-agent create_appointment, Demo-Seeds) umgehen RLS komplett.
--
-- Kanonische Regel (aus bestehendem System abgeleitet, 27.09.2026):
--   Ein Betrieb darf ein Pferd nur verplanen, wenn er zum Pferdebesitzer
--   einen aktiven, gültigen Grant hat (has_active_access_grant) — dieselbe
--   Regel, mit der RLS dem Betrieb das Pferd überhaupt zeigt
--   ("Provider can view client horses timed"). created_by_provider_id ist
--   KEIN Anker (vom Kunden selbst editierbar; beendete Verbindungen bleiben
--   daran hängen). Eigenes Pferd des Betriebs ist erlaubt.
--
-- Wirkung:
--   * nur bei INSERT oder wenn horse_id/client_id/provider_id/
--     assigned_to_user_id/organization_id sich ändern — Alttermine
--     (134 ohne aktiven Grant) bleiben unverändert bearbeitbar
--   * gilt für alle Rollen inkl. service_role / SECURITY DEFINER / Edge
--   * Admin/Master-Admin dürfen Betriebsbeziehung übergehen, nie aber
--     Pferd <-> Kunde inkonsistent machen
--   * Ghost-Merge (handle_new_user, create_invited_customer_with_contact)
--     ändert nur client_id nachdem horses.owner_id umgehängt wurde -> passt
--
-- Rollback: docs/backups/mig14_20260927120000_rollback.sql

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

DROP TRIGGER IF EXISTS trg_hm_guard_appointment_relations_v1 ON public.appointments;
CREATE TRIGGER trg_hm_guard_appointment_relations_v1
  BEFORE INSERT OR UPDATE OF horse_id, client_id, provider_id, assigned_to_user_id, organization_id
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.hm_guard_appointment_relations_v1();
