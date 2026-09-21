-- APPLY Micro-Hardening mit KANONISCHER Ledger-Version
-- 20260917152500_fix_hm_normalize_email_search_path_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, lokal aus den echten Repo-Bytes (keine Abschrift).
--
-- Zweck: schliesst den in NACHTRAG 8 dokumentierten Restbefund
--   function_search_path_mutable -> public._hm_normalize_email(text)
-- zwischen Migration #5 (20260917150000) und #6 (20260917155000).
--
-- Eigenschaften:
--   * eine einzige explizite Transaktion: DDL + Ledger-Eintrag gemeinsam atomar
--   * Migrationstext steht genau EINMAL drin: er wird von dort ausgefuehrt
--     UND von dort in statements geschrieben -> beweisbar derselbe Wert
--   * md5-Guard bricht vor jedem Commit ab, falls der Text abweicht
--     erwartet: 948bd6454f4ac125eb0ca576850e93b4
--   * zusaetzlicher Prestate-Guard: die Zielfunktion muss byte-genau die aus
--     #5 sein (prosrc-md5) und darf noch keinen search_path tragen
--   * KEIN apply_migration -> keine serverseitig vergebene Version, kein Drift
--   * kein migration repair, kein db push, keine _prepared-Migration,
--     kein Vault-Write, kein Edge-Function-Deploy
--   * exakt EIN semantisch wirksames Statement: ALTER FUNCTION ... SET search_path
--     -> nur pg_proc.proconfig. Body, ACL, Owner, Volatilitaet, SECURITY INVOKER
--        bleiben unberuehrt; prosrc-md5 vor und nach dem Apply identisch.
--
-- Bewusst NICHT Teil dieses Applies: Migration #6-#9, Edge-Function-Deploy,
-- Vault, RLS/Policies (insbesondere bleibt hm_pending_client_invites bei
-- RLS ohne Policy — beabsichtigter Default-Deny aus #5).
--
-- Aufruf:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f docs/backups/mig_hardening_20260917152500_apply_canonical.sql

begin;

-- ── Prestate-Guard: richtige Funktion, noch ungehaertet ────────────────────
do $prestate$
declare v_md5 text; v_cfg text; v_secdef boolean;
begin
  select md5(p.prosrc),
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         p.prosecdef
    into v_md5, v_cfg, v_secdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = '_hm_normalize_email'
    and pg_get_function_identity_arguments(p.oid) = 'p_email text';

  if v_md5 is null then
    raise exception 'ABORT: public._hm_normalize_email(text) existiert nicht — ist #5 angewendet?';
  end if;
  if v_md5 <> '4f7063e091f7c6a30525e78ce68da4ae' then
    raise exception 'ABORT: prosrc-md5 % weicht vom #5-Stand ab.', v_md5;
  end if;
  if v_secdef then
    raise exception 'ABORT: Funktion ist SECURITY DEFINER — unerwartet.';
  end if;
  if v_cfg <> 'NULL' then
    raise exception 'ABORT: proconfig ist bereits "%" — nichts zu haerten.', v_cfg;
  end if;
end
$prestate$;

create temp table _hard (t text) on commit drop;

insert into _hard (t) values ($HARDTEXT$-- Micro-Hardening zwischen Migration #5 (20260917150000) und #6 (20260917155000).
--
-- ── Befund ──────────────────────────────────────────────────────────────────
-- Der Supabase Security Advisor meldet nach #5 neu:
--
--   function_search_path_mutable  ->  public._hm_normalize_email(text)
--
-- #5 hat auf ihren fuenf SECURITY-DEFINER-Funktionen konsequent
-- SET search_path = public gesetzt, auf diesem einen SECURITY-INVOKER-Helper
-- aber nicht. Damit ist _hm_normalize_email die einzige von 195 Routinen in
-- public ohne festen search_path — die einzige Abweichung von einer sonst
-- vollstaendig durchgehaltenen Projektkonvention.
--
-- ── Ist der Befund echt? ────────────────────────────────────────────────────
-- Ja. Gegen eine isolierte Testinstanz gemessen (nicht Production):
--
--   search_path = public                 ->  korrekt normalisiert
--   search_path = evil, public           ->  korrekt normalisiert (unveraendert)
--   search_path = evil, pg_catalog, public -> shadowendes evil.lower() greift
--
-- pg_catalog wird implizit zuerst durchsucht, solange es nicht ausdruecklich
-- HINTER einem fremden Schema einsortiert wird. Genau dieser Sonderfall laesst
-- lower()/btrim() ueberschreiben. coalesce()/nullif() sind SQL-Konstrukte und
-- grundsaetzlich nicht shadowbar.
--
-- ── Warum er trotzdem nicht ausnutzbar war ──────────────────────────────────
-- Ein Angriff braucht drei Dinge gleichzeitig: ein eigenes Schema mit
-- shadowenden Funktionen, Kontrolle ueber search_path, und EXECUTE auf diese
-- Funktion. Read-only gegen Production geprueft:
--
--   anon / authenticated / authenticator : kein CREATE, kein EXECUTE
--   service_role                         : EXECUTE ja, CREATE nein
--   postgres                             : beides — kann die Funktion aber
--                                          ohnehin direkt umschreiben
--
-- Zudem ist die Funktion SECURITY INVOKER: selbst bei manipulierter Aufloesung
-- entstuende kein Rechtegewinn. Der Befund war deshalb in NACHTRAG 8 als
-- REAL_BUT_NOT_EXPLOITABLE_DOCUMENTED_RESIDUAL eingestuft und hat #5 nicht
-- blockiert. Er wird hier geschlossen, weil ein dauerhaft offener Restbefund
-- die Konvention aufweicht, an der spaetere Reviews sich orientieren.
--
-- ── Warum search_path = public und nicht pg_catalog, public ─────────────────
-- Sobald der search_path fest am Objekt haengt, kann ein Aufrufer ueberhaupt
-- kein fremdes Schema mehr davorschieben — der oben gezeigte Angriffspfad
-- existiert dann nicht mehr. pg_catalog bleibt implizit an erster Stelle.
-- 'public' ist damit ebenso sicher wie 'pg_catalog, public' und identisch zu
-- dem, was die fuenf SECURITY-DEFINER-Funktionen aus #5 und die uebrigen
-- Routinen dieses Projekts verwenden. Konsistenz schlaegt hier Sonderweg.
--
-- ── Warum ALTER FUNCTION und nicht CREATE OR REPLACE ────────────────────────
-- ALTER FUNCTION ... SET aendert ausschliesslich pg_proc.proconfig. Body
-- (prosrc), Sprache, Volatilitaet, Rueckgabetyp, Strictness, Owner und ACL
-- bleiben nachweislich unberuehrt — prosrc-md5 vor und nach der Migration ist
-- identisch. CREATE OR REPLACE wuerde den Body neu schreiben und diesen
-- Beweis unnoetig aufgeben.
--
-- Diese Migration ist idempotent: ein zweiter Lauf setzt denselben Wert.
--
-- ── Bewusst NICHT Teil dieser Migration ─────────────────────────────────────
--   * keine Body-/Semantikaenderung
--   * keine Grant-/ACL-Aenderung
--   * keine RLS-Aenderung — insbesondere bleibt
--     public.hm_pending_client_invites bei RLS ohne Policy: das ist der
--     beabsichtigte Default-Deny-Vertrag aus #5, kein Defekt
--   * keine Tabellen-, Index- oder Constraint-Aenderung
--   * keine Datenmutation
--   * keine Trigger- oder Policy-Aenderung
--   * nichts aus #6-#9, kein Edge-Function-Deploy, kein Vault-Zugriff

ALTER FUNCTION public._hm_normalize_email(text) SET search_path = public;
$HARDTEXT$);

do $applyhard$
declare s text; h text;
begin
  select t into s from _hard;
  h := md5(s);
  if h <> '948bd6454f4ac125eb0ca576850e93b4' then
    raise exception 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', h;
  end if;
  execute s;
end
$applyhard$;

-- ── Poststate-Guard: genau die gewuenschte Aenderung, sonst nichts ─────────
do $poststate$
declare v_md5 text; v_cfg text; v_acl text; v_secdef boolean; v_vol "char";
begin
  select md5(p.prosrc),
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL'),
         p.prosecdef, p.provolatile
    into v_md5, v_cfg, v_acl, v_secdef, v_vol
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = '_hm_normalize_email';

  if v_cfg <> 'search_path=public' then
    raise exception 'ABORT: proconfig ist "%" statt "search_path=public"', v_cfg;
  end if;
  if v_md5 <> '4f7063e091f7c6a30525e78ce68da4ae' then
    raise exception 'ABORT: Body hat sich veraendert (%) — ALTER haette das nicht tun duerfen', v_md5;
  end if;
  if v_acl <> 'postgres=X/postgres | service_role=X/postgres' then
    raise exception 'ABORT: ACL veraendert ("%")', v_acl;
  end if;
  if v_secdef or v_vol <> 'i' then
    raise exception 'ABORT: SECURITY/Volatilitaet veraendert (secdef=%, vol=%)', v_secdef, v_vol;
  end if;
end
$poststate$;

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
select '20260917152500',
       'fix_hm_normalize_email_search_path_v1',
       ARRAY[t]::text[],
       'passaondigital@gmail.com',
       NULL,
       NULL
from _hard;

commit;
