\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE ghost_customer_test_results (
  test_no integer PRIMARY KEY,
  test_name text NOT NULL,
  passed boolean NOT NULL,
  actual text NOT NULL
) ON COMMIT DROP;

GRANT ALL ON TABLE ghost_customer_test_results TO authenticated;

INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  street,
  zip_code,
  city,
  created_by_provider_id,
  onboarding_completed,
  has_logged_in
)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'ghost-repair@hufi-lab.invalid',
  'HUFI-LAB Ghost Repair',
  '0000-TEST',
  'HUFI-LAB Weg 1',
  '00000',
  'HUFI-LAB Ort',
  '00000000-0000-4000-8000-000000000011',
  false,
  false
);

INSERT INTO ghost_customer_test_results
SELECT 1, 'Provider A creates ghost customer', count(*) = 1, 'profiles=' || count(*)
FROM public.profiles
WHERE id = '10000000-0000-4000-8000-000000000001'
  AND deleted_at IS NULL;

INSERT INTO ghost_customer_test_results
SELECT 2, 'Ghost customer has no auth identity', count(*) = 0, 'auth_users=' || count(*)
FROM auth.users
WHERE id = '10000000-0000-4000-8000-000000000001';

INSERT INTO ghost_customer_test_results
SELECT 3, 'Ghost customer has no fake client role', count(*) = 0, 'roles=' || count(*)
FROM public.user_roles
WHERE user_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO ghost_customer_test_results
SELECT 4, 'Ghost customer has no premature access grant', count(*) = 0, 'grants=' || count(*)
FROM public.access_grants
WHERE client_id = '10000000-0000-4000-8000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000012","role":"authenticated"}',
  true
);

INSERT INTO ghost_customer_test_results
SELECT 5, 'Provider B cannot read Provider A ghost customer', count(*) = 0, 'visible_profiles=' || count(*)
FROM public.profiles
WHERE id = '10000000-0000-4000-8000-000000000001';

RESET ROLE;

INSERT INTO public.horses (id, owner_id, name, breed, birth_year, app_source)
VALUES (
  '10000000-0000-4000-8000-000000000101',
  '10000000-0000-4000-8000-000000000001',
  'HUFI-LAB Ghost Horse',
  'Testpferd',
  2018,
  'hufmanager'
);

INSERT INTO ghost_customer_test_results
SELECT 6, 'Ghost customer owns horse', count(*) = 1, 'horses=' || count(*)
FROM public.horses
WHERE id = '10000000-0000-4000-8000-000000000101'
  AND owner_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO public.appointments (
  id,
  horse_id,
  provider_id,
  client_id,
  date,
  time,
  status,
  service_type,
  price
)
VALUES (
  '10000000-0000-4000-8000-000000000201',
  '10000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000001',
  current_date,
  '09:30',
  'planned',
  'HUFI-LAB Testleistung',
  75
);

INSERT INTO ghost_customer_test_results
SELECT 7, 'Ghost customer owns appointment', count(*) = 1, 'appointments=' || count(*)
FROM public.appointments
WHERE id = '10000000-0000-4000-8000-000000000201'
  AND client_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO public.invoices (
  id,
  invoice_number,
  client_id,
  horse_id,
  provider_id,
  total_amount,
  status
)
VALUES (
  '10000000-0000-4000-8000-000000000301',
  'HUFI-LAB-GHOST-001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000011',
  75,
  'draft'
);

INSERT INTO ghost_customer_test_results
SELECT 8, 'Ghost customer owns invoice', count(*) = 1, 'invoices=' || count(*)
FROM public.invoices
WHERE id = '10000000-0000-4000-8000-000000000301'
  AND client_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ghost-repair@hufi-lab.invalid',
  crypt('HUFI-LAB-PASSWORD', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"client","full_name":"HUFI-LAB Ghost Repair"}',
  now(),
  now()
);

INSERT INTO ghost_customer_test_results
SELECT
  9,
  'Ghost data moves to authenticated identity without duplication',
  (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000001')
    AND (SELECT count(*) = 1 FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002' AND deleted_at IS NULL)
    AND (SELECT count(*) = 1 FROM public.horses WHERE id = '10000000-0000-4000-8000-000000000101' AND owner_id = '10000000-0000-4000-8000-000000000002')
    AND (SELECT count(*) = 1 FROM public.appointments WHERE id = '10000000-0000-4000-8000-000000000201' AND client_id = '10000000-0000-4000-8000-000000000002')
    AND (SELECT count(*) = 1 FROM public.invoices WHERE id = '10000000-0000-4000-8000-000000000301' AND client_id = '10000000-0000-4000-8000-000000000002'),
  'profile/horse/appointment/invoice relationship preservation';

INSERT INTO ghost_customer_test_results
SELECT
  10,
  'Authenticated customer receives client role and provider relationship',
  (SELECT count(*) = 1 FROM public.user_roles WHERE user_id = '10000000-0000-4000-8000-000000000002' AND role = 'client')
    AND (SELECT count(*) = 1 FROM public.access_grants WHERE client_id = '10000000-0000-4000-8000-000000000002' AND provider_id = '00000000-0000-4000-8000-000000000011' AND is_active)
    AND (SELECT count(*) = 1 FROM public.product_memberships WHERE user_id = '10000000-0000-4000-8000-000000000002' AND product = 'HUFMANAGER' AND status = 'ACTIVE'),
  'client_role_active_provider_grant_and_hufmanager_membership';

DELETE FROM public.user_roles
WHERE user_id = '10000000-0000-4000-8000-000000000002'
  AND role = 'client';

INSERT INTO public.user_roles (user_id, role)
VALUES ('10000000-0000-4000-8000-000000000002', 'client');

INSERT INTO ghost_customer_test_results
SELECT 11, 'Repeated link remains idempotent', count(*) = 1, 'grants=' || count(*)
FROM public.access_grants
WHERE client_id = '10000000-0000-4000-8000-000000000002'
  AND provider_id = '00000000-0000-4000-8000-000000000011';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

INSERT INTO ghost_customer_test_results
SELECT 12, 'Authenticated customer cannot read another tenant horse', count(*) = 0, 'visible_horses=' || count(*)
FROM public.horses
WHERE owner_id = '00000000-0000-4000-8000-000000000022';

RESET ROLE;

INSERT INTO ghost_customer_test_results
SELECT
  13,
  'Existing authenticated clients retain their grants',
  count(*) >= 1,
  'customer_a_active_grants=' || count(*)
FROM public.access_grants
WHERE client_id = '00000000-0000-4000-8000-000000000021'
  AND is_active;

TABLE ghost_customer_test_results;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ghost_customer_test_results WHERE NOT passed) THEN
    RAISE EXCEPTION 'Ghost customer access grant regression suite failed';
  END IF;
END;
$$;

ROLLBACK;
