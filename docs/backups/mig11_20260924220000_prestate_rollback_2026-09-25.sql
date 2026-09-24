-- Rollback für 20260924220000_scope_services_read_and_foreign_service_guard_v1
-- Stellt den Prod-Zustand vom 25.09.2026 vor dem Apply exakt wieder her
-- (Policy-Text 1:1 aus pg_policy gelesen; Trigger/Funktion existierten vorher nicht).
-- Datenzeilen werden durch die Migration nicht verändert -> kein Daten-Rollback nötig.
BEGIN;
DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.appointments;
DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.service_price_overrides;
DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.autoflow_settings;
DROP TRIGGER IF EXISTS trg_hm_guard_service_owner_v1 ON public.payment_products;
DROP FUNCTION IF EXISTS public.hm_guard_service_owner_v1();
DROP POLICY IF EXISTS "Scoped users can view active services" ON public.services;
CREATE POLICY "Authenticated users can view active services" ON public.services
  FOR SELECT
  USING ((auth.uid() IS NOT NULL) AND (is_active = true));
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260924220000';
COMMIT;
