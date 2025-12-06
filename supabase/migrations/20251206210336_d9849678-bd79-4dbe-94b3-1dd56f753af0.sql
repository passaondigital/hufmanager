-- Add ical_token to profiles for secure calendar subscription
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ical_token uuid DEFAULT gen_random_uuid();

-- Add recurring_group_id to appointments for linking recurring appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS recurring_group_id uuid DEFAULT NULL;

-- Add index for faster recurring group queries
CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group ON public.appointments(recurring_group_id) WHERE recurring_group_id IS NOT NULL;