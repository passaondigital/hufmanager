-- ROLLBACK / PRE-STATE Migration #6
-- 20260917155000_fix_invite_tenant_auto_assign_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Herkunft dieser Datei ───────────────────────────────────────────────────
-- Der Funktionsrumpf unten ist NICHT rekonstruiert. Er ist die woertliche
-- Ausgabe von pg_get_functiondef() aus Production, base64-transportiert und
-- lokal dekodiert, damit kein Zeichen ueber JSON-Escaping verlorengeht:
--
--   functiondef md5    = 8e37ff3a5a0fadbf2fcfe7c08bd311fe  (2007 Bytes)
--   prosrc md5 (vorher)= b015f90bd1e72e9680f8ad91129f7591  (1834 Bytes)
--   prosrc md5 (nach #6, Zielwert)
--                      = b6f62858b4de1b61a9a7503e1668e209
--
-- ── Warum der Rueckweg deterministisch ist ──────────────────────────────────
-- #6 besteht aus genau einem Statement: CREATE OR REPLACE FUNCTION auf
-- public.auto_assign_client_to_provider(). Kein DML, keine Grants, keine
-- Trigger-, Tabellen- oder RLS-Aenderung, 0 betroffene Bestandszeilen. Der
-- Rueckweg ist deshalb: dieselbe Funktion mit der alten Definition
-- zurueckschreiben und die Ledger-Zeile entfernen.
--
-- ── Owner / SECDEF / search_path / ACL ──────────────────────────────────────
-- CREATE OR REPLACE FUNCTION aendert weder Owner noch ACL. Owner bleibt
-- postgres, die Rechte bleiben unveraendert. Die Attribute SECURITY DEFINER
-- und SET search_path stehen woertlich im wiederhergestellten Text, sind also
-- ebenfalls exakt die alten:
--
--   owner        = postgres
--   rettype      = trigger      pronargs = 0
--   SECDEF       = true         search_path = public
--   volatility   = v            strict = false   leakproof = false
--   parallel     = u
--   ACL          = =X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
--
-- HINWEIS zur ACL: die EXECUTE-Rechte fuer PUBLIC/anon/authenticated sind ein
-- BESTEHENDER Legacy-Befund, nicht von #6 verursacht. Diese Datei stellt sie
-- unveraendert wieder her und "repariert" sie bewusst NICHT — eine
-- Hardening-Entscheidung gehoert nicht in einen Rollback.
--
-- ── Was diese Datei bewusst NICHT anfasst ──────────────────────────────────
--   * Migration #5 20260917150000 und den Pending-Invite-Vertrag
--   * das search_path-Hardening 20260917152500
--   * #1-#4, #7-#9
--   * public.hm_pending_client_invites, RLS, Policies, Grants
--   * handle_new_user, auto_create_access_grant_for_client, alle Trigger
--   * Kundendaten, Ghost-Profile, Duplikat-Gruppen, auth.users
--   * Pferde, Termine, Rechnungen, Dokumente, Vault, Edge Functions
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ─────────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig6_20260917155000_prestate_rollback_2026-09-21.sql

begin;

-- ── Guard 1: spaetere Kettenglieder duerfen nicht angewendet sein ──────────
-- #7-#9 setzen die #6-Unterdrueckung voraus (#8 sagt das im Kommentar
-- ausdruecklich). #6 isoliert zurueckzudrehen, waehrend ein spaeteres Glied
-- drin ist, wuerde die Invite-Kette zerreissen statt sie wiederherzustellen.
do $guard_chain$
declare v_later text;
begin
  select string_agg(version, ', ' order by version) into v_later
  from supabase_migrations.schema_migrations
  where version in ('20260917160000','20260920120000','20260920190000');

  if v_later is not null then
    raise exception
      'ABORT: spaetere Migrationen der Invite-Kette sind angewendet (%). #6 darf nicht isoliert zurueckgerollt werden.',
      v_later;
  end if;
end
$guard_chain$;

-- ── Guard 2: es ist wirklich die #6-Fassung, die hier zurueckgerollt wird ──
do $guard_state$
declare v_md5 text; v_secdef boolean; v_cfg text; v_owner text;
begin
  select md5(p.prosrc), p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         pg_get_userbyid(p.proowner)
    into v_md5, v_secdef, v_cfg, v_owner
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  if v_md5 is null then
    raise exception 'ABORT: public.auto_assign_client_to_provider() existiert nicht.';
  end if;

  if v_md5 = 'b015f90bd1e72e9680f8ad91129f7591' then
    raise notice 'HINWEIS: Funktion ist bereits im Pre-State — #6 war nicht aktiv.';
  elsif v_md5 <> 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception
      'ABORT: prosrc-md5 % ist weder der #6-Stand noch der Pre-State. Fremde Aenderung, erst analysieren.',
      v_md5;
  end if;

  if not v_secdef or v_cfg <> 'search_path=public' or v_owner <> 'postgres' then
    raise exception 'ABORT: unerwartete Attribute (secdef=%, cfg=%, owner=%)', v_secdef, v_cfg, v_owner;
  end if;
