
-- STEP 1: Create a NEW correct profile for barhufserviceschmid with the REAL auth.uid
-- First, copy the data from the wrong profile
INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
SELECT 
  '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',  -- REAL auth.uid
  email,
  full_name,
  phone,
  created_at,
  now()
FROM public.profiles 
WHERE id = 'b466041c-94bd-47d5-98d2-dc22bde3af57'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- STEP 2: Delete the orphaned/wrong profile
DELETE FROM public.profiles WHERE id = 'b466041c-94bd-47d5-98d2-dc22bde3af57';

-- STEP 3: Ensure provider role exists for the REAL user
INSERT INTO public.user_roles (user_id, role)
VALUES ('99e50f7f-c2d1-4ce4-ba99-d7dc800e5090', 'provider')
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 4: Clean up duplicate Lisa profile (keep one)
DELETE FROM public.profiles WHERE id = '8e200b64-e972-423f-af6e-1033f83cf15d';

-- STEP 5: Assign Lisa to the REAL provider
UPDATE public.profiles 
SET created_by_provider_id = '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090'
WHERE id = '40633680-a918-4c3d-80f5-16f737fce1d7';

-- STEP 6: Create access grant for Lisa
INSERT INTO public.access_grants (provider_id, client_id, is_active, can_view_basic, can_view_medical, can_create_appointments)
VALUES ('99e50f7f-c2d1-4ce4-ba99-d7dc800e5090', '40633680-a918-4c3d-80f5-16f737fce1d7', true, true, true, true)
ON CONFLICT DO NOTHING;
