-- ROLLBACK / PRE-STATE Migration #5
-- 20260917150000_add_pending_client_invite_contract_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, VOR dem Apply.
--
-- ── Warum diese Datei deterministisch sein kann ─────────────────────────────
-- Migration #5 ist reines DDL: 24 Statements, 0 DML. Sie legt ausschliesslich
-- NEUE Objekte an und veraendert keine einzige bestehende Zeile. Der
-- Pre-State aller #5-Objekte wurde vor dem Apply read-only als NICHT VORHANDEN
-- verifiziert:
--
--   public.hm_pending_client_invites                      -> 0 (Tabelle)
--   hm_pending_client_invites_*                           -> 0 (Indizes)
--   public._hm_normalize_email(text)                      -> 0
--   public._hm_expire_pending_client_invites(text)        -> 0
--   public._hm_has_active_pending_client_invite(text)     -> 0
--   public.create_pending_client_invite_v1(...)           -> 0
--   public.bind_pending_client_invite_v1(...)             -> 0
--   public.invalidate_pending_client_invite_v1(...)       -> 0
--   Ledger 20260917150000                                 -> 0
--
-- Der Rueckweg ist damit exakt: dieselben Objekte wieder entfernen. Es gibt
-- KEINE Datensicherung zurueckzuspielen, weil keine Bestandsdaten angefasst
-- wurden (MIG5_EXISTING_DATA_MUTATED=NO, MIG5_DATA_ROLLBACK_LOSSLESS=YES).
--
-- ── Was diese Datei bewusst NICHT anfasst ───────────────────────────────────
--   * Migration #1 20260917120000, #2 20260917125000,
--     #3 20260917130000, #4 20260917140000 und deren Objekte
--   * bestehende Kundendaten, Profile, Contacts, Access Grants
--   * die 39 Ghost-Profile und die 4 Duplikat-E-Mail-Gruppen
--   * auth.users / GoTrue
--   * Pferde, Termine, Rechnungen, Dokumente
--   * Supabase Vault, Secrets, Edge Functions
--   * den historischen Ledger (kein Masseneingriff, nur die eine #5-Zeile)
--   * public.auto_assign_client_to_provider() und public.handle_new_user()
--     — die werden erst von #6/#8 angefasst, nicht von #5
--
-- ── Aufruf (bewusst NICHT automatisch ausgefuehrt) ──────────────────────────
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f docs/backups/mig5_20260917150000_prestate_rollback_2026-09-21.sql

begin;

-- ── Guard 1: Kette darf nicht ueber #5 hinaus angewendet sein ───────────────
-- #6-#9 bauen auf dem #5-Vertrag auf (#8 ruft z.B.
-- _hm_has_active_pending_client_invite()). #5 allein zurueckzudrehen, waehrend
-- eine spaetere Migration der Kette bereits drin ist, wuerde die Produktion
-- kaputtmachen statt sie wiederherzustellen.
do $guard_chain$
declare v_later text;
begin
  select string_agg(version, ', ' order by version) into v_later
  from supabase_migrations.schema_migrations
  where version in ('20260917155000','20260917160000','20260920120000','20260920190000');

  if v_later is not null then
    raise exception
      'ABORT: spaetere Migrationen der Invite-Kette sind angewendet (%). #5 darf nicht isoliert zurueckgerollt werden.',
      v_later;
  end if;
end
$guard_chain$;

-- ── Guard 2: keine fremde Abhaengigkeit auf die #5-Funktionen ───────────────
-- Falls ausserhalb von #5 bereits Code auf diese Funktionen verweist, wuerde
-- ein Drop diesen Code brechen. Dann erst analysieren, nicht droppen.
do $guard_deps$
declare v_refs text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_refs
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname not in (
      '_hm_normalize_email',
      '_hm_expire_pending_client_invites',
      '_hm_has_active_pending_client_invite',
      'create_pending_client_invite_v1',
      'bind_pending_client_invite_v1',
      'invalidate_pending_client_invite_v1'
    )
    and (p.prosrc like '%_hm_has_active_pending_client_invite%'
      or p.prosrc like '%hm_pending_client_invites%'
      or p.prosrc like '%_hm_expire_pending_client_invites%');

  if v_refs is not null then
    raise exception
      'ABORT: fremde Funktionen referenzieren den #5-Vertrag (%). Erst analysieren.',
      v_refs;
  end if;
end
$guard_deps$;

