-- Fix Storage RLS policies for horse-documents bucket (foldername was incorrectly using horse name)

-- Drop broken policies
DROP POLICY IF EXISTS "Clients can upload own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view own horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete own horse documents" ON storage.objects;

DROP POLICY IF EXISTS "Providers can upload granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update granted horse documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete granted horse documents" ON storage.objects;

-- Clients: manage their own horse documents (object path must start with horse_id/...) 
CREATE POLICY "Clients can upload own horse documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.owner_id = auth.uid()
      AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can view own horse documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.owner_id = auth.uid()
      AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Clients can delete own horse documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'horse-documents'
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.owner_id = auth.uid()
      AND h.deleted_at IS NULL
  )
);

-- Providers: manage horse documents for horses they are allowed to access (granted or in their appointments)
CREATE POLICY "Providers can upload granted horse documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'horse-documents'
  AND public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = h.owner_id
            AND p.created_by_provider_id = auth.uid()
            AND p.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_grants ag
          WHERE ag.client_id = h.owner_id
            AND ag.provider_id = auth.uid()
            AND ag.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.horse_id = h.id
            AND a.provider_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Providers can view granted horse documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'horse-documents'
  AND public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = h.owner_id
            AND p.created_by_provider_id = auth.uid()
            AND p.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_grants ag
          WHERE ag.client_id = h.owner_id
            AND ag.provider_id = auth.uid()
            AND ag.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.horse_id = h.id
            AND a.provider_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Providers can update granted horse documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'horse-documents'
  AND public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = h.owner_id
            AND p.created_by_provider_id = auth.uid()
            AND p.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_grants ag
          WHERE ag.client_id = h.owner_id
            AND ag.provider_id = auth.uid()
            AND ag.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.horse_id = h.id
            AND a.provider_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  bucket_id = 'horse-documents'
);

CREATE POLICY "Providers can delete granted horse documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'horse-documents'
  AND public.has_role(auth.uid(), 'provider'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.horses h
    WHERE h.id::text = (storage.foldername(name))[1]
      AND h.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = h.owner_id
            AND p.created_by_provider_id = auth.uid()
            AND p.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_grants ag
          WHERE ag.client_id = h.owner_id
            AND ag.provider_id = auth.uid()
            AND ag.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.appointments a
          WHERE a.horse_id = h.id
            AND a.provider_id = auth.uid()
        )
      )
  )
);
