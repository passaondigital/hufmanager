-- Fix: Update access_grant to connect vollblutcoach@gmail.com to the correct provider barhufserviceschmid@gmail.com
UPDATE public.access_grants
SET provider_id = '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
    updated_at = now()
WHERE client_id = '65e576ae-eb36-4f5b-84b1-60d192679892'
  AND provider_id = 'e3c80c81-7950-473e-9fd7-cf7a4784feb6';

-- Also update the profile's created_by_provider_id if needed
UPDATE public.profiles
SET created_by_provider_id = '99e50f7f-c2d1-4ce4-ba99-d7dc800e5090',
    updated_at = now()
WHERE id = '65e576ae-eb36-4f5b-84b1-60d192679892'
  AND (created_by_provider_id IS NULL OR created_by_provider_id = 'e3c80c81-7950-473e-9fd7-cf7a4784feb6');