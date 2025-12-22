-- Add booking_action column to services table
-- Values: 'direct_book' (default) or 'request_only'
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS booking_action text NOT NULL DEFAULT 'direct_book';

-- Add check constraint for valid values
ALTER TABLE public.services 
ADD CONSTRAINT services_booking_action_check 
CHECK (booking_action IN ('direct_book', 'request_only'));