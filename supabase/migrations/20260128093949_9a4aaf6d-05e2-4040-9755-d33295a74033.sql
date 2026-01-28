-- Demo Activity Tracking for Mission Control Analytics
-- Tracks page views, actions, and CopeCart link clicks from demo accounts

-- Table to track demo account activity
CREATE TABLE public.demo_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'page_view', 'action', 'copecart_click'
  page_path TEXT,
  action_name TEXT,
  copecart_plan TEXT, -- 'starter', 'advanced', 'pro'
  copecart_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_demo_activity_user ON demo_activity_logs(user_email);
CREATE INDEX idx_demo_activity_type ON demo_activity_logs(activity_type);
CREATE INDEX idx_demo_activity_created ON demo_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.demo_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read demo activity
CREATE POLICY "Admins can view demo activity"
  ON public.demo_activity_logs
  FOR SELECT
  USING (public.is_master_admin());

-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can log demo activity"
  ON public.demo_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.demo_activity_logs IS 'Tracks demo account activity for conversion analytics in Mission Control';