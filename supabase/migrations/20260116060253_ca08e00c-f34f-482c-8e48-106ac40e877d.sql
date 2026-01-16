-- Create feedback_reports table for bug reports with screenshots
CREATE TABLE public.feedback_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  page_url TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  browser_info TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback reports
CREATE POLICY "Users can create feedback reports"
ON public.feedback_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own feedback reports
CREATE POLICY "Users can view own feedback reports"
ON public.feedback_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback reports
CREATE POLICY "Admins can view all feedback reports"
ON public.feedback_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update feedback reports
CREATE POLICY "Admins can update feedback reports"
ON public.feedback_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can delete feedback reports
CREATE POLICY "Admins can delete feedback reports"
ON public.feedback_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);