
-- Funktion: Standard-Presets anlegen basierend auf profession_type
CREATE OR REPLACE FUNCTION public.create_default_service_presets(_provider_id uuid, _profession_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Nur anlegen wenn noch keine Presets existieren
  IF EXISTS (SELECT 1 FROM public.service_time_presets WHERE provider_id = _provider_id) THEN
    RETURN;
  END IF;

  CASE _profession_type
    WHEN 'hoof_care' THEN
      INSERT INTO public.service_time_presets (provider_id, service_type, estimated_minutes, buffer_minutes, color_hex) VALUES
        (_provider_id, 'Barhuf', 45, 15, '#F5970A'),
        (_provider_id, 'Eisen', 60, 15, '#E67E22'),
        (_provider_id, 'Kleben', 75, 20, '#D35400'),
        (_provider_id, 'Beratung', 30, 10, '#F39C12');
    WHEN 'osteopath' THEN
      INSERT INTO public.service_time_presets (provider_id, service_type, estimated_minutes, buffer_minutes, color_hex) VALUES
        (_provider_id, 'Erstbehandlung', 90, 20, '#27AE60'),
        (_provider_id, 'Kontrolle', 60, 15, '#2ECC71');
    WHEN 'physiotherapist' THEN
      INSERT INTO public.service_time_presets (provider_id, service_type, estimated_minutes, buffer_minutes, color_hex) VALUES
        (_provider_id, 'Behandlung', 60, 15, '#2980B9'),
        (_provider_id, 'Ersttermin', 75, 20, '#3498DB');
    WHEN 'dentist' THEN
      INSERT INTO public.service_time_presets (provider_id, service_type, estimated_minutes, buffer_minutes, color_hex) VALUES
        (_provider_id, 'Kontrolle', 45, 15, '#8E44AD'),
        (_provider_id, 'Behandlung', 60, 20, '#9B59B6');
    ELSE
      -- Default für alle anderen
      INSERT INTO public.service_time_presets (provider_id, service_type, estimated_minutes, buffer_minutes, color_hex) VALUES
        (_provider_id, 'Standard', 60, 15, '#F5970A'),
        (_provider_id, 'Ersttermin', 90, 20, '#E67E22');
  END CASE;
END;
$$;
