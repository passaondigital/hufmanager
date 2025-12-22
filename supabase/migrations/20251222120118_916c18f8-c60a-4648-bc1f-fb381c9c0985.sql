-- Add user management fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_manually_managed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_override text DEFAULT null,
ADD COLUMN IF NOT EXISTS access_valid_until timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS feature_flags jsonb DEFAULT '{"module_invoicing": true, "module_chat": true, "module_maps": true, "beta_features": false}'::jsonb,
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT null;

-- Add comment for plan_override values
COMMENT ON COLUMN public.profiles.plan_override IS 'Values: null (use Copecart), lifetime_grant, manual_cash_1y, beta_tester, employee';

-- Add 'admin' to the app_role enum if it doesn't exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';