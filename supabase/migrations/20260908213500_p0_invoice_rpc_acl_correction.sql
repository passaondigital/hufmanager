-- P0 staging-verified correction: CREATE OR REPLACE preserves pre-existing
-- function ACLs, so explicitly remove legacy PUBLIC/anon execution after the
-- invoice body hardening and retain only the required callers.

REVOKE EXECUTE ON FUNCTION public.create_invoice_with_items(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(jsonb, jsonb)
  TO authenticated, service_role;
