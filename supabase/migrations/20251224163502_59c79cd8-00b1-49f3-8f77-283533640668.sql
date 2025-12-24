-- Allow clients to create their own access grants (to connect with providers)
DROP POLICY IF EXISTS "Clients can create access grants" ON public.access_grants;
CREATE POLICY "Clients can create access grants"
ON public.access_grants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id 
  AND has_role(auth.uid(), 'client'::app_role)
);

-- Allow clients to update their own access grants (e.g., reactivate)
DROP POLICY IF EXISTS "Clients can update own access grants" ON public.access_grants;
CREATE POLICY "Clients can update own access grants"
ON public.access_grants
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Create function to auto-assign client to first provider if no connection exists
CREATE OR REPLACE FUNCTION public.auto_assign_client_to_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_provider_id uuid;
BEGIN
  -- Only run for client role assignments
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  -- Check if client already has an access grant
  IF EXISTS (
    SELECT 1 FROM public.access_grants 
    WHERE client_id = NEW.user_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if client was created by a provider (already handled by another trigger)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id AND created_by_provider_id IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  -- Find first available provider
  SELECT user_id INTO first_provider_id
  FROM public.user_roles
  WHERE role = 'provider'
  ORDER BY id
  LIMIT 1;

  -- If a provider exists, create access grant
  IF first_provider_id IS NOT NULL THEN
    INSERT INTO public.access_grants (
      provider_id,
      client_id,
      is_active,
      can_view_basic,
      can_view_medical,
      can_create_appointments
    )
    VALUES (
      first_provider_id,
      NEW.user_id,
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

-- Create trigger to auto-assign clients to providers on signup
DROP TRIGGER IF EXISTS on_client_role_created ON public.user_roles;
CREATE TRIGGER on_client_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_client_to_provider();
