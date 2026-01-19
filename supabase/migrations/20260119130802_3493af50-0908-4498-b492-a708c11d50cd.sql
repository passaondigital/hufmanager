-- Schritt 1: Spalten zu product_recipes hinzufügen
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS provider_id UUID;