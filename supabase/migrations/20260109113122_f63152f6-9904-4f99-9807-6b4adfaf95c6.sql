-- Fix: Remove ALL overly permissive policies and consolidate SELECT policies

-- Step 1: Drop the remaining "Public profiles" policy that allows public access
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

-- Step 2: Drop duplicate/redundant SELECT policies to clean up
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can view connected client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Providers can view created profiles" ON public.profiles;

-- The remaining policies are correct:
-- "Users can view own profile" - users can view their own
-- "Providers can view connected clients" - providers can view their clients
-- "Clients can view connected provider profiles" - clients can view their provider
-- "Admins can view all profiles" - admins full access
-- "Master admin can view all profiles" - master admin full access