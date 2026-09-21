-- APPLY Migration #6 mit KANONISCHER Ledger-Version
-- 20260917155000_fix_invite_tenant_auto_assign_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erzeugt: 2026-09-21, lokal aus den echten Repo-Bytes (keine Abschrift).
--
-- Eigenschaften:
--   * eine einzige explizite Transaktion: DDL + Ledger-Eintrag gemeinsam atomar
--   * Migrationstext steht genau EINMAL drin: er wird von dort ausgefuehrt
--     UND von dort in statements geschrieben -> beweisbar derselbe Wert
--   * md5-Guard auf den Migrationstext, erwartet: 30ee5a9e435a53c6371adc5a482c3f3f
--   * Prestate-Guard: die Funktion muss byte-genau die aktuelle PROD-Fassung
--     sein (prosrc md5 b015f90bd1e72e9680f8ad91129f7591), SECURITY DEFINER,
--     search_path=public, Owner postgres
--   * Abhaengigkeits-Guard: der #5-Vertrag muss vorhanden sein, sonst wuerde
--     #6 die Signup-Triggerkette auf eine fehlende Funktion zeigen lassen
--   * Poststate-Guard: prosrc md5 == b6f62858b4de1b61a9a7503e1668e209,
--     und Owner/SECDEF/search_path/Volatilitaet/ACL unveraendert
--   * KEIN apply_migration -> keine serverseitig vergebene Version, kein Drift
--   * kein migration repair, kein db push, keine _prepared-Migration,
--     kein Vault-Write, kein Edge-Function-Deploy, keine ACL-Aenderung
--
-- ── Was #6 inhaltlich tut ──────────────────────────────────────────────────
-- Genau ein Statement: CREATE OR REPLACE auf
-- public.auto_assign_client_to_provider(). Gegenueber der laufenden
-- PROD-Fassung kommen 7 semantische Zeilen hinzu, 0 werden entfernt
-- (byte-genau gegen pg_proc.prosrc gediffed): die E-Mail des neuen Auth-Users
-- wird gelesen und bei aktivem Pending Invite kehrt die Funktion sofort
-- zurueck, bevor irgendein Grant entstehen kann.
--
--   NO GRANT    ist erlaubt.
--   WRONG GRANT bleibt ausgeschlossen.
--
-- ── Wichtig: #6 ist nach dem Apply INERT ───────────────────────────────────
-- hm_pending_client_invites ist leer, und der einzige moegliche Schreiber ist
-- die Edge Function, die NICHT deployt ist. Der neue Zweig ist damit vorerst
-- toter Code, das Verhalten fuer normale Signups bleibt unveraendert.
-- #6 behebt die P0-Luecke NICHT allein — dafuer braucht es #7 plus einen
-- korrekt getakteten Edge-Deploy. Die Edge Function muss bis dahin
-- undeployt bleiben.
--
-- ── Bewusst NICHT Teil dieses Applies ──────────────────────────────────────
-- Die EXECUTE-Rechte fuer PUBLIC/anon/authenticated auf dieser Funktion sind
-- ein BESTEHENDER Legacy-Befund. CREATE OR REPLACE aendert ACLs nicht; der
-- Poststate-Guard prueft das ausdruecklich. Eine Hardening-Entscheidung
-- gehoert nicht in #6 und wird hier NICHT getroffen.
--
-- Aufruf:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f docs/backups/mig6_20260917155000_apply_canonical.sql

begin;

-- ── Prestate-Guard ────────────────────────────────────────────────────────
do $prestate$
declare v_md5 text; v_secdef boolean; v_cfg text; v_owner text; v_acl text;
begin
  select md5(p.prosrc), p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         pg_get_userbyid(p.proowner),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL')
    into v_md5, v_secdef, v_cfg, v_owner, v_acl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  if v_md5 is null then
    raise exception 'ABORT: public.auto_assign_client_to_provider() existiert nicht.';
  end if;
  if v_md5 = 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception 'ABORT: #6 ist offenbar bereits angewendet (prosrc == Zielwert).';
  end if;
  if v_md5 <> 'b015f90bd1e72e9680f8ad91129f7591' then
    raise exception 'ABORT: prosrc-md5 % entspricht nicht dem erwarteten Pre-State.', v_md5;
  end if;
  if not v_secdef then
    raise exception 'ABORT: Funktion ist nicht SECURITY DEFINER.';
  end if;
  if v_cfg <> 'search_path=public' then
    raise exception 'ABORT: search_path ist "%" statt "search_path=public".', v_cfg;
  end if;
  if v_owner <> 'postgres' then
    raise exception 'ABORT: Owner ist "%" statt postgres.', v_owner;
  end if;
  if v_acl <> '=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres' then
    raise exception 'ABORT: ACL weicht vom dokumentierten Pre-State ab ("%").', v_acl;
  end if;
