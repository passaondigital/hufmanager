-- Create access_grant for the REAL provider (Chef Mustermann) to Lisa Marie Gerlach
INSERT INTO public.access_grants (
  provider_id,
  client_id,
  is_active,
  can_view_basic,
  can_view_medical,
  can_create_appointments
)
VALUES (
  'e3c80c81-7950-473e-9fd7-cf7a4784feb6',  -- Chef Mustermann (actual provider in auth.users)
  '40633680-a918-4c3d-80f5-16f737fce1d7',  -- Lisa Marie Gerlach
  true,
  true,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- Also create access_grants for other clients without grants to the real provider
INSERT INTO public.access_grants (provider_id, client_id, is_active, can_view_basic, can_view_medical, can_create_appointments)
SELECT 
  'e3c80c81-7950-473e-9fd7-cf7a4784feb6',  -- Real provider
  p.id,
  true,
  true,
  true,
  true
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'client'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.access_grants ag 
    WHERE ag.client_id = p.id 
      AND ag.provider_id = 'e3c80c81-7950-473e-9fd7-cf7a4784feb6'
  );