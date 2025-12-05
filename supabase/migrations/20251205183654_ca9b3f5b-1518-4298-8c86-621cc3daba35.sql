-- Add created_by_provider_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_by_provider_id uuid REFERENCES auth.users(id);

-- Add invited_at column to track when invitation was sent
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone;

-- Add has_logged_in column to track if user has ever logged in (false for provider-created profiles)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_logged_in boolean DEFAULT false;

-- Create index for faster queries on provider's clients
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_provider_id ON public.profiles(created_by_provider_id);

-- Add RLS policy for providers to INSERT new client profiles
CREATE POLICY "Providers can create client profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role)
);

-- Add RLS policy for providers to view profiles they created
CREATE POLICY "Providers can view created profiles"
ON public.profiles
FOR SELECT
USING (created_by_provider_id = auth.uid());

-- Add RLS policy for providers to update profiles they created
CREATE POLICY "Providers can update created profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND created_by_provider_id = auth.uid()
);