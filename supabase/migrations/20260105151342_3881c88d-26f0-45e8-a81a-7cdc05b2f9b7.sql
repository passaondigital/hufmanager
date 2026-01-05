-- Create admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT, -- 'provider', 'client', 'blog_post', etc.
  target_id UUID,
  target_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_admin_activity_log_admin_id ON public.admin_activity_log (admin_id);
CREATE INDEX idx_admin_activity_log_action_type ON public.admin_activity_log (action_type);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert logs
CREATE POLICY "Admins can view all activity logs"
ON public.admin_activity_log
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Comment for documentation
COMMENT ON TABLE public.admin_activity_log IS 'Logs all admin actions for auditing purposes';