end
$guard_state$;

-- ── 1. Alte Funktionsdefinition woertlich zurueckschreiben ────────────────
-- Unveraenderte pg_get_functiondef()-Ausgabe aus Production.
CREATE OR REPLACE FUNCTION public.auto_assign_client_to_provider()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  first_provider_id uuid;
  new_user_email text;
  demo_emails text[] := ARRAY[
    'hufbearbeiter.hufmanager@gmail.com',
    'pferdebesitzer.hufmanager@gmail.com',
    'mitarbeiter.hufmanager@gmail.com',
    'partner.hufmanager@gmail.com',
    'hufmanagerbusiness@gmail.com',
    'hufmanagerstallbetreiber@gmail.com'
  ];
BEGIN
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.access_grants
    WHERE client_id = NEW.user_id
      AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.user_id
      AND created_by_provider_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  SELECT email
  INTO new_user_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF new_user_email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles gp
    JOIN public.access_grants ag
      ON ag.client_id = gp.id
     AND ag.is_active = true
    WHERE gp.email = new_user_email
      AND gp.id <> NEW.user_id
      AND gp.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = gp.id
      )
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ur.user_id
  INTO first_provider_id
  FROM public.user_roles ur
  JOIN public.profiles p
    ON p.id = ur.user_id
  WHERE ur.role = 'provider'
    AND p.deleted_at IS NULL
    AND COALESCE(p.email, '') <> ALL(demo_emails)
  ORDER BY ur.id
  LIMIT 1;

  IF first_provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.access_grants (
    provider_id,
    client_id,
    is_active,
    can_view_basic,
    can_view_medical,
    can_create_appointments
  )
  VALUES (
    first_provider_id,
    NEW.user_id,
    true,
    true,
    true,
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ── 2. Genau die eine Ledger-Zeile ────────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260917155000';

-- ── 3. Postcheck im selben Transaktionsblock ──────────────────────────────
do $verify$
declare
  v_md5 text; v_owner text; v_secdef boolean; v_cfg text; v_acl text;
  v_vol "char"; v_strict boolean; v_leak boolean; v_par "char";
  v_ledger int; v_mig5 int; v_hard int;
begin
  select md5(p.prosrc), pg_get_userbyid(p.proowner), p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL'),
         p.provolatile, p.proisstrict, p.proleakproof, p.proparallel
    into v_md5, v_owner, v_secdef, v_cfg, v_acl, v_vol, v_strict, v_leak, v_par
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  select count(*) into v_ledger from supabase_migrations.schema_migrations where version = '20260917155000';
  select count(*) into v_mig5   from supabase_migrations.schema_migrations where version = '20260917150000';
  select count(*) into v_hard   from supabase_migrations.schema_migrations where version = '20260917152500';

  if v_md5 <> 'b015f90bd1e72e9680f8ad91129f7591' then
    raise exception 'ABORT: prosrc-md5 % entspricht nicht dem Pre-State', v_md5;
  end if;
  if v_owner <> 'postgres' or not v_secdef or v_cfg <> 'search_path=public' then
    raise exception 'ABORT: Attribute veraendert (owner=%, secdef=%, cfg=%)', v_owner, v_secdef, v_cfg;
  end if;
  if v_acl <> '=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres' then
    raise exception 'ABORT: ACL veraendert ("%")', v_acl;
  end if;
  if v_vol <> 'v' or v_strict or v_leak or v_par <> 'u' then
    raise exception 'ABORT: Volatilitaet/Strict/Leakproof/Parallel veraendert';
  end if;
  if v_ledger <> 0 then
    raise exception 'ABORT: Ledger-Zeile 20260917155000 noch vorhanden (%)', v_ledger;
  end if;
  if v_mig5 <> 1 or v_hard <> 1 then
    raise exception 'ABORT: #5 (%) oder Hardening (%) nicht mehr intakt', v_mig5, v_hard;
  end if;

  raise notice 'ROLLBACK #6 OK: Funktion im Pre-State, ACL/Owner/SECDEF/search_path unveraendert, #5 und Hardening intakt.';
end
$verify$;

commit;
