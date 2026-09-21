-- PRE-STATE + ROLLBACK zu Migration #2
-- 20260917125000_add_autoflow_invoice_appointment_idempotency_v1
-- Projekt: vnschgjxkzzwzefqlrji (HufManager PROD)
-- Erfasst: 2026-09-21, read-only, VOR dem Apply.
--
-- Artefakt-Hashes (Repo, unveraendert seit Commit 110dffc5):
--   md5 roh        = a6bdadce689b8f382a42bcbc7010ec28
--   md5 ohne NL    = f1c006ac7ec2b3eb923277977a35927b   <- Ledger-statements-Sollwert
--   sha256 roh     = 35ccbf3dd0c80127c723ca080c9c5fab3be4088248df75b8499971dfd02245c9
--   Bytes 3510 roh / 3509 ohne NL / 3464 UTF-8-Zeichen
--
-- ============================================================
-- PRE-STATE public.invoice_appointments
-- ============================================================
-- Zeilen: 0   distinct appointment_id: 0
-- RLS: enabled   Policies: 3   User-Trigger: 0
--
-- Spalten (6, KEINE Spalte "source"):
--   1 id             uuid                     NOT NULL  default gen_random_uuid()
--   2 invoice_id     uuid                     NOT NULL
--   3 appointment_id uuid                     NOT NULL
--   4 line_description text                   NULL
--   5 line_amount    numeric                  NULL
--   6 created_at     timestamptz              NOT NULL  default now()
--
-- Indizes (3, KEINE der beiden neuen Namen vorhanden):
--   CREATE INDEX idx_invoice_appointments_invoice ON public.invoice_appointments USING btree (invoice_id)
--   CREATE UNIQUE INDEX invoice_appointments_invoice_id_appointment_id_key ON public.invoice_appointments USING btree (invoice_id, appointment_id)
--   CREATE UNIQUE INDEX invoice_appointments_pkey ON public.invoice_appointments USING btree (id)
--
-- Constraints (4):
--   invoice_appointments_pkey                            p  PRIMARY KEY (id)
--   invoice_appointments_invoice_id_appointment_id_key   u  UNIQUE (invoice_id, appointment_id)
--   invoice_appointments_invoice_id_fkey                 f  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
--   invoice_appointments_appointment_id_fkey             f  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
--
-- Table-ACL: postgres=arwdDxtm/postgres | anon=arwdDxtm/postgres | authenticated=arwdDxtm/postgres | service_role=arwdDxtm/postgres
--   acl_md5 = caf3992086c391320d592320f5b4a787
--
-- Policies (3, alle ueber invoices.provider_id = auth.uid()):
--   "Users can view their invoice appointments"   SELECT  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_appointments.invoice_id AND i.provider_id = auth.uid()))
--   "Users can insert invoice appointments"       INSERT  WITH CHECK (dito)
--   "Users can delete invoice appointments"       DELETE  USING (dito)
--   (kein UPDATE-Policy vorhanden)
--
-- ============================================================
-- PRE-STATE global
-- ============================================================
--   public functions            = 187
--   public tables               = 292
--   Policies (pg_policy gesamt) = 835
--   Ledger-Eintraege            = 435    Kopf = 20260917120000
--   Migration #1 Body-md5       = 7bea6a4333eb55a8a9bb314fa9f586a4
--   ledger_others_md5           = c8e82d6ccda1b07740bb6b94e63b3b13  (n=435)
--     erhoben als: where version <> '20260917125000'  -- nach dem Apply identisch erwartet
--
-- ============================================================
-- ROLLBACK
-- ============================================================
-- Nur gefahrlos, solange KEINE Zeile source IS NOT NULL traegt.
-- Vorher pruefen:
--   select count(*) from public.invoice_appointments where source is not null;
-- Ergibt das > 0, ist der Rollback ein DATENVERLUST und erfordert eine
-- eigene Entscheidung.

begin;

-- 1) Indizes aus #2 entfernen
drop index if exists public.idx_invoice_appointments_autoflow_unique;
drop index if exists public.idx_invoice_appointments_appointment;

-- 2) Spalte aus #2 entfernen (entfernt implizit auch den COMMENT)
alter table public.invoice_appointments
  drop column if exists source;

-- 3) Ledger-Eintrag aus #2 entfernen
delete from supabase_migrations.schema_migrations
 where version = '20260917125000';

commit;

-- Post-Rollback-Verifikation (Soll = PRE-STATE oben):
--   select count(*) from information_schema.columns
--    where table_schema='public' and table_name='invoice_appointments';        -- 6
--   select count(*) from pg_indexes
--    where schemaname='public' and tablename='invoice_appointments';           -- 3
--   select count(*) from supabase_migrations.schema_migrations;                -- 435
