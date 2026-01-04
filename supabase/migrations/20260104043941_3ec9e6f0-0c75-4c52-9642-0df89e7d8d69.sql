-- Create media_assets table for the Media Vault
CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL, -- 'image', 'video', 'pdf', 'document'
  category text DEFAULT 'general', -- 'xray', 'hoof', 'vet-report', 'general'
  captured_at timestamp with time zone NOT NULL DEFAULT now(), -- The date the media was taken/created (backdatable)
  title text,
  notes text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying by horse and date
CREATE INDEX idx_media_assets_horse_captured ON public.media_assets(horse_id, captured_at DESC);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Clients can view media for their own horses
CREATE POLICY "Clients can view own horse media"
ON public.media_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = media_assets.horse_id
    AND h.owner_id = auth.uid()
  )
);

-- Clients can upload media to their own horses
CREATE POLICY "Clients can insert own horse media"
ON public.media_assets
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = media_assets.horse_id
    AND h.owner_id = auth.uid()
  )
);

-- Clients can delete their own uploaded media
CREATE POLICY "Clients can delete own uploaded media"
ON public.media_assets
FOR DELETE
USING (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = media_assets.horse_id
    AND h.owner_id = auth.uid()
  )
);

-- Providers can view media for horses they have access to
CREATE POLICY "Providers can view granted horse media"
ON public.media_assets
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = media_assets.horse_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = media_assets.horse_id
      AND a.provider_id = auth.uid()
    )
  )
);

-- Providers can upload media to horses they have access to
CREATE POLICY "Providers can insert granted horse media"
ON public.media_assets
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role)
  AND auth.uid() = uploaded_by
  AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = media_assets.horse_id
      AND ag.provider_id = auth.uid()
      AND ag.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = media_assets.horse_id
      AND a.provider_id = auth.uid()
    )
  )
);

-- Providers can delete media they uploaded
CREATE POLICY "Providers can delete own uploaded media"
ON public.media_assets
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role)
  AND uploaded_by = auth.uid()
);

-- Create trigger for updated_at
CREATE TRIGGER update_media_assets_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();