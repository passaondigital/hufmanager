-- P0 Shared Supabase Security Gate negative tests.
-- Intended for staging/local verification after applying the prepared migrations.
-- Do not run against production without explicit approval.
--
-- Usage pattern:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/shared-security-gate-negative-tests.sql
--
-- Dependency-free: uses plain PL/pgSQL assertions and avoids printing personal data.

BEGIN;

DO $$
DECLARE
  handle_new_user_definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO handle_new_user_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

  IF handle_new_user_definition IS NULL THEN
    RAISE EXCEPTION 'FAIL: handle_new_user is missing';
  END IF;

  IF handle_new_user_definition ~* 'requested_role[[:space:]]*=[[:space:]]*''admin'''
     OR handle_new_user_definition ~* 'requested_role[[:space:]]*IN[^;]*''admin''' THEN
    RAISE EXCEPTION 'FAIL: handle_new_user still permits admin from raw_user_meta_data';
  END IF;

  IF handle_new_user_definition NOT ILIKE '%raw_app_meta_data%role%' THEN
    RAISE EXCEPTION 'FAIL: handle_new_user has no trusted raw_app_meta_data role path';
  END IF;

  IF has_function_privilege('anon', 'public.search_horse_by_readable_id(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute search_horse_by_readable_id';
  END IF;

  -- Authenticated EXECUTE is acceptable only after the hardened function body is
  -- applied and relationship checks are present. This privilege assertion must
  -- be combined with cross-user EQID runtime tests.
  IF NOT has_function_privilege('authenticated', 'public.search_horse_by_readable_id(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot execute hardened search_horse_by_readable_id';
  END IF;

  IF has_function_privilege('anon', 'public.get_user_role(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute get_user_role';
  END IF;

  IF has_function_privilege('anon', 'public.admin_repair_user_role(uuid,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute admin_repair_user_role';
  END IF;

  IF has_function_privilege('authenticated', 'public.admin_repair_user_role(uuid,text,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can execute admin_repair_user_role';
  END IF;

  IF has_function_privilege('anon', 'public.delete_client_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_client_cascade';
  END IF;

  IF has_function_privilege('authenticated', 'public.delete_client_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can execute delete_client_cascade';
  END IF;

  IF has_function_privilege('anon', 'public.delete_provider_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_provider_cascade';
  END IF;

  IF has_function_privilege('authenticated', 'public.delete_provider_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can execute delete_provider_cascade';
  END IF;

  IF has_function_privilege('anon', 'public.delete_horse_safe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_horse_safe';
  END IF;

  IF has_function_privilege('authenticated', 'public.delete_horse_safe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can execute delete_horse_safe';
  END IF;

  IF has_function_privilege('anon', 'public.get_horse_medical_data(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute get_horse_medical_data';
  END IF;

  IF has_function_privilege('anon', 'public.get_agent_data_hub()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute get_agent_data_hub';
  END IF;

  IF has_function_privilege('anon', 'public.generate_random_id(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute generate_random_id';
  END IF;

  IF has_function_privilege('authenticated', 'public.generate_random_id(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can directly execute generate_random_id';
  END IF;

  IF has_function_privilege('authenticated', 'public.generate_profile_readable_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can directly execute generate_profile_readable_id trigger function';
  END IF;

  IF has_function_privilege('authenticated', 'public.generate_horse_readable_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can directly execute generate_horse_readable_id trigger function';
  END IF;

  IF has_function_privilege('authenticated', 'public.prevent_billing_self_update()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can directly execute prevent_billing_self_update trigger function';
  END IF;

  IF has_function_privilege('authenticated', 'public.protect_lifetime_accounts()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can directly execute protect_lifetime_accounts trigger function';
  END IF;
  IF has_function_privilege('service_role', 'public.handle_new_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role can directly execute handle_new_user trigger function';
  END IF;
  IF has_function_privilege('service_role', 'public.generate_random_id(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role can directly execute generate_random_id';
  END IF;

  -- The live admin metadata function has no argument. Test the exact
  -- signature and also reject the historical uuid overload when present.
  IF has_function_privilege('anon', 'public.get_admin_auth_metadata()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute get_admin_auth_metadata()';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_admin_auth_metadata()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot execute get_admin_auth_metadata()';
  END IF;
  IF to_regprocedure('public.get_admin_auth_metadata(uuid)') IS NOT NULL
     AND has_function_privilege('anon', 'public.get_admin_auth_metadata(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute get_admin_auth_metadata(uuid)';
  END IF;
  IF to_regprocedure('public.get_admin_auth_metadata(uuid)') IS NOT NULL
     AND has_function_privilege('authenticated', 'public.get_admin_auth_metadata(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can execute get_admin_auth_metadata(uuid)';
  END IF;

  IF has_function_privilege('anon', 'public.create_invoice_with_items(jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute create_invoice_with_items';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.create_invoice_with_items(jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot execute create_invoice_with_items';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.create_invoice_with_items(jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role cannot execute create_invoice_with_items';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.get_admin_auth_metadata()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role cannot execute get_admin_auth_metadata()';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'product_memberships'
      AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'FAIL: product_memberships RLS is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_memberships_user_product_unique'
  ) THEN
    RAISE EXCEPTION 'FAIL: product_memberships UNIQUE(user_id, product) constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_profiles_readable_id_change'
  ) THEN
    RAISE EXCEPTION 'FAIL: profiles readable_id immutability trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_horses_readable_id_change'
  ) THEN
    RAISE EXCEPTION 'FAIL: horses readable_id immutability trigger is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'Public Access',
        'Public can view horse photos',
        'Authenticated users can view horse photos',
        'Authenticated users can read hoof photos',
        'Authenticated users can read documents',
        'Authenticated select global'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: broad/public storage SELECT policy still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'hoof_photos_relationship_select'
  ) THEN
    RAISE EXCEPTION 'FAIL: hoof_photos relationship SELECT policy missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'horse_photos_owner_select'
  ) THEN
    RAISE EXCEPTION 'FAIL: horse-photos owner SELECT policy missing';
  END IF;
END $$;

ROLLBACK;
