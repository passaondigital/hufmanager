-- Fix RLS Policy for profiles: Allow providers to see ALL profiles with active access grants

-- First, drop the existing policy that might be too restrictive
DROP POLICY IF EXISTS "Providers can view actively connected profiles" ON public.profiles;

-- Create a more comprehensive policy that allows providers to view:
-- 1. Their own profile
-- 2. Profiles they created (created_by_provider_id)
-- 3. Profiles connected via active access_grants
CREATE POLICY "Providers can view connected client profiles"
ON public.profiles
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Own profile
    auth.uid() = id
    -- OR Provider viewing client they created
    OR (
      has_role(auth.uid(), 'provider'::app_role)
      AND created_by_provider_id = auth.uid()
    )
    -- OR Provider viewing client connected via active access_grant
    OR (
      has_role(auth.uid(), 'provider'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.access_grants ag
        WHERE ag.client_id = profiles.id
          AND ag.provider_id = auth.uid()
          AND ag.is_active = true
      )
    )
  )
);