end
$prestate$;

-- ── Abhaengigkeits-Guard: der #5-Vertrag muss stehen ──────────────────────
do $deps$
declare v_fn int; v_tbl int; v_led int;
begin
  select count(*) into v_fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = '_hm_has_active_pending_client_invite';
  select count(*) into v_tbl from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'hm_pending_client_invites';
  select count(*) into v_led from supabase_migrations.schema_migrations
   where version = '20260917150000';

  if v_fn <> 1 or v_tbl <> 1 or v_led <> 1 then
    raise exception
      'ABORT: #5-Vertrag unvollstaendig (fn=%, tbl=%, ledger=%). #6 wuerde die Signup-Kette brechen.',
      v_fn, v_tbl, v_led;
  end if;
end
$deps$;

create temp table _mig6 (t text) on commit drop;

insert into _mig6 (t) values ($MIG6TEXT$-- FINAL ACCEPTANCE P0: Tenant-Blocker im Invite-Pfad.
--
-- ── Befund, live read-only gegen PROD vnschgjxkzzwzefqlrji verifiziert ──────
--
-- Reihenfolge beim Einladen eines Kunden
-- (supabase/functions/invite-client-with-password → auth.admin.createUser):
--
--   1. INSERT auth.users
--   2. AFTER INSERT → public.handle_new_user()
--      a) INSERT public.profiles — OHNE created_by_provider_id (die Spalte
--         steht nicht in der Spaltenliste dieser Funktion)
--         → AFTER INSERT public.auto_create_access_grant_for_client():
--           NEW.created_by_provider_id IS NULL ⇒ kein Grant. Der VORGESEHENE
--           Provider bekommt hier also nichts.
--      b) INSERT public.user_roles (role='client', aus raw_user_meta_data)
--         → AFTER INSERT public.auto_assign_client_to_provider():
--           · role = 'client'                                  ✔
--           · noch kein aktiver access_grant für den Nutzer     ✔
--           · profiles.created_by_provider_id IS NULL           ✔ (siehe 2a)
--           · kein Ghost-Profil gleicher Mail mit aktivem Grant ✔ (Neu-Mail)
--           ⇒ die Funktion wählt
--             "SELECT ur.user_id … WHERE ur.role='provider' ORDER BY ur.id
--              LIMIT 1"
--             — also den ältesten Provider-Account im GESAMTEN System — und
--             legt für ihn einen AKTIVEN Grant mit can_view_basic,
--             can_view_medical und can_create_appointments = true an.
--   3. erst danach setzt create_invited_customer_with_contact
--      created_by_provider_id auf den tatsächlich einladenden Provider.
--
-- Ergebnis ohne Fix: ein eingeladener Kunde ist ab Schritt 2b einem FREMDEN
-- Provider vollständig zugänglich (inkl. medizinischer Daten), und über
-- trg_auto_create_conversation entsteht zusätzlich eine Konversation mit
-- diesem fremden Provider. Schritt 3 räumt das nicht auf.
--
-- ── Warum nicht "hinterher aufräumen" ───────────────────────────────────────
-- Der Grant wird in Schritt 2 committed (eigene Transaktion des
-- auth.users-INSERT). Jede Korrektur in Schritt 3 liefe erst danach — das
-- Expositionsfenster bliebe real bestehen, inklusive der bereits erzeugten
-- Konversation. Der Grant darf deshalb gar nicht erst entstehen.
--
-- ── Verworfen: der app_metadata-Marker ──────────────────────────────────────
-- Eine frühere Fassung dieser Datei hat den Fallback über
-- auth.users.raw_app_meta_data->>'invited_by_provider_id' unterdrückt, gesetzt
-- von auth.admin.createUser(). Das funktioniert NICHT.
--
-- Gegen echtes GoTrue v2.196.0 auf Staging gemessen (2026-09-20): custom
-- app_metadata wird nicht im selben Statement wie der auth.users-INSERT
-- geschrieben, sondern danach. Eine Probe, die in genau diesem Trigger
-- raw_app_meta_data protokolliert hat, sah für einen mit app_metadata
-- angelegten Nutzer nur {"provider":"email","providers":["email"]} — der
-- Marker fehlte. Schritt 2b lief also weiterhin in den Fremd-Grant.
-- Gegenprobe: ein einzelnes INSERT INTO auth.users, das raw_app_meta_data
-- schon mitbringt, wurde korrekt unterdrückt. Die Logik war richtig, die
-- Annahme über den Schreibzeitpunkt nicht.
--
-- Diese Datei war zu diesem Zeitpunkt in keiner Umgebung dauerhaft in
-- Betrieb (PRODUCTION_BACKEND_CHANGED=NO), deshalb wird sie hier korrigiert,
-- statt eine weitere Migration hinterherzuschieben.
--
-- ── Gewählte Lösung: Pending-Invite-Vertrag (Variante 3) ────────────────────
-- 20260917150000_add_pending_client_invite_contract_v1.sql legt
-- public.hm_pending_client_invites an. Die Edge Function erzeugt den Invite
-- SERVERSEITIG, BEVOR sie auth.admin.createUser() aufruft.
--
-- Der Anker ist die normalisierte E-Mail: auth.users.email ist eine
-- Kernspalte und steht im selben INSERT-Statement, ist in diesem Trigger also
-- unabhängig von jedem Metadata-Timing garantiert sichtbar.
--
-- raw_user_meta_data wird bewusst NICHT als Sicherheitsquelle verwendet — die
-- ist bei einem normalen /signup vom Client frei befüllbar.
--
-- Diese Funktion liest den Vertrag NUR, um den generischen
-- "erster Provider"-Fallback zu unterdrücken. Sie erteilt daraus KEINEN
-- Zugriff und erfährt nicht einmal, welcher Provider eingeladen hat
-- (_hm_has_active_pending_client_invite liefert absichtlich nur boolean).
-- Den vorgesehenen Zugriff stellt ausschliesslich
-- create_invited_customer_with_contact her (20260917160000), das den Invite
-- gegen Provider UND gebundene user_id prüft und ihn transaktional
-- verbraucht.
--
-- Bewusst NICHT geändert:
--   · handle_new_user() bleibt unangetastet. created_by_provider_id dort zu
--     setzen hätte den Grant zwar sofort für den richtigen Provider erzeugt,
--     wäre aber mit der Ghost-Merge-Schleife derselben Funktion kollidiert:
--     die schreibt bestehende Ghost-Grants per
--     "UPDATE access_grants SET client_id = new.id" um und wäre dann in den
--     Unique-Index access_grants_client_id_provider_id_key gelaufen — der
--     häufige Fall "Provider lädt seinen bereits angelegten Ghost-Kunden ein"
--     hätte damit beim createUser abgebrochen.
--   · Der "erster Provider"-Fallback selbst bleibt für normale Signups
--     unverändert bestehen. Dieser Pass bewertet ihn nicht; er wird hier nur
--     für Adressen mit offenem Invite ausgeschaltet.
--
-- Normale Signups: ohne offenen Invite ist die neue Bedingung false, der
-- restliche Funktionskörper ist Zeichen für Zeichen der bisherige (abgeglichen
-- mit pg_proc.prosrc aus PROD). Keine Verhaltensänderung.
--
-- Anwendungsreihenfolge: 20260917150000 (Vertrag) → diese Datei → 160000.
-- Die neue Fassung von invite-client-with-password gehört dazu: sie muss den
-- Invite vor createUser anlegen, sonst greift die Unterdrückung nicht und der
-- kanonische Vertrag in 160000 schlägt hart fehl (gewollt: lautes Scheitern
-- statt stiller Fremdzuordnung).

