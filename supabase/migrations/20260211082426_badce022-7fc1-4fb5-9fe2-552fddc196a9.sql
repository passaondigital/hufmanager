
-- Drop the overly permissive public offers SELECT policy
-- Landing page uses get_public_offers() SECURITY DEFINER function which bypasses RLS
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.offers;
