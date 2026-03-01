
-- Horse Health Logs table
CREATE TABLE IF NOT EXISTS public.horse_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  wellbeing smallint NOT NULL DEFAULT 1,
  weight numeric(6,1),
  hoof_rating smallint,
  temperament text,
  ate_normally boolean,
  notes text,
  shared_with_provider boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.horse_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own health logs"
  ON public.horse_health_logs FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Provider views shared health logs"
  ON public.horse_health_logs FOR SELECT
  USING (
    shared_with_provider = true
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = horse_health_logs.owner_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
    )
  );

-- Stall Board Posts table
CREATE TABLE IF NOT EXISTS public.stall_board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'info',
  text text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.stall_board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read stall board"
  ON public.stall_board_posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.access_grants ag
        WHERE ag.client_id = auth.uid()
          AND ag.provider_id = stall_board_posts.provider_id
          AND ag.is_active = true
          AND ag.status = 'active'
      )
      OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Authors insert stall posts"
  ON public.stall_board_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = auth.uid()
        AND ag.provider_id = stall_board_posts.provider_id
        AND ag.is_active = true
    )
  );

CREATE POLICY "Authors update own posts"
  ON public.stall_board_posts FOR UPDATE
  USING (author_id = auth.uid() OR provider_id = auth.uid());

-- Stall Board Comments
CREATE TABLE IF NOT EXISTS public.stall_board_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.stall_board_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.stall_board_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read stall comments"
  ON public.stall_board_comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.stall_board_posts p
      WHERE p.id = stall_board_comments.post_id
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "Insert stall comments"
  ON public.stall_board_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());
