-- Fix: Assign missing access_grant for client "claudia.immesberger71@gmail.com"
-- Connect this client to the first available provider
INSERT INTO public.access_grants (provider_id, client_id, is_active, can_view_basic, can_view_medical, can_create_appointments)
SELECT 
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'provider' ORDER BY ur.id LIMIT 1),
  'f9444b1f-6cd3-45ef-b4d2-efc449b7ba0e',
  true,
  true,
  true,
  true
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = 'provider')
ON CONFLICT DO NOTHING;