-- Clean up orphaned records in conversations
DELETE FROM conversations WHERE provider_id NOT IN (SELECT id FROM profiles);
DELETE FROM conversations WHERE client_id NOT IN (SELECT id FROM profiles);

-- Clean up orphaned records in access_grants
DELETE FROM access_grants WHERE provider_id NOT IN (SELECT id FROM profiles);
DELETE FROM access_grants WHERE client_id NOT IN (SELECT id FROM profiles);

-- 1. Add provider_id column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS provider_id uuid;

-- 2. Drop existing foreign key constraints
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_provider_id_fkey;
ALTER TABLE public.horses DROP CONSTRAINT IF EXISTS horses_owner_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_provider_id_fkey;
ALTER TABLE public.access_grants DROP CONSTRAINT IF EXISTS access_grants_client_id_fkey;
ALTER TABLE public.access_grants DROP CONSTRAINT IF EXISTS access_grants_provider_id_fkey;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_profile_id_fkey;

-- 3. Recreate foreign keys with CASCADE
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.horses 
ADD CONSTRAINT horses_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.access_grants
ADD CONSTRAINT access_grants_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.access_grants
ADD CONSTRAINT access_grants_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Drop old invoice RLS policies and create new ones
DROP POLICY IF EXISTS "Clients can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can manage invoices for their clients" ON public.invoices;
DROP POLICY IF EXISTS "Providers can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can delete own invoices" ON public.invoices;

CREATE POLICY "Clients can view own invoices" 
ON public.invoices FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Providers can view own invoices" 
ON public.invoices FOR SELECT 
USING (has_role(auth.uid(), 'provider') AND provider_id = auth.uid());

CREATE POLICY "Providers can create invoices" 
ON public.invoices FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'provider') AND provider_id = auth.uid());

CREATE POLICY "Providers can update own invoices" 
ON public.invoices FOR UPDATE 
USING (has_role(auth.uid(), 'provider') AND provider_id = auth.uid());

CREATE POLICY "Providers can delete own invoices" 
ON public.invoices FOR DELETE 
USING (has_role(auth.uid(), 'provider') AND provider_id = auth.uid());

-- 5. Fix profile deletion
DROP POLICY IF EXISTS "Providers can delete client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Providers can delete created profiles" ON public.profiles;

CREATE POLICY "Providers can delete created profiles" 
ON public.profiles FOR DELETE 
USING (has_role(auth.uid(), 'provider') AND created_by_provider_id = auth.uid());