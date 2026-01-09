-- Fix: Remove overly permissive "Public profiles are viewable by everyone" policy
-- This exposed all customer personal data (names, emails, phones, addresses) to anyone

-- Step 1: Drop ALL existing SELECT policies on profiles table to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can view connected clients" ON public.profiles;
DROP POLICY IF EXISTS "Clients can view connected provider profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create proper role-based SELECT policies

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Providers can view clients they created or have active access grants with
CREATE POLICY "Providers can view connected clients"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'provider'::app_role) AND (
    -- Provider created this client
    created_by_provider_id = auth.uid() 
    OR
    -- Provider has active access grant with this client
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = profiles.id
        AND ag.provider_id = auth.uid()
        AND COALESCE(ag.is_active, true) = true
    )
  )
);

-- Clients can view their connected provider's profile
CREATE POLICY "Clients can view connected provider profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.access_grants ag
    WHERE ag.client_id = auth.uid()
      AND ag.provider_id = profiles.id
      AND COALESCE(ag.is_active, true) = true
  )
);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));