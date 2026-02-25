
-- Fix Nina Hartmann: Assign client role to real auth user
INSERT INTO public.user_roles (user_id, role)
VALUES ('1739f9bd-dad2-4b78-bab7-c51d6b6c22c9', 'client'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Move access_grant from ghost profile to real auth user
UPDATE public.access_grants
SET client_id = '1739f9bd-dad2-4b78-bab7-c51d6b6c22c9',
    updated_at = now()
WHERE client_id = '58fa6fc4-8089-4cd8-bb76-29eda57c55f6'
  AND provider_id = '715f653b-20df-4977-a56f-a17961083cb5';

-- Move any horses from ghost profile to real profile
UPDATE public.horses
SET owner_id = '1739f9bd-dad2-4b78-bab7-c51d6b6c22c9'
WHERE owner_id = '58fa6fc4-8089-4cd8-bb76-29eda57c55f6'
  AND deleted_at IS NULL;

-- Move any appointments from ghost to real
UPDATE public.appointments
SET client_id = '1739f9bd-dad2-4b78-bab7-c51d6b6c22c9'
WHERE client_id = '58fa6fc4-8089-4cd8-bb76-29eda57c55f6';

-- Soft-delete the ghost profile to avoid future confusion
UPDATE public.profiles
SET deleted_at = now()
WHERE id = '58fa6fc4-8089-4cd8-bb76-29eda57c55f6';
