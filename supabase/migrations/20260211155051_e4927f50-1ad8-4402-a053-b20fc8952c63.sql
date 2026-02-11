
-- Create a secure RPC for public feedbacks (similar to get_public_reviews)
CREATE OR REPLACE FUNCTION public.get_public_feedbacks(provider_id_input uuid)
RETURNS TABLE(id uuid, customer_name text, rating integer, text text, is_featured boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.customer_name,
    f.rating,
    f.text,
    f.is_featured
  FROM feedbacks f
  WHERE f.provider_id = provider_id_input
    AND f.is_featured = true
  ORDER BY f.created_at DESC
  LIMIT 20;
END;
$$;
