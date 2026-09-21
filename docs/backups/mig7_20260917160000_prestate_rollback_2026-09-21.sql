-- ROLLBACK / PRE-STATE Migration #7
-- 20260917160000_add_create_invited_customer_with_contact_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Warum der Rueckweg trivial ist ──────────────────────────────────────────
-- #7 besteht aus drei Statements: CREATE OR REPLACE FUNCTION auf einer
-- Funktion, die es in Production NOCH NICHT GIBT, plus REVOKE und GRANT auf
-- eben dieser neuen Funktion. 0 DML, 0 betroffene Bestandszeilen.
--
-- Read-only vor dem Apply verifiziert:
--   public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb) -> 0
--   Ledger 20260917160000                                                 -> 0
--
-- Es gibt also KEINE alte Funktionsdefinition zu sichern und KEINE Daten
-- zurueckzuspielen. Der Rueckweg ist: das neue Objekt wieder entfernen und die
-- Ledger-Zeile loeschen. MIG7_DATA_ROLLBACK_LOSSLESS=YES.
--
-- ── Signatur ───────────────────────────────────────────────────────────────
-- #7, #8 und #9 definieren dieselbe Signatur (uuid, uuid, jsonb, jsonb).
-- Ein DROP mit genau dieser Signatur ist eindeutig; eine Ueberladung existiert
-- weder im Repo noch in Production.
--
-- ── Was diese Datei bewusst NICHT anfasst ──────────────────────────────────
--   * #5 20260917150000 (Pending-Invite-Vertrag) und seine sechs Funktionen
--   * das search_path-Hardening 20260917152500
--   * #6 20260917155000 / public.auto_assign_client_to_provider()
--   * #1-#4, #8, #9
--   * public.hm_pending_client_invites, RLS, Policies, Grants
--   * handle_new_user, auto_create_access_grant_for_client, alle Trigger
--   * Kundendaten, die 39 Ghost-Profile, die 4 Duplikat-Gruppen
--   * auth.users, Pferde, Termine, Rechnungen, Dokumente, Vault, Edge Functions
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ─────────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig7_20260917160000_prestate_rollback_2026-09-21.sql

begin;

-- ── Guard 1: #8/#9 duerfen nicht angewendet sein ───────────────────────────
-- Beide definieren DIESELBE Funktion neu. Waere eines von beiden angewendet,
-- wuerde dieses DROP nicht die #7-Fassung entfernen, sondern die spaetere —
-- also genau die Korrektur, die den Cross-Provider-Ghost-Schutz traegt.
do $guard_chain$
declare v_later text;
begin
  select string_agg(version, ', ' order by version) into v_later
  from supabase_migrations.schema_migrations
  where version in ('20260920120000','20260920190000');

  if v_later is not null then
    raise exception
      'ABORT: spaetere Migrationen der Invite-Kette sind angewendet (%). #7 darf nicht isoliert zurueckgerollt werden.',
      v_later;
  end if;
end
$guard_chain$;

-- ── Guard 2: es ist wirklich die #7-Fassung ────────────────────────────────
do $guard_state$
declare v_md5 text;
begin
  select md5(p.prosrc) into v_md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_invited_customer_with_contact'
    and pg_get_function_identity_arguments(p.oid) = 'p_provider_id uuid, p_user_id uuid, p_profile jsonb, p_contact jsonb';

  if v_md5 is null then
    raise notice 'HINWEIS: Funktion existiert nicht — #7 war nicht aktiv.';
  elsif v_md5 <> '0be8f9ca939c9e84d4d59352338d8c62' then
    raise exception
      'ABORT: prosrc-md5 % ist nicht die #7-Fassung. Fremde Aenderung, erst analysieren.',
      v_md5;
  end if;
end
$guard_state$;

-- ── Guard 3: niemand benutzt den Vertrag bereits produktiv ─────────────────
-- Solange die neue Edge Function nicht deployt ist, wird diese Funktion nie
-- aufgerufen und kein Invite verbraucht. Gibt es verbrauchte Invites, ist der
-- Flow bereits gelaufen — dann ist ein blindes DROP kein Rollback mehr.
do $guard_used$
declare v_consumed bigint;
begin
  select count(*) into v_consumed
  from public.hm_pending_client_invites
  where consumed_at is not null;

  if v_consumed > 0 then
    raise exception
      'ABORT: % verbrauchte(r) Invite(s) vorhanden — der kanonische Vertrag lief bereits. Vor dem Drop bewerten.',
      v_consumed;
  end if;
end
$guard_used$;

-- ── 1. Nur das eine neue Objekt aus #7 ─────────────────────────────────────
-- Exakte Signatur. Kein CASCADE: haengt etwas dran, soll der Drop scheitern.
-- Mit der Funktion verschwinden auch ihre ACL-Eintraege (REVOKE/GRANT aus #7).
DROP FUNCTION IF EXISTS public.create_invited_customer_with_contact(uuid, uuid, jsonb, jsonb);

-- ── 2. Genau die eine Ledger-Zeile ─────────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260917160000';

-- ── 3. Postcheck im selben Transaktionsblock ───────────────────────────────
do $verify$
declare
  v_fn int; v_ledger int; v_m5 int; v_hard int; v_m6 int;
  v_m6_md5 text; v_contract int; v_rows bigint;
begin
  select count(*) into v_fn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_invited_customer_with_contact';

  select count(*) into v_ledger from supabase_migrations.schema_migrations where version = '20260917160000';
  select count(*) into v_m5     from supabase_migrations.schema_migrations where version = '20260917150000';
  select count(*) into v_hard   from supabase_migrations.schema_migrations where version = '20260917152500';
  select count(*) into v_m6     from supabase_migrations.schema_migrations where version = '20260917155000';

  select md5(p.prosrc) into v_m6_md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  select count(*) into v_contract
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'hm_pending_client_invites';

  select count(*) into v_rows from public.hm_pending_client_invites;

  if v_fn <> 0 then
    raise exception 'ABORT: Funktion noch vorhanden (%)', v_fn;
  end if;
  if v_ledger <> 0 then
    raise exception 'ABORT: Ledger-Zeile 20260917160000 noch vorhanden (%)', v_ledger;
  end if;
  if v_m5 <> 1 or v_hard <> 1 or v_m6 <> 1 then
    raise exception 'ABORT: #5 (%), Hardening (%) oder #6 (%) nicht mehr intakt', v_m5, v_hard, v_m6;
  end if;
  if v_m6_md5 <> 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception 'ABORT: #6-Funktion veraendert (%)', v_m6_md5;
  end if;
  if v_contract <> 1 then
    raise exception 'ABORT: #5-Vertragstabelle fehlt';
  end if;
  if v_rows <> 0 then
    raise exception 'ABORT: hm_pending_client_invites enthaelt % Zeile(n)', v_rows;
  end if;

  raise notice 'ROLLBACK #7 OK: Funktion entfernt, #5/Hardening/#6 intakt, Vertrag unveraendert.';
end
$verify$;

commit;
