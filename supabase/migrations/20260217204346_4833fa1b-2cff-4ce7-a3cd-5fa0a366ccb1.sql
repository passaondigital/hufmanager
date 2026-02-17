
-- ============================================
-- SECURITY FIX 1: help_articles - nur für authentifizierte Nutzer
-- ============================================
DROP POLICY IF EXISTS "Anyone can view help articles" ON public.help_articles;
CREATE POLICY "Authenticated users can view help articles"
ON public.help_articles
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- SECURITY FIX 2: blog_posts - Entwürfe nur für Admins
-- (Published posts bleiben öffentlich - das ist korrekt)
-- Die bestehende Policy zeigt nur is_published=true, das ist OK.
-- Aber wir brauchen eine zusätzliche Policy für scheduled_at
-- ============================================
DROP POLICY IF EXISTS "Published blog posts are public" ON public.blog_posts;
CREATE POLICY "Published blog posts are public"
ON public.blog_posts
FOR SELECT
USING (is_published = true AND (scheduled_at IS NULL OR scheduled_at <= now()));

-- ============================================
-- SECURITY FIX 3: subscription_links - nur eigene Links sehen
-- ============================================
DROP POLICY IF EXISTS "Kunden dürfen Links lesen" ON public.subscription_links;
CREATE POLICY "Authenticated users can read relevant links"
ON public.subscription_links
FOR SELECT
TO authenticated
USING (
  auth.uid() = provider_id
  OR public.is_admin(auth.uid())
);

-- ============================================
-- SECURITY FIX 4: system_settings - nur für authentifizierte Nutzer
-- ============================================
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- SECURITY FIX 5: Ignore legitimate public INSERT policies
-- demo_activity_logs, leads, review_reactions are intentionally public
-- ============================================
