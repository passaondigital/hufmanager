-- Add appointment_id column to media_assets for linking evidence to visits
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_appointment_id ON public.media_assets(appointment_id);

-- Update RLS policies to allow providers to view/insert media linked to their appointments
DROP POLICY IF EXISTS "Providers can view granted horse media" ON public.media_assets;
CREATE POLICY "Providers can view granted horse media"
ON public.media_assets FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM access_grants ag
      JOIN horses h ON h.owner_id = ag.client_id
      WHERE h.id = media_assets.horse_id 
        AND ag.provider_id = auth.uid() 
        AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.horse_id = media_assets.horse_id AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = media_assets.appointment_id AND a.provider_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Providers can insert granted horse media" ON public.media_assets;
CREATE POLICY "Providers can insert granted horse media"
ON public.media_assets FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND auth.uid() = uploaded_by AND (
    EXISTS (
      SELECT 1 FROM access_grants ag
      JOIN horses h ON h.owner_id = ag.client_id
      WHERE h.id = media_assets.horse_id 
        AND ag.provider_id = auth.uid() 
        AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.horse_id = media_assets.horse_id AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = media_assets.appointment_id AND a.provider_id = auth.uid()
    )
  )
);