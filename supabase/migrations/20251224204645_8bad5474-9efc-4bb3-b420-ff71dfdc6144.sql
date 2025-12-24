-- Ensure existing clients with created_by_provider_id have active access_grants
INSERT INTO public.access_grants (provider_id, client_id, is_active, can_view_basic, can_view_medical, can_create_appointments)
SELECT 
  p.created_by_provider_id,
  p.id,
  true,
  true,
  true,
  true
FROM public.profiles p
WHERE p.created_by_provider_id IS NOT NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.access_grants ag 
    WHERE ag.client_id = p.id 
      AND ag.provider_id = p.created_by_provider_id
      AND ag.is_active = true
  )
ON CONFLICT DO NOTHING;