-- Fix: Remove the overly permissive RLS policy on push_subscriptions
-- The service role automatically bypasses RLS, so this policy is unnecessary and dangerous

-- Drop the problematic policy that uses USING (true)
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- Verify the remaining policies are correct:
-- "Users can view own subscriptions" - allows users to see their own subscriptions
-- "Users can manage own subscriptions" - allows users to insert/update/delete their own subscriptions
-- These are sufficient for the application to work correctly