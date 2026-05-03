-- Add BHS plan tier classification to leads table
-- Allowed values: 'go', 'balance', 'intensiv', 'unklar'
-- Existing leads remain NULL (= not yet classified)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS plan_tier text
  CHECK (plan_tier IN ('go', 'balance', 'intensiv', 'unklar'));
