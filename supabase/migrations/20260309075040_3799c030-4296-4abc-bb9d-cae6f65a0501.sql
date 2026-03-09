
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS communication_mode TEXT DEFAULT 'not_set',
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
