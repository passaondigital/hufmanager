-- 1. Konversations-Sessions
CREATE TABLE IF NOT EXISTS hufi_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Neues Gespräch',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_conv_own" ON hufi_conversations USING (auth.uid() = user_id);

-- 2. Konversations-Nachrichten
CREATE TABLE IF NOT EXISTS hufi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES hufi_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_msg_own" ON hufi_messages USING (auth.uid() = user_id);

-- 3. FAQ
CREATE TABLE IF NOT EXISTS hufi_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hufi_faq_read" ON hufi_faq FOR SELECT USING (active = true);
CREATE POLICY "hufi_faq_admin" ON hufi_faq USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Onboarding in profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- 5. Pferdeakten-Vollständigkeit
CREATE TABLE IF NOT EXISTS horse_completeness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  missing_fields JSONB DEFAULT '[]',
  last_reminder_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(horse_id, user_id)
);
ALTER TABLE horse_completeness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horse_comp_own" ON horse_completeness USING (auth.uid() = user_id);

-- FAQ Seed
INSERT INTO hufi_faq (category, question, answer, sort_order) VALUES
('erste_schritte','Was ist Hufi?','Hufi ist dein persönlicher KI-Assistent für alles rund ums Pferd. Er kennt dich, deine Pferde, dein Business und die Pferdewelt. Hufi übernimmt Terminplanung, Pferdeakten, Kundenkommunikation, Rechnungen und informiert dich proaktiv.',1),
('erste_schritte','Wie richte ich Hufi ein?','Beim ersten Start führt dich Hufi durch ein kurzes Gespräch – er fragt nach deinem Namen, deiner Rolle und deinen Pferden. Das dauert etwa 3 Minuten.',2),
('erste_schritte','Was kann Hufi alles?','Hufi kann: Termine verwalten & Routen optimieren, Pferdeakten anlegen & pflegen, Kunden kommunizieren (WhatsApp, Email), Rechnungen & Angebote erstellen, proaktiv über überfällige Termine informieren und Pferdewissen-Fragen beantworten.',3),
('pferdeakten','Wie lege ich eine Pferdeakte an?','Sag einfach "Hufi, leg eine Akte für [Pferdename] an" oder gehe über Kunden → Pferd hinzufügen.',4),
('pferdeakten','Welche Infos braucht Hufi für eine vollständige Akte?','Stammdaten (Name, Rasse, Geburtsjahr), Gesundheit (Impfungen, Tierarzt), Hufhistorie (letzte Bearbeitung, Rhythmus). Hufi zeigt einen Vollständigkeits-Score 0–100%.',5),
('termine_routen','Wie plant Hufi meine Tagesroute?','Sag "Hufi, plane meine Route für morgen" – Hufi ordnet alle Termine nach minimaler Fahrzeit und gibt dir einen Google Maps Link.',6),
('kommunikation','Kann Hufi WhatsApp-Nachrichten schreiben?','Ja – Hufi erstellt den Text und öffnet WhatsApp mit vorausgefüllter Nachricht. Du entscheidest ob du absendest.',7),
('datenschutz','Wo werden meine Daten gespeichert?','Alle Daten liegen in einer EU-Datenbank (Frankfurt). Kein Drittland-Transfer. Export jederzeit möglich (DSGVO Art. 20).',8),
('datenschutz','Wer hat Zugriff auf meine Pferdeakten?','Nur du und Personen die du explizit einlädst. Kein HufiApp-Mitarbeiter sieht deine Akten ohne deine Erlaubnis.',9),
('abos','Welche Funktionen sind kostenlos?','Basisversion: 1 Nutzer, bis zu 10 Pferde, Basis-Chat, Pferdeakten, Kalender. Hufi Pro: unbegrenzte Pferde, Routen, WhatsApp, persistente Konversationen.',10)
ON CONFLICT DO NOTHING;
