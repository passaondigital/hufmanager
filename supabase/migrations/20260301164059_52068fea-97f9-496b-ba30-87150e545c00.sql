-- Performance metrics table for Real User Monitoring (RUM)
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value_ms NUMERIC NOT NULL,
  route TEXT,
  connection_type TEXT DEFAULT 'unknown',
  device_memory NUMERIC,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for querying by time range and metric type
CREATE INDEX IF NOT EXISTS idx_perf_metrics_type_created 
ON public.performance_metrics (metric_type, created_at DESC);

-- Index for route-based analysis
CREATE INDEX IF NOT EXISTS idx_perf_metrics_route 
ON public.performance_metrics (route, created_at DESC);

-- Enable RLS but allow inserts from authenticated and anon users (monitoring data)
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert metrics (monitoring is non-sensitive)
CREATE POLICY "Anyone can insert performance metrics"
ON public.performance_metrics FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Only admins can read metrics
CREATE POLICY "Admins can read performance metrics"
ON public.performance_metrics FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Auto-cleanup: delete metrics older than 30 days (via scheduled function)
COMMENT ON TABLE public.performance_metrics IS 'Core Web Vitals RUM data. Auto-purge after 30 days.';