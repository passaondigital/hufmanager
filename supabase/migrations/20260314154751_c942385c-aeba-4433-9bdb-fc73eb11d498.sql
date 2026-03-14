
-- FIX 1: Set search_path on generate_bid function
CREATE OR REPLACE FUNCTION public.generate_bid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.bid IS NULL THEN
    NEW.bid := 'BID-' || LPAD(nextval('botschafter_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- FIX 2: Harden overly permissive RLS INSERT policies

-- affiliate_conversions — block direct client inserts (use service_role via Edge Functions)
DROP POLICY IF EXISTS "Auth insert affiliate_conversions" ON public.affiliate_conversions;
CREATE POLICY "No direct insert affiliate_conversions"
ON public.affiliate_conversions FOR INSERT
TO authenticated
WITH CHECK (false);

-- botschafter_clicks — validate referral_code exists
DROP POLICY IF EXISTS "Public insert clicks" ON public.botschafter_clicks;
CREATE POLICY "Validated insert clicks"
ON public.botschafter_clicks FOR INSERT
TO anon, authenticated
WITH CHECK (
  referral_code IS NOT NULL 
  AND length(referral_code) <= 20
);

-- demo_activity_logs — require activity_type
DROP POLICY IF EXISTS "Anyone can log demo activity" ON public.demo_activity_logs;
CREATE POLICY "Validated demo activity"
ON public.demo_activity_logs FOR INSERT
TO anon, authenticated
WITH CHECK (
  activity_type IS NOT NULL
  AND length(coalesce(activity_type, '')) <= 100
);

-- funnel_leads — require email
DROP POLICY IF EXISTS "Anyone can submit funnel leads" ON public.funnel_leads;
CREATE POLICY "Validated funnel leads"
ON public.funnel_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) <= 255
);

-- leads — require provider_id
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;
CREATE POLICY "Validated create leads"
ON public.leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  provider_id IS NOT NULL
  AND length(coalesce(email, '')) <= 255
);

-- performance_metrics — require auth
DROP POLICY IF EXISTS "Anyone can insert performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Authenticated can insert metrics" ON public.performance_metrics;
CREATE POLICY "Auth insert performance metrics"
ON public.performance_metrics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- pferdeakte_waitlist — validate email
DROP POLICY IF EXISTS "public_insert_waitlist" ON public.pferdeakte_waitlist;
CREATE POLICY "Validated insert waitlist"
ON public.pferdeakte_waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL 
  AND length(email) <= 255
);

-- preview_feedback — validate content
DROP POLICY IF EXISTS "anon_insert_feedback" ON public.preview_feedback;
CREATE POLICY "Validated insert feedback"
ON public.preview_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (
  provider_id IS NOT NULL
  AND length(coalesce(comment, '')) <= 2000
);

-- provider_page_views — validate provider_id
DROP POLICY IF EXISTS "anyone_insert_page_views" ON public.provider_page_views;
CREATE POLICY "Validated insert page views"
ON public.provider_page_views FOR INSERT
TO anon, authenticated
WITH CHECK (provider_id IS NOT NULL);

-- website_leads — validate email
DROP POLICY IF EXISTS "public_inserts_leads" ON public.website_leads;
CREATE POLICY "Validated website leads"
ON public.website_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) <= 255
  AND dsgvo_consent = true
);
