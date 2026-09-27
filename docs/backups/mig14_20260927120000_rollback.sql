-- Rollback für 20260927120000_add_appointment_relation_guard_v1
-- Entfernt nur Trigger + Funktion. Keine Datenänderung (Migration ändert keine Zeilen).
-- Ledger-Eintrag nur entfernen, wenn er beim Apply gesetzt wurde.
BEGIN;
DROP TRIGGER IF EXISTS trg_hm_guard_appointment_relations_v1 ON public.appointments;
DROP FUNCTION IF EXISTS public.hm_guard_appointment_relations_v1();
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260927120000';
COMMIT;
