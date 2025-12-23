-- 1. Create access_grant to link provider with Lisa Marie Gerlach
-- access_grants FK references profiles, not auth.users, so this should work
INSERT INTO public.access_grants (
  provider_id,
  client_id,
  is_active,
  can_view_basic,
  can_view_medical,
  can_create_appointments
)
VALUES (
  'b466041c-94bd-47d5-98d2-dc22bde3af57',  -- Provider (barhufserviceschmid@gmail.com) in profiles
  '40633680-a918-4c3d-80f5-16f737fce1d7',  -- Lisa Marie Gerlach (self-registered, has horses)
  true,
  true,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- 2. Soft-delete the duplicate empty profile
UPDATE public.profiles 
SET deleted_at = now()
WHERE id = '8e200b64-e972-423f-af6e-1033f83cf15d';

-- 3. Create trigger to auto-create access_grant when provider creates a client
CREATE OR REPLACE FUNCTION public.auto_create_access_grant_for_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create access_grant if a provider created this profile
  IF NEW.created_by_provider_id IS NOT NULL THEN
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      is_active,
      can_view_basic,
      can_view_medical,
      can_create_appointments
    )
    VALUES (
      NEW.created_by_provider_id,
      NEW.id,
      true,
      true,
      true,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_auto_access_grant ON public.profiles;
CREATE TRIGGER trigger_auto_access_grant
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_access_grant_for_client();

-- 4. Backfill: Create access_grants for all existing clients created by providers
-- Only for clients whose provider exists in profiles
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
  AND EXISTS (SELECT 1 FROM public.profiles pp WHERE pp.id = p.created_by_provider_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.access_grants ag 
    WHERE ag.client_id = p.id 
      AND ag.provider_id = p.created_by_provider_id
  );