ALTER TABLE public.horse_vaccinations 
ADD COLUMN IF NOT EXISTS vet_clinic text,
ADD COLUMN IF NOT EXISTS vet_address text,
ADD COLUMN IF NOT EXISTS vaccine_manufacturer text,
ADD COLUMN IF NOT EXISTS application_site text;

COMMENT ON COLUMN public.horse_vaccinations.vet_clinic IS 'Praxis / Klinik name';
COMMENT ON COLUMN public.horse_vaccinations.vet_address IS 'Praxis address';
COMMENT ON COLUMN public.horse_vaccinations.vaccine_manufacturer IS 'Impfstoff-Hersteller';
COMMENT ON COLUMN public.horse_vaccinations.application_site IS 'Applikationsort';