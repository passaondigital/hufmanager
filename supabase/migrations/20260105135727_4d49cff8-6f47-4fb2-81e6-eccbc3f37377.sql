-- Fix: Remove the overly permissive "Full Access Media Assets" policy
-- that allows unrestricted access to all horse photos and videos
DROP POLICY IF EXISTS "Full Access Media Assets" ON public.media_assets;