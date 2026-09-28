-- BACKFILL profiles.account_class auf PROD vnschgjxkzzwzefqlrji — NUR nach Migration 20260929110000 und eigener Freigabe.
-- Dry-Run-Matrix read-only erstellt 28.09.2026 (~22:40). Ausschließlich explizite IDs, keine Heuristik zur Laufzeit;
-- das E-Mail-Muster dient nur als Gegenprobe (Abbruch bei Abweichung).
--   qa            11  eigene QA-Provider (barhufserviceschmid+qa-…@gmail.com)
--   test_fixture   8  Sicherheits-Testkonten Aug. 2026 (7× …@test.com, 1× security-test-…@heyhufi.com)
--   demo           6  offizielle Demo-Adressen aus src/lib/demo-accounts.ts (nur Konten mit Login)
-- NICHT enthalten (manuelle Prüfung): 39a34c62-… Kundenprofil ohne Auth-Nutzer/Rolle mit Demo-Adresse.
-- Zugang bleibt unberührt: product_entitlements-md5 wird vor/nach verglichen.
BEGIN;
CREATE TEMP TABLE _ac (id uuid PRIMARY KEY, cls public.profile_account_class, guard text) ON COMMIT DROP;
INSERT INTO _ac (id, cls, guard) VALUES
 ('cc10eaa5-6cd4-4451-8e52-2dc034e69256','qa','barhufserviceschmid+qa%@gmail.com'),
 ('229ec82f-af90-40be-9008-43a4a0a73e2b','qa','barhufserviceschmid+qa%@gmail.com'),
 ('3740367c-e528-4130-a077-fc268ace52e2','qa','barhufserviceschmid+qa%@gmail.com'),
 ('b9b6861a-b852-49ed-ae1f-62436b454f77','qa','barhufserviceschmid+qa%@gmail.com'),
 ('6f26197e-bee1-4649-87f9-7f561f846393','qa','barhufserviceschmid+qa%@gmail.com'),
 ('6584701f-b8a7-40f2-8bb6-d31b54a95b15','qa','barhufserviceschmid+qa%@gmail.com'),
 ('27288516-40e5-427c-886e-8fa6bf001697','qa','barhufserviceschmid+qa%@gmail.com'),
 ('fe8e786c-bd6b-4f99-b066-e8a62ea3c726','qa','barhufserviceschmid+qa%@gmail.com'),
 ('e77daad8-da31-49b5-a3ab-1b812ba54e29','qa','barhufserviceschmid+qa%@gmail.com'),
 ('63e95b6f-9a3a-4e53-9a38-15eac5ba3c12','qa','barhufserviceschmid+qa%@gmail.com'),
 ('3a5cd0be-6c56-4d28-987c-d58b082308d7','qa','barhufserviceschmid+qa%@gmail.com'),
 ('7dcee9ae-2b0d-42fc-9626-0104aa5d4c88','test_fixture','security-test-%@heyhufi.com'),
 ('3f25abbf-87df-48d5-99ca-81db676c4dda','test_fixture','%@test.com'),
 ('73f918a6-2140-4910-9d44-5ae419423e4a','test_fixture','%@test.com'),
 ('a81fc460-20cb-4722-a639-d90144ba5c8c','test_fixture','%@test.com'),
 ('440f32ce-ea1e-42da-ae64-53d2c4431f51','test_fixture','%@test.com'),
 ('2a4a485c-4fb0-43d1-939b-8243383ddfb0','test_fixture','%@test.com'),
 ('d5fa0de6-e83f-4326-91ee-6a1801e3ebe4','test_fixture','%@test.com'),
 ('fa04e9f1-a602-4ca5-beaf-7c275b7c1de4','test_fixture','%@test.com'),
 ('00787f97-7d74-4ff7-8316-c7801afdc47c','demo','pferdebesitzer.hufmanager@gmail.com'),
 ('ecb7497b-8c60-493e-9da0-b2bd71d3001e','demo','hufbearbeiter.hufmanager@gmail.com'),
 ('76224f11-043d-48ee-a3c8-5b18927d1ab9','demo','mitarbeiter.hufmanager@gmail.com'),
 ('774110c0-8123-40ad-8da6-78e244aa83c4','demo','partner.hufmanager@gmail.com'),
 ('09dbdd2f-c3f8-43ea-ab63-8d22857f1a57','demo','hufmanager%@gmail.com'),
 ('75b04a0c-1462-4ddb-87ef-5d979ce1bbac','demo','hufmanager%@gmail.com');

CREATE TEMP TABLE _ent_before ON COMMIT DROP AS
  SELECT md5(string_agg(to_jsonb(e)::text, '|' ORDER BY e.id)) AS m FROM public.product_entitlements e;

DO $bf$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='account_class') THEN
    RAISE EXCEPTION 'ABORT: Migration 20260929110000 fehlt';
  END IF;
  SELECT count(*) INTO n FROM _ac a JOIN public.profiles p ON p.id = a.id
   WHERE p.deleted_at IS NULL AND lower(p.email) LIKE a.guard AND p.account_class = 'real'
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = a.id);
  IF n <> 25 THEN RAISE EXCEPTION 'ABORT: Gegenprobe % statt 25 Konten (ID/Muster/Klasse/Auth weicht ab)', n; END IF;

  UPDATE public.profiles p SET account_class = a.cls FROM _ac a WHERE p.id = a.id AND p.account_class = 'real';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 25 THEN RAISE EXCEPTION 'ABORT: % statt 25 Zeilen aktualisiert', n; END IF;

  IF (SELECT md5(string_agg(to_jsonb(e)::text, '|' ORDER BY e.id)) FROM public.product_entitlements e) <> (SELECT m FROM _ent_before) THEN
    RAISE EXCEPTION 'ABORT: product_entitlements verändert';
  END IF;
END
$bf$;
COMMIT;

-- Verifikation (read-only):
-- select account_class, count(*) from profiles where deleted_at is null group by 1;
-- Rollback nur dieser Klassifizierung: update profiles set account_class='real' where id in (<25 IDs oben>);
