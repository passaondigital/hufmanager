-- Add status column to access_grants for pending/active/rejected workflow
ALTER TABLE public.access_grants 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN public.access_grants.status IS 'Connection status: pending, active, rejected';

-- Update existing active grants to have status = active
UPDATE public.access_grants 
SET status = 'active' 
WHERE is_active = true AND status IS NULL;

-- Update existing inactive grants to have status = rejected
UPDATE public.access_grants 
SET status = 'rejected' 
WHERE is_active = false AND status IS NULL;

-- Add requested_by column to track who initiated the connection
ALTER TABLE public.access_grants
ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES public.profiles(id);

-- Add requested_at timestamp
ALTER TABLE public.access_grants
ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT now();

-- Add message column for connection request messages
ALTER TABLE public.access_grants
ADD COLUMN IF NOT EXISTS request_message text;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_access_grants_status ON public.access_grants(status);
CREATE INDEX IF NOT EXISTS idx_access_grants_provider_status ON public.access_grants(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_access_grants_client_status ON public.access_grants(client_id, status);

-- Update RLS policies to allow viewing pending requests
DROP POLICY IF EXISTS "Providers can view grants for themselves" ON public.access_grants;
CREATE POLICY "Providers can view grants for themselves"
ON public.access_grants
FOR SELECT
USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Clients can view own access grants" ON public.access_grants;
CREATE POLICY "Clients can view own access grants"
ON public.access_grants
FOR SELECT
USING (auth.uid() = client_id);

-- Allow providers to update grant status (approve/reject)
DROP POLICY IF EXISTS "Providers can update grants" ON public.access_grants;
CREATE POLICY "Providers can update grants"
ON public.access_grants
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Allow clients to update grant status
DROP POLICY IF EXISTS "Clients can update own access grants" ON public.access_grants;
CREATE POLICY "Clients can update own access grants"
ON public.access_grants
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);