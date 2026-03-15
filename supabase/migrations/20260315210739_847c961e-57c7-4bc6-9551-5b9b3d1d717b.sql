ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS known_allergies TEXT;