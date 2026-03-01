-- Add public_profile_visible to partner_business_settings
ALTER TABLE public.partner_business_settings
  ADD COLUMN IF NOT EXISTS public_profile_visible boolean DEFAULT false;

-- Add template fields to partner_treatment_notes for specialty templates
ALTER TABLE public.partner_treatment_notes
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS body_map_zones jsonb;

-- RLS: allow anyone to read partner profiles when public_profile_visible is true
CREATE POLICY "Public can view visible partner profiles"
ON public.partner_business_settings FOR SELECT
TO anon
USING (public_profile_visible = true);