CREATE OR REPLACE FUNCTION public.auto_assign_client_to_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_provider_id uuid;
  new_user_email text;
  invited_email text;
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

  -- NEU (Tenant-Fix, Variante 3): eingeladene Kunden bekommen ihren Provider
  -- ausschliesslich über create_invited_customer_with_contact. Der generische
  -- "erster Provider"-Fallback darf für sie nie greifen.
  --
  -- Der Vertrag hängt an auth.users.email — einer Kernspalte, die im selben
  -- INSERT-Statement steht und hier deshalb garantiert sichtbar ist. Das ist
  -- der Unterschied zum verworfenen app_metadata-Marker, den GoTrue erst nach
  -- diesem Trigger schreibt (siehe Kopfkommentar).
  --
  -- Die Tabelle ist nur über service_role / SECURITY DEFINER beschreibbar.
  -- Selbst wenn ein Invite jemals unberechtigt entstünde, wäre die einzige
  -- Wirkung, dass dieser Nutzer KEINEN automatischen Provider bekommt — nie,
  -- dass jemand Zugriff erhält.
  SELECT au.email INTO invited_email
  FROM auth.users au
  WHERE au.id = NEW.user_id;

  IF public._hm_has_active_pending_client_invite(invited_email) THEN
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
$$;
$MIG6TEXT$);

