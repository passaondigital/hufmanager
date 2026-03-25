-- Allow anonymous read access to active subscription plans (for public calculator)
CREATE POLICY "anon_read_active_plans"
ON public.subscription_plans FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous inserts into website_leads (for public lead form)
CREATE POLICY "anon_insert_leads"
ON public.website_leads FOR INSERT
TO anon
WITH CHECK (
  contact_name IS NOT NULL
  AND length(contact_name) > 0
  AND length(contact_name) <= 200
  AND dsgvo_consent = true
  AND owner_id IS NOT NULL
);