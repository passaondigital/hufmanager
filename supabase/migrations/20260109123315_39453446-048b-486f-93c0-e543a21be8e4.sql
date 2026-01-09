-- Fix: business_settings Policy - user_id IS NULL entfernen
-- =============================================

-- Alte Policy entfernen die user_id IS NULL erlaubt
DROP POLICY IF EXISTS "Users can view own settings" ON business_settings;

-- Neue strikte Policy: Nur Owner kann eigene Settings sehen
CREATE POLICY "Owner can view own settings" ON business_settings
FOR SELECT 
USING (user_id = auth.uid());

-- Provider kann eigene Settings bearbeiten
DROP POLICY IF EXISTS "Users can update own settings" ON business_settings;
CREATE POLICY "Owner can update own settings" ON business_settings
FOR UPDATE 
USING (user_id = auth.uid());

-- Provider kann eigene Settings anlegen
DROP POLICY IF EXISTS "Users can insert own settings" ON business_settings;
CREATE POLICY "Owner can insert own settings" ON business_settings
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Admin-Zugriff auf alle Settings
CREATE POLICY "Admins can manage all settings" ON business_settings
FOR ALL 
USING (public.is_admin(auth.uid()));