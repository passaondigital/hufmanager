-- Add tags column to email_subscribers for segmentation
ALTER TABLE public.email_subscribers 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for tag queries
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tags ON public.email_subscribers USING gin(tags);