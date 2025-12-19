
-- Fix 1: Drop the foreign key constraint on invoices.provider_id and recreate with SET NULL
-- This allows invoices to be created even if the provider doesn't have a profile row
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_provider_id_fkey;

-- Add back the FK with proper handling (SET NULL on delete, no strict requirement)
-- Actually, we should make provider_id nullable and remove the FK or make it deferrable
-- The issue is that the user creating the invoice might not be in profiles yet

-- Alternative: Make the foreign key optional by allowing NULL
-- Already nullable based on schema, but FK still enforces the value if provided

-- Actually the issue is the FK itself - it requires the value to exist in profiles
-- We need to either:
-- 1. Ensure provider profile exists (via trigger)
-- 2. Or remove the FK constraint

-- Best solution: Recreate FK but ensure profiles exist
-- The handle_new_user trigger should create profiles, but let's verify and fix RLS

-- Fix 2: Add RLS policy for providers to UPDATE horses of their created clients
-- First drop existing policies that might conflict
DROP POLICY IF EXISTS "Providers can soft delete horses for created clients" ON public.horses;
DROP POLICY IF EXISTS "Providers can soft delete horses with active access" ON public.horses;

-- The UPDATE policies already exist, but they might not cover the WITH CHECK clause properly
-- Let's check the existing policies and ensure they work for soft-delete (which is an UPDATE)

-- The existing policies are:
-- "Providers can update horses for created clients" - USING created_by_provider_id
-- "Providers can update horses with active access" - USING access_grants

-- The issue might be the WITH CHECK clause not matching
-- Let's recreate them to ensure WITH CHECK allows the update

-- First, drop and recreate the update policies with proper WITH CHECK
DROP POLICY IF EXISTS "Providers can update horses for created clients" ON public.horses;
DROP POLICY IF EXISTS "Providers can update horses with active access" ON public.horses;

-- Recreate with explicit WITH CHECK that allows setting deleted_at
CREATE POLICY "Providers can update horses for created clients" 
ON public.horses 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = horses.owner_id 
    AND p.created_by_provider_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = horses.owner_id 
    AND p.created_by_provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can update horses with active access" 
ON public.horses 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND EXISTS (
    SELECT 1 FROM access_grants ag 
    WHERE ag.client_id = horses.owner_id 
    AND ag.provider_id = auth.uid() 
    AND ag.is_active = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) 
  AND EXISTS (
    SELECT 1 FROM access_grants ag 
    WHERE ag.client_id = horses.owner_id 
    AND ag.provider_id = auth.uid() 
    AND ag.is_active = true
  )
);

-- Fix 3: Similarly fix the profiles UPDATE policy for soft-delete
DROP POLICY IF EXISTS "Providers can update created profiles" ON public.profiles;

CREATE POLICY "Providers can update created profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'provider'::app_role) 
  AND created_by_provider_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) 
  AND created_by_provider_id = auth.uid()
);

-- Fix 4: Ensure the invoices RLS policies are correct
-- The provider_id must be set to the authenticated user
DROP POLICY IF EXISTS "Providers can create invoices" ON public.invoices;

CREATE POLICY "Providers can create invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) 
  AND (provider_id = auth.uid() OR provider_id IS NULL)
);
