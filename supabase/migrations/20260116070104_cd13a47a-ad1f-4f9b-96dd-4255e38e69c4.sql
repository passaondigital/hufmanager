-- First drop the existing function (with original signature)
DROP FUNCTION IF EXISTS public.increment_review_reaction(uuid, text);

-- Create review_reactions tracking table for rate limiting
CREATE TABLE IF NOT EXISTS public.review_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('green', 'yellow', 'red')),
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint to prevent duplicate reactions from same fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS review_reactions_unique_per_fingerprint 
ON public.review_reactions(review_id, fingerprint, reaction_type);

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS review_reactions_rate_limit_idx 
ON public.review_reactions(fingerprint, created_at);

-- Enable RLS on the tracking table
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

-- Allow inserts for tracking
CREATE POLICY "Allow insert for tracking" ON public.review_reactions
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow read for authenticated users only
CREATE POLICY "Allow read for authenticated" ON public.review_reactions
FOR SELECT TO authenticated
USING (true);

-- Create the new rate-limited version of the function
CREATE OR REPLACE FUNCTION public.increment_review_reaction(
  p_review_id uuid,
  p_reaction_type text,
  p_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_fingerprint text;
  v_recent_count int;
  v_already_reacted boolean;
BEGIN
  -- Validate reaction type
  IF p_reaction_type NOT IN ('green', 'yellow', 'red') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reaction type');
  END IF;
  
  -- Validate review exists and is visible
  IF NOT EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE id = p_review_id 
    AND is_approved = true 
    AND is_visible = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review not found or not visible');
  END IF;
  
  -- Use provided fingerprint or fallback to IP-based identifier
  v_fingerprint := COALESCE(
    p_fingerprint, 
    COALESCE(
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'x-real-ip',
      'unknown-' || gen_random_uuid()::text
    )
  );
  
  -- Validate fingerprint is not empty or too short
  IF v_fingerprint IS NULL OR char_length(v_fingerprint) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid fingerprint');
  END IF;
  
  -- Check if already reacted to this review with this reaction type
  SELECT EXISTS (
    SELECT 1 FROM public.review_reactions rr
    WHERE rr.review_id = p_review_id
    AND rr.fingerprint = v_fingerprint
    AND rr.reaction_type = p_reaction_type
  ) INTO v_already_reacted;
  
  IF v_already_reacted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reacted');
  END IF;
  
  -- Rate limiting: max 10 reactions per hour per fingerprint
  SELECT COUNT(*) INTO v_recent_count
  FROM public.review_reactions rr
  WHERE rr.fingerprint = v_fingerprint
  AND rr.created_at > NOW() - INTERVAL '1 hour';
  
  IF v_recent_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
  END IF;
  
  -- Record the reaction for tracking
  INSERT INTO public.review_reactions (review_id, fingerprint, reaction_type)
  VALUES (p_review_id, v_fingerprint, p_reaction_type)
  ON CONFLICT (review_id, fingerprint, reaction_type) DO NOTHING;
  
  -- Increment the reaction counter
  UPDATE public.reviews
  SET reactions = jsonb_set(
    COALESCE(reactions, '{"green": 0, "yellow": 0, "red": 0}'::jsonb),
    ARRAY[p_reaction_type],
    to_jsonb(COALESCE((reactions->>p_reaction_type)::int, 0) + 1)
  )
  WHERE id = p_review_id
    AND is_approved = true
    AND is_visible = true;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reacted');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'An error occurred');
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.increment_review_reaction(uuid, text, text) IS 'Rate-limited review reaction function with server-side anti-spam protection.';