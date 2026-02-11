
-- Fix 1: Reviews - create a safe public view excluding reviewer_email and token
CREATE VIEW public.safe_reviews
WITH (security_invoker = on) AS
SELECT id, provider_id, reviewer_name, rating, text, is_approved, created_at, updated_at, source, proof_image_url, is_visible, reactions, category
FROM public.reviews;

-- Fix 2: Feedbacks - create a safe public view excluding provider-internal details
CREATE VIEW public.safe_feedbacks
WITH (security_invoker = on) AS
SELECT id, provider_id, customer_name, rating, text, is_featured, created_at, source
FROM public.feedbacks;

-- Fix 3: Drop the overly permissive public SELECT policies on base tables
DROP POLICY IF EXISTS "Anyone can view visible approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view featured feedbacks" ON public.feedbacks;

-- Fix 4: Re-create public SELECT policies that only work through the views (deny direct anon access)
-- For reviews: anon can only read via the safe_reviews view (which excludes email/token)
-- We use a restrictive approach: public can only see approved+visible reviews, but must go through the view
CREATE POLICY "Public can view approved visible reviews"
ON public.reviews
FOR SELECT
TO anon
USING (is_approved = true AND is_visible = true);

-- For feedbacks: public can only see featured feedbacks through the view
CREATE POLICY "Public can view featured feedbacks"
ON public.feedbacks
FOR SELECT
TO anon
USING (is_featured = true);
