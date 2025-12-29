-- Add new columns to reviews table for the sovereign review system

-- Add source enum column
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'App';

-- Add proof image URL for Trust-on-Demand screenshots
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS proof_image_url text;

-- Add visibility toggle (provider controls what's shown)
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add reactions JSONB for the 3-color horseshoe system
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{"green": 0, "yellow": 0, "red": 0}'::jsonb;

-- Create index on provider_id and is_visible for efficient public queries
CREATE INDEX IF NOT EXISTS idx_reviews_provider_visible 
ON public.reviews(provider_id, is_visible) 
WHERE is_visible = true;

-- Update RLS policy to allow public viewing of visible reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;

CREATE POLICY "Anyone can view visible approved reviews" 
ON public.reviews 
FOR SELECT 
USING (is_approved = true AND is_visible = true);

-- Allow anyone to update reactions (increment only via function)
-- We'll handle anti-spam in the application layer with localStorage
CREATE OR REPLACE FUNCTION public.increment_review_reaction(
  review_id uuid,
  reaction_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate reaction type
  IF reaction_type NOT IN ('green', 'yellow', 'red') THEN
    RAISE EXCEPTION 'Invalid reaction type';
  END IF;
  
  -- Increment the reaction counter
  UPDATE public.reviews
  SET reactions = jsonb_set(
    COALESCE(reactions, '{"green": 0, "yellow": 0, "red": 0}'::jsonb),
    ARRAY[reaction_type],
    to_jsonb(COALESCE((reactions->>reaction_type)::int, 0) + 1)
  )
  WHERE id = review_id
    AND is_approved = true
    AND is_visible = true;
END;
$$;