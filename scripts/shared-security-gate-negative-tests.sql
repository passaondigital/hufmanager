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
BEGIN
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

  IF has_function_privilege('anon', 'public.delete_client_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_client_cascade';
  END IF;

  IF has_function_privilege('anon', 'public.delete_provider_cascade(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_provider_cascade';
  END IF;

  IF has_function_privilege('anon', 'public.delete_horse_safe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute delete_horse_safe';
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
