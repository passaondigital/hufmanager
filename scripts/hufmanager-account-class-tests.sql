-- HufManager — profiles.account_class (20260929110000): Sicherheits- und Neutralitätstests.
-- Aufruf (NUR lokaler Stack, Migration vorher angewendet):
--   docker exec -i supabase_db_vnschgjxkzzwzefqlrji psql -U postgres -v ON_ERROR_STOP=1 < scripts/hufmanager-account-class-tests.sql
-- Läuft in einer Transaktion und endet mit ROLLBACK.
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(t text, ok boolean, info text);
GRANT ALL ON r TO authenticated, anon;

CREATE FUNCTION pg_temp.mk_user(p_id uuid, p_email text, p_meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta,
          '{"provider":"email","providers":["email"]}', now(), now(), now());
$$;
CREATE FUNCTION pg_temp.ent_md5(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT md5(coalesce(string_agg(to_jsonb(e)::text, '|' ORDER BY e.id), '')) FROM public.product_entitlements e WHERE user_id = p_id $$;
CREATE FUNCTION pg_temp.cls(p_id uuid) RETURNS text LANGUAGE sql AS $$ SELECT account_class::text FROM public.profiles WHERE id = p_id $$;

-- Akteure
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000a1', 'ac-admin@example.test', '{"full_name":"AC Admin"}');
INSERT INTO public.user_roles(user_id, role) VALUES ('00000000-0000-4000-a0c0-0000000000a1', 'admin') ON CONFLICT DO NOTHING;
DELETE FROM public.user_roles WHERE user_id = '00000000-0000-4000-a0c0-0000000000a1' AND role <> 'admin';
-- Standard-Provider (Slim-Trial über kanonischen Pfad: signup_app im Auth-Insert + Provider-Rolle)
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000b1', 'ac-provider@example.test', '{"full_name":"AC Provider","role":"provider","signup_app":"hufmanager"}');
INSERT INTO public.user_roles(user_id, role) VALUES ('00000000-0000-4000-a0c0-0000000000b1', 'provider') ON CONFLICT DO NOTHING;

-- Default
INSERT INTO r SELECT 'D1 neues Profil: account_class = real (Default, NOT NULL)', pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1') = 'real', pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1');
INSERT INTO r SELECT 'D2 Spalte NOT NULL', (SELECT is_nullable = 'NO' FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='account_class'), NULL;
INSERT INTO r SELECT 'D3 nur 4 erlaubte Werte',
  (SELECT array_agg(enumlabel::text ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.profile_account_class'::regtype) = ARRAY['real','demo','qa','test_fixture'], NULL;
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET account_class = 'intern'::public.profile_account_class WHERE id = '00000000-0000-4000-a0c0-0000000000b1';
    INSERT INTO r VALUES ('D4 frei erfundener Wert abgelehnt', false, 'NO_ERROR');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO r VALUES ('D4 frei erfundener Wert abgelehnt', true, SQLSTATE);
  END;
END $$;

-- T20 Trial-Flow unverändert (Entitlement vor jeder account_class-Änderung)
INSERT INTO r SELECT 'T20 Standard-Provider: TRIAL_ACTIVE 14 Tage, Zugang',
  EXISTS (SELECT 1 FROM public.product_entitlements WHERE user_id = '00000000-0000-4000-a0c0-0000000000b1'
          AND status = 'TRIAL_ACTIVE' AND trial_ends_at - trial_started_at = interval '14 days')
  AND public._hm_has_hufmanager_access_v1('00000000-0000-4000-a0c0-0000000000b1'), NULL;
CREATE TEMP TABLE snap AS SELECT pg_temp.ent_md5('00000000-0000-4000-a0c0-0000000000b1') AS m;
GRANT SELECT ON snap TO authenticated;

-- T13 normaler Nutzer (eigener JWT) kann account_class nicht ändern
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a0c0-0000000000b1","role":"authenticated"}', true);
UPDATE public.profiles SET account_class = 'qa', full_name = 'AC Provider neu' WHERE id = '00000000-0000-4000-a0c0-0000000000b1';
RESET ROLE;
INSERT INTO r SELECT 'T13 Nutzer setzt eigene account_class → bleibt real, legitimes Feld (Name) geändert',
  pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1') = 'real'
  AND (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-4000-a0c0-0000000000b1') = 'AC Provider neu',
  pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1');

-- T14 Admin kann account_class ändern
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a0c0-0000000000a1","role":"authenticated"}', true);
UPDATE public.profiles SET account_class = 'qa' WHERE id = '00000000-0000-4000-a0c0-0000000000b1';
RESET ROLE;
INSERT INTO r SELECT 'T14 Admin setzt account_class = qa', pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1') = 'qa', pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1');

-- service_role / ohne JWT (admin-create-user, Backfill)
SELECT set_config('request.jwt.claims', '', true);
UPDATE public.profiles SET account_class = 'test_fixture' WHERE id = '00000000-0000-4000-a0c0-0000000000b1';
INSERT INTO r SELECT 'T14b service_role/ohne JWT setzt account_class', pg_temp.cls('00000000-0000-4000-a0c0-0000000000b1') = 'test_fixture', NULL;

-- T17 account_class ändert keinerlei product_entitlements / Zugang
INSERT INTO r SELECT 'T17 Entitlement byte-identisch nach 3 Klassenwechseln, Zugang unverändert',
  pg_temp.ent_md5('00000000-0000-4000-a0c0-0000000000b1') = (SELECT m FROM snap)
  AND public._hm_has_hufmanager_access_v1('00000000-0000-4000-a0c0-0000000000b1'), NULL;
INSERT INTO r SELECT 'T17b keine Gate-/Writer-/Trial-Funktion liest account_class',
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'
                AND p.proname IN ('_hm_has_hufmanager_access_v1','has_hufmanager_access_v1','get_hufmanager_access_context_v1',
                                  'hm_set_hufmanager_manual_access_v1','hm_start_hufmanager_slim_trial_v1',
                                  'hm_user_roles_start_slim_trial_trigger_v1','hm_project_hufmanager_entitlement_v1')
                AND pg_get_functiondef(p.oid) ILIKE '%account_class%'), NULL;

-- INSERT-Schutz: Nutzer-JWT kann beim Insert keine Sonderklasse setzen
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000c1', 'ac-insert@example.test', '{"full_name":"AC Insert"}');
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-a0c0-0000000000c1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a0c0-0000000000c1","role":"authenticated"}', true);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, account_class) VALUES ('00000000-0000-4000-a0c0-0000000000c1', 'ac-insert@example.test', 'AC Insert', 'demo');
  EXCEPTION WHEN OTHERS THEN NULL; -- RLS darf den Insert auch ganz ablehnen
  END;
END $$;
RESET ROLE;
INSERT INTO r SELECT 'T13b Insert mit Nutzer-JWT: Sonderklasse nicht übernommen',
  coalesce(pg_temp.cls('00000000-0000-4000-a0c0-0000000000c1'), 'kein_insert') IN ('real', 'kein_insert'),
  coalesce(pg_temp.cls('00000000-0000-4000-a0c0-0000000000c1'), 'kein_insert');

-- T18/T19 Grandfather-/Lifetime-Auswertung nach account_class (Setup ohne Nutzer-JWT = service_role-Pfad)
SELECT set_config('request.jwt.claims', '', true);
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000d1', 'ac-gf-real@example.test', '{"full_name":"GF Real"}');
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000d2', 'ac-gf-fixture@example.test', '{"full_name":"GF Fixture"}');
SELECT pg_temp.mk_user('00000000-0000-4000-a0c0-0000000000d3', 'ac-lt-demo@example.test', '{"full_name":"LT Demo"}');
INSERT INTO public.user_roles(user_id, role) VALUES
  ('00000000-0000-4000-a0c0-0000000000d1', 'provider'), ('00000000-0000-4000-a0c0-0000000000d2', 'provider'), ('00000000-0000-4000-a0c0-0000000000d3', 'provider')
ON CONFLICT DO NOTHING;
DELETE FROM public.product_entitlements WHERE user_id IN ('00000000-0000-4000-a0c0-0000000000d1','00000000-0000-4000-a0c0-0000000000d2','00000000-0000-4000-a0c0-0000000000d3');
INSERT INTO public.product_entitlements (user_id, product, plan, status, trial_status, billing_status, source, migration_version)
VALUES ('00000000-0000-4000-a0c0-0000000000d1', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'NONE', 'UNKNOWN_BILLING_STATE', 'LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY', 'test'),
       ('00000000-0000-4000-a0c0-0000000000d2', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'NONE', 'UNKNOWN_BILLING_STATE', 'LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY', 'test'),
       ('00000000-0000-4000-a0c0-0000000000d3', 'HUFMANAGER', 'HUFMANAGER_SLIM', 'ACTIVE', 'NONE', 'VERIFIED_PAID', 'LEGACY_BACKFILL_PROVEN_MANUAL_GRANT', 'test');
UPDATE public.profiles SET account_class = 'test_fixture' WHERE id = '00000000-0000-4000-a0c0-0000000000d2';
UPDATE public.profiles SET account_class = 'demo', plan_override = 'lifetime_grant' WHERE id = '00000000-0000-4000-a0c0-0000000000d3';
INSERT INTO r SELECT 'T18 Grandfather (real) enthält nur real-Konto, Fixture nicht',
  (SELECT array_agg(e.user_id::text) FROM public.product_entitlements e JOIN public.profiles p ON p.id = e.user_id
    WHERE e.source = 'LEGACY_BACKFILL_AMBIGUOUS_ACTIVE_ONLY' AND p.account_class = 'real'
      AND e.user_id IN ('00000000-0000-4000-a0c0-0000000000d1','00000000-0000-4000-a0c0-0000000000d2'))
  = ARRAY['00000000-0000-4000-a0c0-0000000000d1'], NULL;
INSERT INTO r SELECT 'T19 Demo-Lifetime zählt nicht als echter Lifetime-Kunde',
  NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-4000-a0c0-0000000000d3' AND plan_override = 'lifetime_grant' AND account_class = 'real'), NULL;
INSERT INTO r SELECT 'T19b Zugang der Demo-/Fixture-Konten unverändert (account_class wirkt nicht auf Access)',
  public._hm_has_hufmanager_access_v1('00000000-0000-4000-a0c0-0000000000d2') AND public._hm_has_hufmanager_access_v1('00000000-0000-4000-a0c0-0000000000d3'), NULL;

SELECT t, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, info FROM r ORDER BY t;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS summary FROM r;
ROLLBACK;
