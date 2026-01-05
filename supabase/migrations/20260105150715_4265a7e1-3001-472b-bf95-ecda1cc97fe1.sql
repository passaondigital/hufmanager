-- Add scheduled_at column to blog_posts for auto-publishing
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add content_type column to distinguish blog posts from videos
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'blog' CHECK (content_type IN ('blog', 'video'));

-- Add video_url column for video content
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add category for better organization
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'allgemein';

-- Create index for scheduled publishing queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled 
ON public.blog_posts (scheduled_at) 
WHERE scheduled_at IS NOT NULL AND is_published = false;

-- Create index for content type filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_content_type 
ON public.blog_posts (content_type);

-- Comment for documentation
COMMENT ON COLUMN public.blog_posts.scheduled_at IS 'When set, post will be auto-published at this timestamp';
COMMENT ON COLUMN public.blog_posts.content_type IS 'Type of content: blog or video';
COMMENT ON COLUMN public.blog_posts.video_url IS 'YouTube/Vimeo embed URL for video content';