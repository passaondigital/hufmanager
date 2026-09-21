-- PRE-STATE + ROLLBACK zu Migration #3
-- 20260917130000_add_create_invoice_with_items_for_provider_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erfasst: 2026-09-21, read-only, VOR dem Apply.
--
-- STATUS: Migration #3 wurde am 2026-09-21 per psql ueber den Session-Pooler
--         ANGEWENDET (Ledger 20260917130000, kanonisch). Siehe NACHTRAG 4.
--         Die Angaben unten sind der PRE-STATE vor dem Apply; der Rollback
--         weiter unten stellt genau diesen Zustand wieder her.
--
-- POST-STATE nach dem Apply (verifiziert):
--   Ledger-Eintraege   = 437   Kopf = 20260917130000
--   public functions   = 188   (vorher 187, exakt +1)
--   Funktion           = create_invoice_with_items_for_provider(uuid,uuid,jsonb,jsonb)
--     Body-md5         = 31ff1f228992a5b3ee2e6093ee773c45  (6853 Zeichen)
--     SECURITY DEFINER = true, search_path=public, Owner=postgres
--     ACL              = postgres=X/postgres | service_role=X/postgres
--     anon/authenticated EXECUTE = false / false
--   Nutzdaten unveraendert: invoices=11, invoice_items=12, invoice_appointments=0
--
-- Artefakt-Hashes (Repo, unveraendert seit Commit 110dffc5):
--   md5 roh     = 216b7b4827f452c4b6a51ee5a9be34d9
--   md5 ohne NL = 427b0dfbfa98b518f92eaeacc6d3b086   <- Ledger-statements-Sollwert
--   sha256 roh  = 7b15c78ab1a78904f6a18892fb33e939850ade147c3b848ed934d42cd8a24670
--   12375 B roh / 12374 B ohne NL / 12342 UTF-8-Zeichen
--
-- ============================================================
-- PRE-STATE
-- ============================================================
-- Zielfunktion public.create_invoice_with_items_for_provider(uuid,uuid,jsonb,jsonb):
--   NICHT vorhanden (0 Treffer auf proname) -> CREATE OR REPLACE kann nichts
--   ueberschreiben, keine Signaturkollision.
--
-- Benachbarte Funktionen, die #3 NICHT veraendern darf:
--   create_invoice_with_items(jsonb,jsonb)
--     body_md5 = dcc2f55383ab7a207a7ced61167e7896
--     acl      = =X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
--   _hm_has_hufmanager_access_v1(uuid)
--     body_md5 = 0ca97dd1cca9a5916814e83af62a2201
--     acl      = postgres=X/postgres | service_role=X/postgres
--   is_admin(uuid)
--     body_md5 = 70ebd959535571ea3e6188d5e9270a24
--     acl      = =X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
--
-- Globaler Pre-State:
--   public functions            = 187
--   public tables               = 292
--   Policies (pg_policy gesamt) = 835
--   Ledger-Eintraege            = 436    Kopf = 20260917125000
--   Migration #1 Body-md5       = 7bea6a4333eb55a8a9bb314fa9f586a4
--   Migration #2 Indizes        = 2 von 2 vorhanden
--   ledger_others_md5           = b6c94dd83ef0891b8131202eadd3f5c3  (n=436)
--     erhoben als: where version <> '20260917130000'
--
-- Nutzdaten (unveraendert, nur gelesen):
--   invoices = 11 | invoice_items = 12 | invoice_appointments = 0
--
-- ============================================================
-- ROLLBACK  (erst nach erfolgreichem Apply relevant)
-- ============================================================
-- #3 legt NUR eine neue Funktion an. Es wird keine bestehende Funktion,
-- Policy, Tabelle, Spalte oder Grant veraendert -> der Rollback ist ein
-- reiner DROP plus Entfernen der Ledger-Zeile.
--
-- Vorher pruefen, ob die Funktion produktiv genutzt wird:
--   die Edge Function autoflow-auto-invoice ruft sie auf. Ein Rollback muss
--   mit deren Deploy-Stand abgestimmt sein, sonst faellt Autoflow wieder aus.

begin;

drop function if exists public.create_invoice_with_items_for_provider(uuid, uuid, jsonb, jsonb);

delete from supabase_migrations.schema_migrations
 where version = '20260917130000';

commit;

-- Post-Rollback-Verifikation (Soll = PRE-STATE oben):
--   select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.proname='create_invoice_with_items_for_provider';  -- 0
--   select count(*) from supabase_migrations.schema_migrations;                        -- 436
--   select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public';                                                         -- 187
