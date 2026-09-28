BEGIN;
-- P1 Tenant-Isolation: Provider darf sich nicht selbst an fremde Kunden hängen (2026-09-28)
--
-- Befund (PROD, 27./28.09.2026):
--   * RLS auf access_grants enthält die permissive ALL-Policy
--     "Provider sees own grants" (USING provider_id = auth.uid(), ohne
--     WITH CHECK). Damit darf ein Provider jede Zeile mit seiner provider_id
--     anlegen oder ändern — die engeren INSERT-/UPDATE-Policies wirken nicht.
--   * Einziger Schutz ist dieser Trigger. Er prüfte nur echte Auth-Kunden:
--       a) Ghost-Kunde (Profil ohne auth.users) eines ANDEREN Betriebs:
--          aktiver Grant per INSERT möglich -> Profil, Pferde, Termine.
--       b) UPDATE eines eigenen, bereits aktiven Grants mit neuer client_id:
--          weder für Ghosts noch für echte Kunden geprüft (nur der Wechsel
--          inaktiv -> aktiv wurde abgefangen).
--   * Stand PROD: 0 Grants von Betrieben an fremde Ghosts, 0 aktive -> kein
--     Missbrauch belegt, keine Bestandsdaten betroffen.
--
-- Regel (neu, nur wenn der Aufrufer selbst als dieser Betrieb handelt,
-- d. h. auth.uid() = NEW.provider_id):
--   * Eine NEUE Beziehung ist INSERT oder UPDATE mit geänderter client_id /
--     provider_id. Sie wird wie ein INSERT behandelt.
--   * Ghost-Kunde: neue Beziehung oder Aktivierung nur, wenn der Ghost von
--     genau diesem Betrieb angelegt wurde (profiles.created_by_provider_id).
--   * Echter Kunde: unverändert — kein aktiver Grant ohne Zustimmung, jetzt
--     auch beim Umhängen per UPDATE.
--   * Deaktivieren/Beenden bleibt immer erlaubt.
-- Nicht betroffen: Service-Role/Edge (auth.uid() leer, z. B. Invite-RPC
-- create_invited_customer_with_contact), Trigger-Pfade ohne Provider-Session
-- (handle_new_user), Kunden-Selbstverbindung (auth.uid() = client_id),
-- auto_create_access_grant_for_client (Ghost gehört dem anlegenden Betrieb).
--
-- Rollback: docs/backups/mig16_20260928090000_rollback.sql (stellt die
-- vorherige Funktionsfassung wörtlich wieder her).

CREATE OR REPLACE FUNCTION public.enforce_access_grant_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_real_client boolean;
  v_caller_is_provider boolean;
  v_acts_as_provider boolean;
  v_new_relation boolean;
  v_activating boolean;
  v_ghost_owner uuid;
BEGIN
  -- Determine if target client is a real Auth client (exists in auth.users)
  v_is_real_client := EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.client_id
  );

  v_caller_is_provider := (v_uid = NEW.provider_id) AND public.has_role(v_uid, 'provider'::public.app_role);
  v_acts_as_provider := v_uid IS NOT NULL AND v_uid = NEW.provider_id;

  IF TG_OP = 'INSERT' THEN
    v_new_relation := true;
    v_activating := coalesce(NEW.is_active, false) OR NEW.status = 'active';
  ELSE
    v_new_relation := NEW.client_id IS DISTINCT FROM OLD.client_id
                   OR NEW.provider_id IS DISTINCT FROM OLD.provider_id;
    v_activating := (OLD.is_active = false OR OLD.status <> 'active')
                    AND (NEW.is_active = true OR NEW.status = 'active');
  END IF;

  -- Ghost-Kunde: nur der Betrieb, der ihn angelegt hat, darf sich verbinden
  IF v_acts_as_provider AND NOT v_is_real_client AND (v_new_relation OR v_activating) THEN
    SELECT p.created_by_provider_id INTO v_ghost_owner
    FROM public.profiles p
    WHERE p.id = NEW.client_id;

    IF v_ghost_owner IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot connect to customers created by another provider.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Only enforce restrictions when provider is acting on real auth client grants
  IF v_caller_is_provider AND v_is_real_client THEN
    IF TG_OP = 'INSERT' OR v_new_relation THEN
      -- Provider cannot insert (or re-point) an ACTIVE grant for a real Auth client
      IF NEW.is_active = true OR NEW.status = 'active' THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot unilaterally create active grants for real clients.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Provider cannot activate a pending/inactive grant for a real Auth client
      IF (OLD.is_active = false OR OLD.status <> 'active') AND (NEW.is_active = true OR NEW.status = 'active') THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot activate access grants for real clients.';
      END IF;

      -- Provider cannot escalate can_view_medical permission without client authorization
      IF OLD.can_view_medical = false AND NEW.can_view_medical = true THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot grant themselves medical permissions for real clients.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_access_grant_security() FROM PUBLIC, anon, authenticated;

