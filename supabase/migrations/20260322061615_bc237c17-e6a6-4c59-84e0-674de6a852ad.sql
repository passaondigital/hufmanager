
-- Community Milestones table
CREATE TABLE public.pferdeakte_community_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_count integer NOT NULL,
  title text NOT NULL,
  description text,
  icon text DEFAULT '🏆',
  reached_at timestamptz,
  celebration_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pferdeakte_community_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read milestones"
  ON public.pferdeakte_community_milestones
  FOR SELECT TO authenticated
  USING (true);

-- Seed milestone targets
INSERT INTO public.pferdeakte_community_milestones (target_count, title, description, icon, celebration_message) VALUES
  (1000, '1.000 Pferdeakten', 'Der erste große Meilenstein – 1.000 Pferde digital dokumentiert!', '🎯', 'Die Community wächst! 1.000 Pferdeakten im System!'),
  (5000, '5.000 Pferdeakten', 'Ein ganzes Netzwerk entsteht – 5.000 Pferde im System.', '🔥', '5.000 Pferdeakten – wir werden zum Standard!'),
  (10000, '10.000 Pferdeakten', 'Fünfstellig! Die Pferdeakte wird zum Branchen-Tool.', '🚀', '10.000 Pferdeakten – der Durchbruch!'),
  (25000, '25.000 Pferdeakten', 'Ein Viertel des Weges zu 100K – Verbände nehmen Notiz.', '⭐', '25.000 Pferdeakten – Verbände horchen auf!'),
  (50000, '50.000 Pferdeakten', 'Halbzeit auf dem Weg zu 100.000 – die Pferdeakte ist etabliert.', '🏅', '50.000 Pferdeakten – halb Deutschland ist dabei!'),
  (100000, '100.000 Pferdeakten', 'Sechsstellig – die Pferdeakte ist der DACH-Standard.', '👑', '100.000 Pferdeakten – offizieller DACH-Standard!'),
  (250000, '250.000 Pferdeakten', 'Viertelmillion – Behörden und Vereine erkennen uns an.', '🌟', '250.000 Pferdeakten – offiziell anerkannt!'),
  (500000, '500.000 Pferdeakten', 'Halbzeit zur Million – ein halbes Land dokumentiert digital.', '💎', '500.000 Pferdeakten – die Hälfte ist geschafft!'),
  (1000000, '1 Million Pferdeakten', 'MISSION COMPLETE – 1.000.000 Pferdeakten. Nationaler Standard.', '🏆', '1 MILLION PFERDEAKTEN – WIR HABEN GESCHICHTE GESCHRIEBEN!');

-- Global stats view (counts all horses across all users)
CREATE OR REPLACE VIEW public.pferdeakte_global_stats AS
SELECT 
  count(*) AS total_pferdeakten,
  count(DISTINCT owner_id) AS total_besitzer,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new_last_7_days,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_last_30_days
FROM public.horses
WHERE deleted_at IS NULL;

-- Allow authenticated users to read global stats
GRANT SELECT ON public.pferdeakte_global_stats TO authenticated;
