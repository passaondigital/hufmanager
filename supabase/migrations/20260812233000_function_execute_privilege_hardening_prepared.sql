-- P0 SHARED SUPABASE SECURITY GATE
-- Prepared only. Do not apply to production before backup, dry run, and impact approval.
--
-- Goal:
-- - Close default PUBLIC/anon EXECUTE exposure for SECURITY DEFINER functions.
-- - Keep body-level authorization as the real security boundary.
-- - Avoid mass revokes without explicit function classification.
--
-- Live read-only finding 2026-08-13:
-- - SECURITY DEFINER total: 153
-- - anon executable: 148
-- - authenticated executable: 151
-- - neither anon nor authenticated executable: 2
--
-- Impact audit:
-- - search_horse_by_readable_id is used by src/components/network/ConnectionSearch.tsx.
-- - delete_client_cascade and delete_horse_safe are used by CustomerDetailModal.tsx
--   and have live-confirmed internal auth.uid/relationship checks.
-- - generate_random_id has no frontend/edge call; only generator/admin-repair SQL use.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  -- Internal trigger/helper functions: should not be directly callable through RPC.
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.generate_random_id(text)'),
    to_regprocedure('public.generate_profile_readable_id()'),
    to_regprocedure('public.generate_horse_readable_id()'),
    to_regprocedure('public.generate_contact_readable_id()'),
    to_regprocedure('public.prevent_billing_self_update()'),
    to_regprocedure('public.protect_lifetime_accounts()'),
    to_regprocedure('public.handle_new_user()')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    END IF;
  END LOOP;

  -- Admin/delete functions: callable only by signed-in users after body-level admin/owner checks.
  -- These remain risky until the live body definitions are verified.
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.admin_repair_user_role(uuid,text,uuid,text)'),
    to_regprocedure('public.delete_client_cascade(uuid)'),
    to_regprocedure('public.delete_provider_cascade(uuid)'),
    to_regprocedure('public.delete_horse_safe(uuid)'),
    to_regprocedure('public.get_admin_auth_metadata(uuid)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;

  -- Authenticated-only business/medical/relationship functions.
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.get_horse_medical_data(uuid)'),
    to_regprocedure('public.get_provider_clients(uuid)'),
    to_regprocedure('public.get_partner_shared_data(text)'),
    to_regprocedure('public.get_agent_data_hub()'),
    to_regprocedure('public.has_role(uuid,app_role)'),
    to_regprocedure('public.get_user_role(uuid)'),
    to_regprocedure('public.is_admin(uuid)'),
    to_regprocedure('public.is_master_admin()'),
    to_regprocedure('public.use_hufi_credit(uuid,text)'),
    to_regprocedure('public.consume_hufi_voice_credit(uuid,numeric,text)'),
    to_regprocedure('public.ensure_hufi_voice_credits_current(uuid)'),
    to_regprocedure('public.get_product_membership_context()'),
    to_regprocedure('public.select_product_membership(text)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;

  -- High-risk readable-id horse search: prepared to remove broad authenticated RPC enumeration.
  -- Application callers must use RLS-scoped queries or the hardened body from the next prepared migration.
  fn := to_regprocedure('public.search_horse_by_readable_id(text)');
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END IF;

  -- Profile readable-id search remains a controlled discovery endpoint, but never anonymous for KID.
  fn := to_regprocedure('public.search_profile_by_readable_id(text)');
  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END IF;
END $$;

-- Broader prepared INTERNAL_ONLY hardening.
--
-- This intentionally uses local/source classification prefixes instead of
-- applying a blind revoke to every SECURITY DEFINER function. These functions
-- are trigger/helper style and should not remain direct /rpc endpoints unless
-- a live caller proves necessity during staging.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND (
        p.proname LIKE 'handle_%'
        OR p.proname LIKE 'notify_%'
        OR p.proname LIKE 'validate_%'
        OR p.proname LIKE 'generate_%'
        OR p.proname LIKE 'prevent_%'
        OR p.proname LIKE 'protect_%'
        OR p.proname LIKE 'log_%'
        OR p.proname LIKE 'auto_%'
        OR p.proname LIKE 'autoflow_%'
        OR p.proname LIKE 'calculate_%'
        OR p.proname LIKE 'set_%'
        OR p.proname LIKE 'update_%'
        OR p.proname LIKE 'sync_%'
        OR p.proname LIKE 'touch_%'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END LOOP;
END $$;
