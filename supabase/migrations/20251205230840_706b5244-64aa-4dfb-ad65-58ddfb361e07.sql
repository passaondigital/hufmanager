-- ==========================================
-- SECURITY FIX: Restrict hoof_photos access to connected providers only
-- ==========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Providers can manage all photos" ON public.hoof_photos;

-- Create restrictive SELECT policy: Providers can only view photos for horses they have a connection to
CREATE POLICY "Providers can view granted photos"
ON public.hoof_photos
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    -- Provider has an active access grant from the horse owner
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = hoof_photos.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    -- Provider has an existing appointment with this horse
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = hoof_photos.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive INSERT policy: Providers can only add photos to horses they have a connection to
CREATE POLICY "Providers can insert granted photos"
ON public.hoof_photos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = hoof_photos.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = hoof_photos.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive UPDATE policy
CREATE POLICY "Providers can update granted photos"
ON public.hoof_photos
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = hoof_photos.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = hoof_photos.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive DELETE policy
CREATE POLICY "Providers can delete granted photos"
ON public.hoof_photos
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = hoof_photos.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = hoof_photos.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- ==========================================
-- SECURITY FIX: Restrict horse_documents access to connected providers only
-- ==========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Providers can manage all horse documents" ON public.horse_documents;

-- Create restrictive SELECT policy
CREATE POLICY "Providers can view granted documents"
ON public.horse_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = horse_documents.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = horse_documents.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive INSERT policy
CREATE POLICY "Providers can insert granted documents"
ON public.horse_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = horse_documents.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = horse_documents.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive UPDATE policy
CREATE POLICY "Providers can update granted documents"
ON public.horse_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = horse_documents.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = horse_documents.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);

-- Create restrictive DELETE policy
CREATE POLICY "Providers can delete granted documents"
ON public.horse_documents
FOR DELETE
USING (
  has_role(auth.uid(), 'provider'::app_role) AND (
    EXISTS (
      SELECT 1 FROM public.access_grants ag
      JOIN public.horses h ON h.owner_id = ag.client_id
      WHERE h.id = horse_documents.horse_id 
      AND ag.provider_id = auth.uid() 
      AND ag.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.horse_id = horse_documents.horse_id 
      AND a.provider_id = auth.uid()
    )
  )
);