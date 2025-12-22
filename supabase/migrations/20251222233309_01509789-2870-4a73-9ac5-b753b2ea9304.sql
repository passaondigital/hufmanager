-- Add client_intake_status to business_settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS client_intake_status text DEFAULT 'open' CHECK (client_intake_status IN ('open', 'waitlist', 'closed'));

-- Add gallery_images JSONB array to business_settings for simple image gallery
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;

-- Create reviews table for public testimonials
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,
  is_approved boolean DEFAULT false,
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.reviews
FOR SELECT
USING (is_approved = true);

-- Anyone can insert reviews (via token link)
CREATE POLICY "Anyone can submit reviews"
ON public.reviews
FOR INSERT
WITH CHECK (true);

-- Providers can manage their own reviews
CREATE POLICY "Providers can view own reviews"
ON public.reviews
FOR SELECT
USING (provider_id = auth.uid());

CREATE POLICY "Providers can update own reviews"
ON public.reviews
FOR UPDATE
USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete own reviews"
ON public.reviews
FOR DELETE
USING (provider_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();