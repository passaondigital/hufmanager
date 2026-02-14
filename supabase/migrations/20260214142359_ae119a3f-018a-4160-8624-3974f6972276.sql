
-- Alter ecosystem_links to match the new schema requirements
-- Add missing columns

ALTER TABLE public.ecosystem_links 
  ADD COLUMN IF NOT EXISTS app_key text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS data_sharing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Make user_id NOT NULL (update any existing nulls first)
DELETE FROM public.ecosystem_links WHERE user_id IS NULL;
ALTER TABLE public.ecosystem_links ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key to auth.users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ecosystem_links_user_id_fkey_auth'
    AND table_name = 'ecosystem_links'
  ) THEN
    ALTER TABLE public.ecosystem_links
      ADD CONSTRAINT ecosystem_links_user_id_fkey_auth
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint on (user_id, app_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ecosystem_links_user_app_unique'
    AND table_name = 'ecosystem_links'
  ) THEN
    ALTER TABLE public.ecosystem_links
      ADD CONSTRAINT ecosystem_links_user_app_unique UNIQUE (user_id, app_key);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.ecosystem_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "Users can view own ecosystem links" ON public.ecosystem_links;
DROP POLICY IF EXISTS "Users can insert own ecosystem links" ON public.ecosystem_links;
DROP POLICY IF EXISTS "Users can update own ecosystem links" ON public.ecosystem_links;
DROP POLICY IF EXISTS "Users can delete own ecosystem links" ON public.ecosystem_links;

CREATE POLICY "Users can view own ecosystem links"
  ON public.ecosystem_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ecosystem links"
  ON public.ecosystem_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ecosystem links"
  ON public.ecosystem_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ecosystem links"
  ON public.ecosystem_links FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ecosystem_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_ecosystem_links_updated_at ON public.ecosystem_links;
CREATE TRIGGER update_ecosystem_links_updated_at
  BEFORE UPDATE ON public.ecosystem_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ecosystem_links_updated_at();
