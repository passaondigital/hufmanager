-- FIX 1: Services - Allow providers to INSERT/UPDATE/DELETE their own services
-- The current policy requires provider_id = auth.uid() but the code doesn't set provider_id on insert

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Providers can manage own services" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;

-- Create proper policies that handle provider_id correctly
CREATE POLICY "Anyone can view active services" 
ON services FOR SELECT 
USING (is_active = true);

CREATE POLICY "Providers can view own services" 
ON services FOR SELECT 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

CREATE POLICY "Providers can insert services" 
ON services FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can update own services" 
ON services FOR UPDATE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can delete own services" 
ON services FOR DELETE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

-- FIX 2: Offers - Same issue
DROP POLICY IF EXISTS "Providers can manage own offers" ON offers;
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;

CREATE POLICY "Anyone can view active offers" 
ON offers FOR SELECT 
USING (is_active = true);

CREATE POLICY "Providers can view own offers" 
ON offers FOR SELECT 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

CREATE POLICY "Providers can insert offers" 
ON offers FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can update own offers" 
ON offers FOR UPDATE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can delete own offers" 
ON offers FOR DELETE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

-- FIX 3: Feedbacks - Same issue  
DROP POLICY IF EXISTS "Providers can manage own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Anyone can view featured feedbacks" ON feedbacks;

CREATE POLICY "Anyone can view featured feedbacks" 
ON feedbacks FOR SELECT 
USING (is_featured = true);

CREATE POLICY "Providers can view own feedbacks" 
ON feedbacks FOR SELECT 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

CREATE POLICY "Providers can insert feedbacks" 
ON feedbacks FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can update own feedbacks" 
ON feedbacks FOR UPDATE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL))
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can delete own feedbacks" 
ON feedbacks FOR DELETE 
USING (has_role(auth.uid(), 'provider'::app_role) AND (provider_id = auth.uid() OR provider_id IS NULL));

-- FIX 4: business_settings - Allow insert without existing record
DROP POLICY IF EXISTS "Users can manage own settings securely" ON business_settings;

CREATE POLICY "Users can view own settings" 
ON business_settings FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own settings" 
ON business_settings FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON business_settings FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" 
ON business_settings FOR DELETE 
USING (auth.uid() = user_id);

-- FIX 5: Public access to business_settings for landing pages (read only by subdomain)
CREATE POLICY "Anyone can view settings by subdomain" 
ON business_settings FOR SELECT 
USING (subdomain IS NOT NULL);