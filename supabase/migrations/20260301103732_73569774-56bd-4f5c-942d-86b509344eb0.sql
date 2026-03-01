-- Add DACH support and notification preferences to partner_business_settings
ALTER TABLE public.partner_business_settings 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'DE',
ADD COLUMN IF NOT EXISTS kleine_unternehmer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_vat_rate numeric DEFAULT 19,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email_horse_share": true, "email_chat_message": true, "email_appointment": true, "push_enabled": false}'::jsonb;

-- Add onboarding_dismissed to profiles for partners
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean DEFAULT false;

-- RLS policy for partners to read appointments on horses they have access to
CREATE POLICY "Partners can view appointments for shared horses"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.horse_partner_access hpa
    WHERE hpa.horse_id = appointments.horse_id
      AND hpa.partner_profile_id = auth.uid()
      AND hpa.is_active = true
      AND hpa.status = 'active'
  )
);