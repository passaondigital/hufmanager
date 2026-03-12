
-- =============================================
-- SECURITY FIX MIGRATION — 6 Issues
-- Nur RLS Policies + 1 Funktion
-- Keine Daten, keine UI
-- =============================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 1: academy_videos — Admin-only management
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "Providers can manage academy videos" ON public.academy_videos;
DROP POLICY IF EXISTS "Authenticated users can view academy videos" ON public.academy_videos;

-- Nur Admin darf verwalten (INSERT/UPDATE/DELETE)
CREATE POLICY "admin_manage_academy_videos"
ON public.academy_videos
FOR ALL USING (
  is_admin(auth.uid())
) WITH CHECK (
  is_admin(auth.uid())
);

-- Alle authentifizierten User dürfen lesen
CREATE POLICY "authenticated_read_academy_videos"
ON public.academy_videos
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 2: contract_templates — Provider+Admin only
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "contract_templates_provider_select" ON public.contract_templates;

CREATE POLICY "contract_templates_provider_select"
ON public.contract_templates
FOR SELECT USING (
  is_active = true
  AND (
    has_role(auth.uid(), 'provider')
    OR is_admin(auth.uid())
  )
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 3: system_health_checks — No public insert
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "Service can insert health checks" ON public.system_health_checks;
DROP POLICY IF EXISTS "Admins can read health checks" ON public.system_health_checks;

CREATE POLICY "admin_insert_health_checks"
ON public.system_health_checks
FOR INSERT WITH CHECK (
  is_admin(auth.uid())
);

CREATE POLICY "admin_read_health_checks"
ON public.system_health_checks
FOR SELECT USING (
  is_admin(auth.uid())
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 4: stall_board_comments — Auth required
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "Read stall comments" ON public.stall_board_comments;

CREATE POLICY "authenticated_read_stall_comments"
ON public.stall_board_comments
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM stall_board_posts p
    WHERE p.id = stall_board_comments.post_id
    AND p.deleted_at IS NULL
    AND (
      p.provider_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.provider_id = p.provider_id
        AND ag.client_id = auth.uid()
        AND ag.is_active = true
        AND (ag.valid_until IS NULL OR ag.valid_until > now())
      )
    )
  )
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 5: review_reactions — Fix self-referencing fingerprint
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "Allow insert for tracking with limit" ON public.review_reactions;

CREATE POLICY "rate_limit_review_reactions"
ON public.review_reactions
FOR INSERT WITH CHECK (
  (
    SELECT COUNT(*)
    FROM public.review_reactions rr
    WHERE rr.fingerprint = fingerprint
    AND rr.created_at > now() - interval '1 hour'
  ) < 15
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX 6: get_employee_profile_id — Filter inactive
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_employee_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.employee_profiles
  WHERE user_id = _user_id
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
$$;