-- ── Guard 3: der Vertrag darf nicht bereits produktiv benutzt worden sein ───
-- Solange #6-#9 nicht angewendet und die zugehoerige Edge Function nicht
-- deployt ist, schreibt niemand in diese Tabelle: sie muss leer sein. Ist sie
-- es nicht, ist der Invite-Flow bereits gelaufen — dann ist ein blindes DROP
-- kein Rollback mehr, sondern Datenverlust.
do $guard_rows$
declare v_rows bigint;
begin
  if to_regclass('public.hm_pending_client_invites') is not null then
    execute 'select count(*) from public.hm_pending_client_invites' into v_rows;
    if v_rows > 0 then
      raise exception
        'ABORT: hm_pending_client_invites enthaelt % Zeile(n). Der Invite-Vertrag wurde bereits benutzt — vor dem Drop bewerten.',
        v_rows;
    end if;
  end if;
end
$guard_rows$;

-- ── 1. Nur die sechs Funktionen aus #5 ──────────────────────────────────────
-- Exakte Signaturen, damit keine gleichnamige Fremdfunktion mitgerissen wird.
-- Kein CASCADE: haengt etwas dran, soll der Drop scheitern, nicht aufraeumen.
DROP FUNCTION IF EXISTS public.invalidate_pending_client_invite_v1(uuid, uuid, text, boolean);
DROP FUNCTION IF EXISTS public.bind_pending_client_invite_v1(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_pending_client_invite_v1(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public._hm_has_active_pending_client_invite(text);
DROP FUNCTION IF EXISTS public._hm_expire_pending_client_invites(text);
DROP FUNCTION IF EXISTS public._hm_normalize_email(text);

-- ── 2. Nur die Tabelle aus #5 ───────────────────────────────────────────────
-- Mit der Tabelle verschwinden genau ihre eigenen Objekte:
--   Indizes      hm_pending_client_invites_pkey,
--                hm_pending_client_invites_active_email_uniq,
--                hm_pending_client_invites_provider_request_uniq,
--                hm_pending_client_invites_expires_idx,
--                hm_pending_client_invites_user_idx
--   Constraints  hm_pending_client_invites_email_normalized,
--                hm_pending_client_invites_ttl,
--                hm_pending_client_invites_consumed_needs_user,
--                hm_pending_client_invites_provider_id_fkey
--   RLS-Flag + der TABLE-COMMENT
-- public.profiles bleibt unberuehrt: die FK-Richtung zeigt VON dieser Tabelle
-- AUF profiles, nicht umgekehrt.
-- Kein CASCADE, bewusst.
DROP TABLE IF EXISTS public.hm_pending_client_invites;

-- ── 3. Grants ───────────────────────────────────────────────────────────────
-- #5 hat nur Rechte AUF den eigenen neuen Objekten vergeben bzw. entzogen
-- (REVOKE gegen PUBLIC/anon/authenticated, GRANT EXECUTE an service_role).
-- Mit DROP FUNCTION und DROP TABLE verschwinden diese ACL-Eintraege
-- vollstaendig. Es gibt keinen Grant auf einem FREMDEN Objekt
-- zurueckzunehmen — deshalb steht hier bewusst kein REVOKE.

-- ── 4. Genau die eine Ledger-Zeile ──────────────────────────────────────────
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260917150000';

-- ── 5. Postcheck im selben Transaktionsblock ────────────────────────────────
do $verify$
declare
  v_tbl int; v_fns int; v_idx int; v_ledger int; v_prev int;
begin
  select count(*) into v_tbl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'hm_pending_client_invites';

  select count(*) into v_fns
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      '_hm_normalize_email','_hm_expire_pending_client_invites',
      '_hm_has_active_pending_client_invite','create_pending_client_invite_v1',
      'bind_pending_client_invite_v1','invalidate_pending_client_invite_v1');

  select count(*) into v_idx
  from pg_indexes
  where schemaname = 'public' and indexname like 'hm_pending_client_invites%';

  select count(*) into v_ledger
  from supabase_migrations.schema_migrations where version = '20260917150000';

  -- #1-#4 muessen weiterhin genau einmal dastehen.
  select count(*) into v_prev
  from supabase_migrations.schema_migrations
  where version in ('20260917120000','20260917125000','20260917130000','20260917140000');

  if v_tbl <> 0 or v_fns <> 0 or v_idx <> 0 or v_ledger <> 0 then
    raise exception 'ABORT: Rollback unvollstaendig (tbl=%, fns=%, idx=%, ledger=%)',
      v_tbl, v_fns, v_idx, v_ledger;
  end if;

  if v_prev <> 4 then
    raise exception 'ABORT: Migrationen #1-#4 nicht mehr intakt (erwartet 4, gefunden %)', v_prev;
  end if;

  raise notice 'ROLLBACK #5 OK: Pre-State wiederhergestellt, #1-#4 unveraendert.';
end
$verify$;

commit;