do $apply6$
declare s text; h text;
begin
  select t into s from _mig6;
  h := md5(s);
  if h <> '30ee5a9e435a53c6371adc5a482c3f3f' then
    raise exception 'ABORT: Migrationstext-md5 % weicht vom Repo-Artefakt ab', h;
  end if;
  execute s;
end
$apply6$;

-- ── Poststate-Guard: genau die gewollte Aenderung, sonst nichts ───────────
do $poststate$
declare
  v_md5 text; v_owner text; v_secdef boolean; v_cfg text; v_acl text;
  v_vol "char"; v_strict boolean; v_leak boolean; v_par "char"; v_ret text;
begin
  select md5(p.prosrc), pg_get_userbyid(p.proowner), p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), 'NULL'),
         coalesce(array_to_string(p.proacl, ' | '), 'NULL'),
         p.provolatile, p.proisstrict, p.proleakproof, p.proparallel,
         format_type(p.prorettype, NULL)
    into v_md5, v_owner, v_secdef, v_cfg, v_acl, v_vol, v_strict, v_leak, v_par, v_ret
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'auto_assign_client_to_provider';

  if v_md5 <> 'b6f62858b4de1b61a9a7503e1668e209' then
    raise exception 'ABORT: prosrc-md5 % entspricht nicht dem #6-Zielwert', v_md5;
  end if;
  if v_owner <> 'postgres' then
    raise exception 'ABORT: Owner veraendert ("%")', v_owner;
  end if;
  if not v_secdef then
    raise exception 'ABORT: SECURITY DEFINER verloren';
  end if;
  if v_cfg <> 'search_path=public' then
    raise exception 'ABORT: search_path veraendert ("%")', v_cfg;
  end if;
  if v_acl <> '=X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres' then
    raise exception 'ABORT: ACL wurde veraendert ("%") — #6 darf das nicht.', v_acl;
  end if;
  if v_vol <> 'v' or v_strict or v_leak or v_par <> 'u' or v_ret <> 'trigger' then
    raise exception 'ABORT: Signatur-/Attributdrift (vol=%, strict=%, leak=%, par=%, ret=%)',
      v_vol, v_strict, v_leak, v_par, v_ret;
  end if;
end
$poststate$;

-- ── Trigger-Bindungen duerfen unveraendert bleiben ────────────────────────
do $triggers$
declare v_cnt int;
begin
  select count(*) into v_cnt
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal and p.proname = 'auto_assign_client_to_provider'
    and t.tgenabled = 'O';
  if v_cnt <> 2 then
    raise exception 'ABORT: erwartete 2 aktive Trigger auf der Funktion, gefunden %', v_cnt;
  end if;
end
$triggers$;

insert into supabase_migrations.schema_migrations
  (version, name, statements, created_by, idempotency_key, rollback)
select '20260917155000',
       'fix_invite_tenant_auto_assign_v1',
       ARRAY[t]::text[],
       'passaondigital@gmail.com',
       NULL,
       NULL
from _mig6;

commit;
