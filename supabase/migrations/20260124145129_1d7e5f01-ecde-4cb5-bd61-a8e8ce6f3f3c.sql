-- Storage quota tracking table
CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('provider', 'client', 'horse')),
  entity_id UUID NOT NULL,
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(bucket_name, file_path)
);

-- Index for fast lookups
CREATE INDEX idx_storage_usage_entity ON public.storage_usage(entity_type, entity_id);
CREATE INDEX idx_storage_usage_bucket ON public.storage_usage(bucket_name);

-- Enable RLS
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Providers can view their own usage"
  ON public.storage_usage FOR SELECT
  USING (
    (entity_type = 'provider' AND entity_id = auth.uid())
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Clients can view their own usage"
  ON public.storage_usage FOR SELECT
  USING (
    (entity_type = 'client' AND entity_id = auth.uid())
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Users can insert their own uploads"
  ON public.storage_usage FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own uploads"
  ON public.storage_usage FOR DELETE
  USING (uploaded_by = auth.uid());

-- Function to get total usage for an entity
CREATE OR REPLACE FUNCTION public.get_storage_usage(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT
  FROM public.storage_usage
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;
$$;

-- Function to check if upload is allowed
CREATE OR REPLACE FUNCTION public.check_storage_quota(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_file_size_bytes BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_usage BIGINT;
  v_quota_limit BIGINT;
  v_max_file_size BIGINT;
BEGIN
  -- Get current usage
  SELECT COALESCE(SUM(file_size_bytes), 0) INTO v_current_usage
  FROM public.storage_usage
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
  
  -- Set quota limits (in bytes)
  CASE p_entity_type
    WHEN 'provider' THEN 
      v_quota_limit := 10737418240;  -- 10 GB
      v_max_file_size := 52428800;   -- 50 MB max per file
    WHEN 'client' THEN 
      v_quota_limit := 1073741824;   -- 1 GB
      v_max_file_size := 20971520;   -- 20 MB max per file
    WHEN 'horse' THEN 
      v_quota_limit := 524288000;    -- 500 MB
      v_max_file_size := 10485760;   -- 10 MB max per file
    ELSE
      v_quota_limit := 104857600;    -- 100 MB default
      v_max_file_size := 5242880;    -- 5 MB default
  END CASE;
  
  RETURN json_build_object(
    'allowed', (v_current_usage + p_file_size_bytes) <= v_quota_limit 
               AND p_file_size_bytes <= v_max_file_size,
    'current_usage', v_current_usage,
    'quota_limit', v_quota_limit,
    'max_file_size', v_max_file_size,
    'remaining', v_quota_limit - v_current_usage,
    'file_size', p_file_size_bytes,
    'would_exceed_quota', (v_current_usage + p_file_size_bytes) > v_quota_limit,
    'exceeds_max_file_size', p_file_size_bytes > v_max_file_size
  );
END;
$$;