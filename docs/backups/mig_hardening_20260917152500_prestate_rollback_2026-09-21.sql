-- ROLLBACK / PRE-STATE Micro-Hardening
-- 20260917152500_fix_hm_normalize_email_search_path_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Verifizierter Pre-State (read-only, vor dem Apply erhoben) ──────────────
--   public._hm_normalize_email(text)
--     owner            = postgres
--     language         = sql
--     volatility       = i (IMMUTABLE)
--     prosecdef        = false (SECURITY INVOKER)
--     proconfig        = NULL          <- genau das stellt dieser Rollback her
--     proacl           = postgres=X/postgres | service_role=X/postgres
--     prosrc md5       = 4f7063e091f7c6a30525e78ce68da4ae
--     proisstrict      = false
--     proleakproof     = false
--     proparallel      = u
--   Ledger 20260917152500 = 0
--
-- Die Hardening-Migration aendert ausschliesslich pg_proc.proconfig. Der
-- Rueckweg ist deshalb exakt ein RESET plus das Entfernen der Ledger-Zeile.
-- Es gibt keine Daten zurueckzuspielen: die Migration mutiert nichts.
--
-- ── Was diese Datei bewusst NICHT anfasst ──────────────────────────────────
--   * den Body (prosrc) — er wurde nie geaendert
--   * ACL / Grants
--   * Migration #5 20260917150000 und ihre Objekte
--   * public.hm_pending_client_invites, RLS, Policies
--   * #1-#4, #6-#9
--   * Kundendaten, Ghost-Profile, auth.users, Vault, Edge Functions
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ─────────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig_hardening_20260917152500_prestate_rollback_2026-09-21.sql

begin;

-- ── Guard 1: Zielobjekt ist die erwartete Funktion ─────────────────────────
-- Der Body muss byte-genau der aus #5 sein. Weicht er ab, hat zwischenzeitlich
-- jemand die Funktion neu definiert — dann ist ein blindes RESET keine
-- Wiederherstellung mehr.
do $guard_body$
declare v_md5 text; v_secdef boolean; v_vol "char";
begin
  select md5(p.prosrc), p.prosecdef, p.provolatile
    into v_md5, v_secdef, v_vol
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = '_hm_normalize_email'
    and pg_get_function_identity_arguments(p.oid) = 'p_email text';

  if v_md5 is null then
    raise exception 'ABORT: public._hm_normalize_email(text) existiert nicht.';
  end if;

  if v_md5 <> '4f7063e091f7c6a30525e78ce68da4ae' then
    raise exception 'ABORT: prosrc-md5 % weicht vom #5-Stand ab. Erst analysieren.', v_md5;
  end if;

  if v_secdef then
    raise exception 'ABORT: Funktion ist inzwischen SECURITY DEFINER. Erst analysieren.';
  end if;

  if v_vol <> 'i' then
    raise exception 'ABORT: Volatilitaet ist nicht mehr IMMUTABLE (%). Erst analysieren.', v_vol;
  end if;
end
$guard_body$;

-- ── Guard 2: es gibt ueberhaupt etwas zurueckzunehmen ──────────────────────
do $guard_state$
declare v_cfg text;
begin
  select coalesce(array_to_string(p.proconfig, ','), 'NULL') into v_cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = '_hm_normalize_email';

  if v_cfg = 'NULL' then
    raise notice 'HINWEIS: proconfig ist bereits NULL — Hardening war nicht aktiv.';
  elsif v_cfg <> 'search_path=public' then
    raise exception
      'ABORT: proconfig ist "%" und nicht "search_path=public". Fremde Aenderung, erst analysieren.',
      v_cfg;
  end if;
end
$guard_state$;

-- ── 1. Die einzige Aenderung zuruecknehmen ─────────────────────────────────
-- RESET entfernt den search_path-Eintrag aus proconfig. War er der einzige
-- Eintrag — und das war er —, wird proconfig damit wieder NULL.
ALTER FUNCTION public._hm_normalize_email(text) RESET search_path;

-- ── 2. Genau die eine Ledger-Zeile ─────────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260917152500';

-- ── 3. Postcheck im selben Transaktionsblock ───────────────────────────────
do $verify$
declare
  v_cfg text; v_md5 text; v_acl text; v_secdef boolean; v_vol "char";
  v_ledger int; v_mig5 int;
begin
  select coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         md5(p.prosrc),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL'),
         p.prosecdef, p.provolatile
    into v_cfg, v_md5, v_acl, v_secdef, v_vol
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = '_hm_normalize_email';

  select count(*) into v_ledger
  from supabase_migrations.schema_migrations where version = '20260917152500';

  select count(*) into v_mig5
  from supabase_migrations.schema_migrations where version = '20260917150000';

  if v_cfg <> 'NULL' then
    raise exception 'ABORT: proconfig ist nach RESET immer noch "%"', v_cfg;
  end if;

  if v_md5 <> '4f7063e091f7c6a30525e78ce68da4ae' then
    raise exception 'ABORT: prosrc hat sich veraendert (%)', v_md5;
  end if;

  if v_acl <> 'postgres=X/postgres | service_role=X/postgres' then
    raise exception 'ABORT: ACL veraendert ("%")', v_acl;
  end if;

  if v_secdef or v_vol <> 'i' then
    raise exception 'ABORT: SECURITY/Volatilitaet veraendert (secdef=%, vol=%)', v_secdef, v_vol;
  end if;

  if v_ledger <> 0 then
    raise exception 'ABORT: Ledger-Zeile 20260917152500 noch vorhanden (%)', v_ledger;
  end if;

  if v_mig5 <> 1 then
    raise exception 'ABORT: Migration #5 nicht mehr intakt (erwartet 1, gefunden %)', v_mig5;
  end if;

  raise notice 'ROLLBACK Hardening OK: proconfig=NULL, Body/ACL/SECURITY unveraendert, #5 intakt.';
end
$verify$;

commit;
