-- Remove the overly permissive public read policy on hoof_photos
-- Proper owner-based and provider-based access policies already exist on this table
DROP POLICY IF EXISTS "Public Read Access" ON public.hoof_photos;