
CREATE TABLE public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  target_roles text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  action_url text,
  action_label text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active announcements"
  ON public.system_announcements FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage announcements"
  ON public.system_announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES public.system_announcements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dismissals"
  ON public.announcement_dismissals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can dismiss announcements"
  ON public.announcement_dismissals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.system_announcements (title, content, type, target_roles, priority, action_url, action_label, expires_at)
VALUES (
  '🚀 Neuer Datenimport verfügbar',
  E'Ab sofort könnt ihr Kundendaten über unseren neuen Import-Assistenten einpflegen (CSV, Excel, vCard, JSON). Eure Kunden werden automatisch über die Datenverarbeitung informiert und können selbst entscheiden, ob sie die kostenlose HufManager KundenApp nutzen möchten.\n\n📋 Datenschutz: Alle importierten Daten werden DSGVO-konform verarbeitet. Eure Kunden erhalten eine Einladung mit transparenter Info zur Datennutzung und können frei entscheiden.\n\n👉 Jetzt Kunden importieren und einladen!',
  'important',
  ARRAY['provider', 'partner', 'portal', 'stallbetreiber'],
  10,
  '/management/import',
  'Zum Import Center',
  now() + interval '30 days'
);
