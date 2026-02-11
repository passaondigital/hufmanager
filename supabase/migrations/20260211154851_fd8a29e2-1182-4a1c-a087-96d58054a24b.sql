
-- Remove anon direct access to reviews base table entirely
-- Public access should go through get_public_reviews() RPC which excludes email/token
DROP POLICY IF EXISTS "Public can view approved visible reviews" ON public.reviews;

-- Remove anon direct access to feedbacks base table entirely  
-- Public access should go through safe_feedbacks view
DROP POLICY IF EXISTS "Public can view featured feedbacks" ON public.feedbacks;
