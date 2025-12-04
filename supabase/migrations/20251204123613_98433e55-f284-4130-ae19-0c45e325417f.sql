-- Create academy_videos table
CREATE TABLE public.academy_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academy_videos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view academy videos
CREATE POLICY "Authenticated users can view academy videos"
ON public.academy_videos
FOR SELECT
TO authenticated
USING (true);

-- Only providers can manage academy videos
CREATE POLICY "Providers can manage academy videos"
ON public.academy_videos
FOR ALL
USING (has_role(auth.uid(), 'provider'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_academy_videos_updated_at
BEFORE UPDATE ON public.academy_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.academy_videos (title, description, category, video_url, thumbnail_url, sort_order) VALUES
('Willkommen bei MemberHorse', 'In diesem Video zeigen wir dir die wichtigsten Funktionen der App.', 'Schnellstart', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 1),
('Deinen ersten Kunden anlegen', 'Schritt-für-Schritt Anleitung zum Anlegen eines neuen Kunden.', 'Schnellstart', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 2),
('Termine effizient planen', 'Lerne, wie du den Kalender optimal nutzt.', 'Schnellstart', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 3),
('Preise richtig kalkulieren', 'Tipps zur Preiskalkulation für Hufbearbeiter.', 'Business Booster', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 1),
('Rechnungen erstellen & versenden', 'So erstellst du professionelle Rechnungen.', 'Business Booster', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 2),
('Finanzen im Überblick', 'Behalte deine Einnahmen und Ausgaben im Blick.', 'Business Booster', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 3),
('Hufgesundheit erkennen', 'Expertenrat zur Erkennung von Hufproblemen.', 'Pferde-Wissen', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 1),
('Barhuf vs. Beschlag', 'Wann ist welche Methode sinnvoll?', 'Pferde-Wissen', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 2),
('Fütterung & Hufgesundheit', 'Der Zusammenhang zwischen Ernährung und Hufen.', 'Pferde-Wissen', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 3);