INSERT INTO supabase_migrations.schema_migrations(version, name, statements, created_by)
VALUES ('20260928090000', 'fix_foreign_ghost_grant_v1', ARRAY[$mig$-- P1 Tenant-Isolation: Provider darf sich nicht selbst an fremde Kunden hängen (2026-09-28)
--
-- Befund (PROD, 27./28.09.2026):
--   * RLS auf access_grants enthält die permissive ALL-Policy
--     "Provider sees own grants" (USING provider_id = auth.uid(), ohne
--     WITH CHECK). Damit darf ein Provider jede Zeile mit seiner provider_id
--     anlegen oder ändern — die engeren INSERT-/UPDATE-Policies wirken nicht.
--   * Einziger Schutz ist dieser Trigger. Er prüfte nur echte Auth-Kunden:
--       a) Ghost-Kunde (Profil ohne auth.users) eines ANDEREN Betriebs:
--          aktiver Grant per INSERT möglich -> Profil, Pferde, Termine.
--       b) UPDATE eines eigenen, bereits aktiven Grants mit neuer client_id:
--          weder für Ghosts noch für echte Kunden geprüft (nur der Wechsel
--          inaktiv -> aktiv wurde abgefangen).
--   * Stand PROD: 0 Grants von Betrieben an fremde Ghosts, 0 aktive -> kein
--     Missbrauch belegt, keine Bestandsdaten betroffen.
--
-- Regel (neu, nur wenn der Aufrufer selbst als dieser Betrieb handelt,
-- d. h. auth.uid() = NEW.provider_id):
--   * Eine NEUE Beziehung ist INSERT oder UPDATE mit geänderter client_id /
--     provider_id. Sie wird wie ein INSERT behandelt.
--   * Ghost-Kunde: neue Beziehung oder Aktivierung nur, wenn der Ghost von
--     genau diesem Betrieb angelegt wurde (profiles.created_by_provider_id).
--   * Echter Kunde: unverändert — kein aktiver Grant ohne Zustimmung, jetzt
--     auch beim Umhängen per UPDATE.
--   * Deaktivieren/Beenden bleibt immer erlaubt.
-- Nicht betroffen: Service-Role/Edge (auth.uid() leer, z. B. Invite-RPC
-- create_invited_customer_with_contact), Trigger-Pfade ohne Provider-Session
-- (handle_new_user), Kunden-Selbstverbindung (auth.uid() = client_id),
-- auto_create_access_grant_for_client (Ghost gehört dem anlegenden Betrieb).
--
-- Rollback: docs/backups/mig16_20260928090000_rollback.sql (stellt die
-- vorherige Funktionsfassung wörtlich wieder her).

CREATE OR REPLACE FUNCTION public.enforce_access_grant_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_real_client boolean;
  v_caller_is_provider boolean;
  v_acts_as_provider boolean;
  v_new_relation boolean;
  v_activating boolean;
  v_ghost_owner uuid;
BEGIN
  -- Determine if target client is a real Auth client (exists in auth.users)
  v_is_real_client := EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.client_id
  );

  v_caller_is_provider := (v_uid = NEW.provider_id) AND public.has_role(v_uid, 'provider'::public.app_role);
  v_acts_as_provider := v_uid IS NOT NULL AND v_uid = NEW.provider_id;

  IF TG_OP = 'INSERT' THEN
    v_new_relation := true;
    v_activating := coalesce(NEW.is_active, false) OR NEW.status = 'active';
  ELSE
    v_new_relation := NEW.client_id IS DISTINCT FROM OLD.client_id
                   OR NEW.provider_id IS DISTINCT FROM OLD.provider_id;
    v_activating := (OLD.is_active = false OR OLD.status <> 'active')
                    AND (NEW.is_active = true OR NEW.status = 'active');
  END IF;

  -- Ghost-Kunde: nur der Betrieb, der ihn angelegt hat, darf sich verbinden
  IF v_acts_as_provider AND NOT v_is_real_client AND (v_new_relation OR v_activating) THEN
    SELECT p.created_by_provider_id INTO v_ghost_owner
    FROM public.profiles p
    WHERE p.id = NEW.client_id;

    IF v_ghost_owner IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot connect to customers created by another provider.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Only enforce restrictions when provider is acting on real auth client grants
  IF v_caller_is_provider AND v_is_real_client THEN
    IF TG_OP = 'INSERT' OR v_new_relation THEN
      -- Provider cannot insert (or re-point) an ACTIVE grant for a real Auth client
      IF NEW.is_active = true OR NEW.status = 'active' THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot unilaterally create active grants for real clients.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Provider cannot activate a pending/inactive grant for a real Auth client
      IF (OLD.is_active = false OR OLD.status <> 'active') AND (NEW.is_active = true OR NEW.status = 'active') THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot activate access grants for real clients.';
      END IF;

      -- Provider cannot escalate can_view_medical permission without client authorization
      IF OLD.can_view_medical = false AND NEW.can_view_medical = true THEN
        RAISE EXCEPTION 'P0_SECURITY_VIOLATION: Providers cannot grant themselves medical permissions for real clients.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_access_grant_security() FROM PUBLIC, anon, authenticated;
$mig$], 'claude-code');
COMMIT;
