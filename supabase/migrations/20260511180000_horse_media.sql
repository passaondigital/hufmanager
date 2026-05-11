-- ============================================================================
-- Phase F-1: Horse Media Pipeline
--
-- Purpose:
--   1. Create horse_media table for photos, videos, and audio captured
--      via HufiCam and linked to a horse profile.
--   2. Enable RLS: owners can manage their own media; providers can view
--      media for horses they have access to via access_grants.
--   3. Create horse-media storage bucket (private, 50 MB limit).
--
-- No medical diagnosis is stored or automated here.
-- ai_status = 'pending' marks media for future HufAI analysis (Phase F-2).
-- ============================================================================

-- ── 1. horse_media table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.horse_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id      uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('photo', 'video', 'audio')),
  bucket_path   text NOT NULL,
  file_name     text,
  mime_type     text,
  size_bytes    bigint,
  captured_at   timestamptz DEFAULT now(),
  captured_by   uuid REFERENCES auth.users(id),
  notes         text,
  tags          text[] DEFAULT '{}',
  -- Phase F-2 will attach AI analysis to this media.
  ai_status     text DEFAULT 'pending' CHECK (ai_status IN ('pending', 'processing', 'done', 'skipped')),
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE public.horse_media IS
  'Structured horse media (photo/video/audio) captured via HufiCam. '
  'ai_status=pending marks items for future HufAI analysis (Phase F-2). '
  'No automated medical diagnosis is performed on this data.';

COMMENT ON COLUMN public.horse_media.ai_status IS
  'Phase F-2 will attach AI analysis. pending = not yet processed. '
  'HufAI assists — it does not automate medical diagnosis.';

-- ── 2. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS horse_media_horse_id_idx
  ON public.horse_media (horse_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS horse_media_owner_id_idx
  ON public.horse_media (owner_id);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.horse_media ENABLE ROW LEVEL SECURITY;

-- Horse owners can fully manage their own media
CREATE POLICY "owner_manage_own_media"
  ON public.horse_media
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Providers can view media for horses they have active access to
CREATE POLICY "provider_view_horse_media"
  ON public.horse_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.access_grants ag
      WHERE ag.provider_id = auth.uid()
        AND ag.client_id   = (
          SELECT h.owner_id FROM public.horses h WHERE h.id = horse_media.horse_id
        )
        AND ag.is_active = true
        AND ag.status IN ('active', 'pending')
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (
        SELECT h.owner_id FROM public.horses h WHERE h.id = horse_media.horse_id
      )
        AND p.created_by_provider_id = auth.uid()
    )
  );

-- ── 4. Storage bucket ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'horse-media',
  'horse-media',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/ogg', 'audio/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated owners to upload/read their own paths
-- Path structure: horse-media/{owner_id}/{horse_id}/{yyyy}/{mm}/{uuid}.{ext}
CREATE POLICY "horse_media_owner_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'horse-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "horse_media_owner_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'horse-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "horse_media_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'horse-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
