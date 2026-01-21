-- Add street column to contacts table for precise GPS navigation
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS street TEXT;