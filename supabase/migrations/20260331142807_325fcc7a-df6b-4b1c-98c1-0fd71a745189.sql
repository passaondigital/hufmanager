
-- =============================================================
-- FIX 1: office-pdfs public SELECT → authenticated owners only
-- =============================================================
DROP POLICY IF EXISTS "Public read office pdfs" ON storage.objects;
CREATE POLICY "Owners read own office pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'office-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- FIX 2: pferdeakte_global_stats view missing security_invoker
-- =============================================================
DROP VIEW IF EXISTS public.pferdeakte_global_stats;
CREATE VIEW public.pferdeakte_global_stats
WITH (security_invoker = on) AS
  SELECT
    count(*) AS total_pferdeakten,
    count(DISTINCT owner_id) AS total_besitzer,
    count(*) FILTER (WHERE created_at >= (now() - interval '7 days')) AS new_last_7_days,
    count(*) FILTER (WHERE created_at >= (now() - interval '30 days')) AS new_last_30_days
  FROM horses
  WHERE deleted_at IS NULL;

-- =============================================================
-- FIX 3: review_reactions rate limit – fix tautological condition
-- =============================================================
DROP POLICY IF EXISTS "rate_limit_review_reactions" ON public.review_reactions;
CREATE POLICY "rate_limit_review_reactions"
  ON public.review_reactions FOR INSERT
  WITH CHECK (
    (
      SELECT count(*)
      FROM public.review_reactions rr
      WHERE rr.fingerprint = fingerprint
        AND rr.created_at > (now() - interval '1 hour')
    ) < 15
  );

-- =============================================================
-- FIX 4: protect_lifetime_accounts – set search_path
-- =============================================================
CREATE OR REPLACE FUNCTION public.protect_lifetime_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status = 'expired'
     AND NEW.plan_override = 'lifetime_grant' THEN
    NEW.account_status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================
-- FIX 5: portal_applications – scope INSERT to non-empty check
-- =============================================================
DROP POLICY IF EXISTS "Anyone can apply" ON public.portal_applications;
CREATE POLICY "Anyone can apply"
  ON public.portal_applications FOR INSERT
  WITH CHECK (
    company_name IS NOT NULL
    AND contact_email IS NOT NULL
    AND privacy_accepted = true
  );
