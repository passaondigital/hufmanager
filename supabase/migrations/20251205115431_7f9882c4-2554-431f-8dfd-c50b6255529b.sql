-- Add reminder settings to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS reminder_custom_text text,
ADD COLUMN IF NOT EXISTS reminder_intervals jsonb DEFAULT '["evening_before"]'::jsonb;

-- Add confirmation fields to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS is_confirmed_by_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Create reminder tracking table to avoid duplicate sends
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- 'evening_before', '6_hours', '1_hour'
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'email', -- 'email', 'in_app'
  UNIQUE(appointment_id, reminder_type, channel)
);

-- Enable RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Providers can view and manage reminders
CREATE POLICY "Providers can manage reminders"
ON public.appointment_reminders
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role));

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON public.appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token ON public.appointments(confirmation_token);