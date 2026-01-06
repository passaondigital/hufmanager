-- Add category column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN category text DEFAULT NULL;

-- Add reviews_layout column to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN reviews_layout text DEFAULT 'grid';

-- Add comment for documentation
COMMENT ON COLUMN public.reviews.category IS 'Review category: Barhuf, Klebebeschlag, Hufbeschlag, Beratung, Services';
COMMENT ON COLUMN public.business_settings.reviews_layout IS 'Display layout for reviews section: grid, carousel, marquee';