-- Create enum for role access
CREATE TYPE public.help_article_role_access AS ENUM ('all', 'pid_only', 'kid_only');

-- Create help_articles table
CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  role_access public.help_article_role_access NOT NULL DEFAULT 'all',
  tags TEXT[] DEFAULT '{}',
  -- Presenter-View fields (Hook, Solution, CTA)
  hook TEXT,
  solution_steps TEXT[],
  call_to_action TEXT,
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Everyone can read articles (filtered by role in app logic)
CREATE POLICY "Anyone can view help articles"
ON public.help_articles
FOR SELECT
USING (true);

-- Only admins can manage articles
CREATE POLICY "Admins can manage help articles"
ON public.help_articles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_help_articles_updated_at
BEFORE UPDATE ON public.help_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for search
CREATE INDEX idx_help_articles_category ON public.help_articles(category);
CREATE INDEX idx_help_articles_tags ON public.help_articles USING GIN(tags);
CREATE INDEX idx_help_articles_role_access ON public.help_articles(role_access);

-- Insert seed data with help articles
INSERT INTO public.help_articles (title, content, category, role_access, tags, hook, solution_steps, call_to_action, sort_order, is_featured) VALUES

-- Erste Schritte
('Dein Profil einrichten', 
'## So richtest du dein Profil ein

1. Gehe zu **Management** → **Profil**
2. Lade dein Logo/Profilbild hoch
3. Fülle deine Geschäftsdaten aus:
   - Firmenname & Adresse
   - Telefon & E-Mail
   - Steuernummer/USt-ID
4. Speichere die Änderungen

**Tipp:** Dein Logo erscheint automatisch auf Rechnungen und deiner Landing-Page!',
'Erste Schritte', 'pid_only', 
ARRAY['Profil', 'Einstellungen', 'Logo', 'Start', 'Setup'],
'Nervt es dich, dass deine Rechnungen unpersönlich aussehen?',
ARRAY['Öffne Management → Profil', 'Lade dein Logo hoch', 'Fülle Geschäftsdaten aus', 'Speichern – fertig!'],
'Richte jetzt dein Profil ein und wirke professioneller!',
1, true),

('Dein Fahrzeug anlegen',
'## Fahrzeug für die Tourenplanung einrichten

1. Gehe zu **Work-Mode** → **Fahrzeuge**
2. Klicke auf "Fahrzeug hinzufügen"
3. Gib ein:
   - Fahrzeugname (z.B. "Sprinter")
   - Kennzeichen
   - Aktueller Tachostand
4. Speichern

**Warum?** Damit werden deine gefahrenen Kilometer automatisch für die Steuer dokumentiert.',
'Erste Schritte', 'pid_only',
ARRAY['Fahrzeug', 'Auto', 'Kilometer', 'Tacho', 'Tour'],
'Trackt du deine Kilometer noch per Hand? Das kostet Zeit!',
ARRAY['Öffne Work-Mode → Fahrzeuge', 'Klicke "Fahrzeug hinzufügen"', 'Kennzeichen & Tachostand eingeben', 'Speichern'],
'Leg dein Fahrzeug an und lass die App die Kilometer tracken!',
2, false),

-- Workflow (5 A's)
('Die 5 A''s verstehen',
'## Der HufManager Workflow: Anfrage → Aufnahme → Auffassen → Angebot → Analyse

**1. Anfrage** 📨
Kunden stellen Anfragen über deine Landing-Page. Du siehst sie im Dashboard.

**2. Aufnahme** 🐴
Hier legst du Pferde und Kunden an. Das "Patientenblatt" des Pferdes.

**3. Auffassen** 📝
Nach dem Termin: Notizen, Fotos und Befunde dokumentieren.

**4. Angebot** 💰
Erstelle Angebote für deine Leistungen mit deinem Katalog.

**5. Analyse** 📊
Statistiken, Rechnungen und Berichte – dein Business-Cockpit.

Dieser Flow spart dir Zeit und hält alles organisiert!',
'Workflow', 'pid_only',
ARRAY['5A', 'Workflow', 'Anfrage', 'Aufnahme', 'Auffassen', 'Angebot', 'Analyse', 'Prozess'],
'Verlierst du den Überblick zwischen Terminen und Papierkram?',
ARRAY['Anfrage: Kundenanfragen sammeln', 'Aufnahme: Pferd & Kunde anlegen', 'Auffassen: Termin dokumentieren', 'Angebot: Leistungen bepreisen', 'Analyse: Auswerten & Rechnung'],
'Folge dem 5-A-Workflow und arbeite strukturiert!',
10, true),

-- HufCam
('HufCam Pro: Der Foto-Wizard',
'## Professionelle Huf-Fotos in Sekunden

**So nutzt du HufCam Pro:**

1. Öffne **HufCam Pro** (Kamera-Icon)
2. Wähle das Pferd aus
3. Folge dem **Wizard**:
   - VL → VR → HL → HR (alle 4 Hufe)
   - Der Assistent sagt dir, welcher Huf dran ist
4. Fotos werden automatisch sortiert & benannt

**Collage erstellen:**
- Nach dem Shooting: Klicke "Collage"
- Wähle Vorher/Nachher-Bilder
- Exportiere als Bild für den Kunden

**Pro-Tipp:** Nutze gutes Licht und halte das Handy parallel zum Huf!',
'HufCam', 'pid_only',
ARRAY['HufCam', 'Fotos', 'Kamera', 'Wizard', 'Collage', 'Dokumentation', 'Bilder'],
'Suchst du nach dem Termin ewig nach den richtigen Huf-Fotos?',
ARRAY['HufCam Pro öffnen', 'Pferd auswählen', 'Wizard folgen: VL → VR → HL → HR', 'Collage erstellen', 'Exportieren & teilen'],
'Starte jetzt einen HufCam-Durchlauf beim nächsten Termin!',
20, true),

('Vorher-Nachher Vergleich erstellen',
'## Zeige deinen Kunden den Fortschritt

1. Öffne das Pferd → **Entwicklung**
2. Klicke "Neuer Vergleich"
3. Wähle:
   - **Vorher-Bild** (älteres Foto)
   - **Nachher-Bild** (aktuelles Foto)
4. Der Slider zeigt den Unterschied

**Teilen:**
- Screenshot machen oder
- "Exportieren" für Social Media

Kunden lieben es, den Fortschritt zu sehen!',
'HufCam', 'pid_only',
ARRAY['Vergleich', 'Vorher', 'Nachher', 'Fortschritt', 'Slider', 'Entwicklung'],
'Kunden fragen: Hat sich überhaupt was verbessert?',
ARRAY['Pferd → Entwicklung öffnen', 'Neuer Vergleich klicken', 'Vorher & Nachher Bild wählen', 'Mit Slider vergleichen', 'Screenshot oder Export'],
'Erstelle nach dem nächsten Termin einen Vorher-Nachher-Vergleich!',
21, false),

-- Navigation & Tour
('Tour planen & navigieren',
'## Deine Tages-Tour effizient planen

**Tour vorbereiten:**
1. Öffne **Tour** im Menü
2. Wähle das Datum
3. Deine Termine werden auf der Karte angezeigt
4. Ziehe die Karten, um die Reihenfolge zu ändern

**Unterwegs:**
- Klicke "Navigation starten" → Google Maps öffnet sich
- Nach Ankunft: "Als fertig markieren"
- Deine Route wird aufgezeichnet (Breadcrumbs)

**Am Abend:**
- Sieh dir die gefahrene Strecke im Replay an
- Exportiere den Tour-Nachweis als PDF',
'Navigation', 'pid_only',
ARRAY['Tour', 'Navigation', 'Maps', 'Route', 'Planung', 'GPS', 'Kilometer'],
'Planst du deine Route noch per Zettel?',
ARRAY['Tour öffnen', 'Datum wählen', 'Reihenfolge per Drag & Drop', 'Navigation starten', 'Termine abhaken'],
'Plane morgen deine erste Tour digital!',
30, true),

('Tachostand dokumentieren',
'## Kilometernachweis für die Steuer

**Beim Start:**
1. Öffne **Work-Mode**
2. Fotografiere deinen Tachostand
3. Die App erkennt den km-Stand automatisch (OCR)

**Am Ende:**
- Wieder ein Foto machen
- Die Differenz wird berechnet

**Export:**
- Monatsübersicht als PDF
- Perfekt für die Steuererklärung!',
'Navigation', 'pid_only',
ARRAY['Tacho', 'Kilometer', 'Steuer', 'Fahrtenbuch', 'OCR', 'Dokumentation'],
'Schreibst du km-Stände noch auf Zettel?',
ARRAY['Work-Mode öffnen', 'Tacho fotografieren', 'OCR erkennt km-Stand', 'Am Ende: nochmal fotografieren', 'Differenz automatisch berechnet'],
'Fotografiere morgen früh deinen Tachostand!',
31, false),

-- Finanzen
('ZUGFeRD Rechnung erstellen',
'## Professionelle E-Rechnungen in 2 Minuten

1. Gehe zu **Rechnungen** → "Neue Rechnung"
2. Wähle den Kunden
3. Füge Leistungen hinzu (aus deinem Katalog)
4. Klicke **"ZUGFeRD erstellen"**

**Das Besondere:**
- ZUGFeRD ist der Standard für E-Rechnungen
- Enthält maschinenlesbare Daten
- Vom Finanzamt anerkannt
- Kunden können es direkt importieren

**Versand:**
- Per E-Mail direkt aus der App
- Oder als PDF downloaden',
'Finanzen', 'pid_only',
ARRAY['Rechnung', 'ZUGFeRD', 'E-Rechnung', 'PDF', 'Geld', 'Buchhaltung'],
'E-Rechnungen klingen kompliziert? Sind sie nicht!',
ARRAY['Rechnungen → Neue Rechnung', 'Kunde wählen', 'Leistungen hinzufügen', 'ZUGFeRD erstellen klicken', 'Per E-Mail versenden'],
'Erstelle deine erste E-Rechnung – in 2 Minuten!',
40, true),

('DATEV-Export für den Steuerberater',
'## Buchhaltung in Sekunden übertragen

1. Gehe zu **Analyse** → **DATEV Export**
2. Wähle den Zeitraum (z.B. Monat/Quartal)
3. Klicke "Exportieren"
4. Du erhältst eine CSV-Datei

**So geht''s weiter:**
- Schicke die Datei an deinen Steuerberater
- Er importiert sie direkt in DATEV
- Fertig – kein Abtippen mehr!

**Tipp:** Mache den Export am Monatsende zur Routine.',
'Finanzen', 'pid_only',
ARRAY['DATEV', 'Steuerberater', 'Export', 'Buchhaltung', 'CSV', 'Steuer'],
'Dein Steuerberater will immer dieselben Daten?',
ARRAY['Analyse → DATEV Export', 'Zeitraum wählen', 'Exportieren klicken', 'CSV an Steuerberater schicken', 'Import in DATEV'],
'Exportiere am Monatsende deine Daten für den Steuerberater!',
41, false),

-- Für Kunden (kid)
('Deine Termine einsehen',
'## So siehst du deine gebuchten Termine

1. Öffne die **HufManager App**
2. Auf der Startseite siehst du:
   - Deinen nächsten Termin
   - Alle kommenden Termine

**Details anzeigen:**
- Tippe auf einen Termin
- Du siehst: Datum, Uhrzeit, Pferd, Leistung

**Benachrichtigungen:**
- Du wirst 24h vorher erinnert
- Bei Änderungen bekommst du eine Push-Nachricht

Bei Fragen: Nutze den Chat mit deinem Hufbearbeiter!',
'Für Kunden', 'kid_only',
ARRAY['Termine', 'Kalender', 'Buchung', 'Erinnerung', 'Benachrichtigung'],
'Wann war nochmal der nächste Termin?',
ARRAY['App öffnen', 'Startseite zeigt nächsten Termin', 'Auf Termin tippen für Details', 'Push-Benachrichtigung aktivieren'],
'Schau jetzt nach, wann dein nächster Termin ist!',
50, true),

('Rechnungen herunterladen',
'## Deine Rechnungen im Überblick

1. Gehe zu **Rechnungen** im Menü
2. Du siehst alle deine Rechnungen
3. Klicke auf eine Rechnung zum Öffnen
4. **Download:** Tippe auf das PDF-Symbol

**Status:**
- 🟢 Bezahlt
- 🟡 Offen
- 🔴 Überfällig

**Tipp:** Speichere die PDFs für deine Unterlagen!',
'Für Kunden', 'kid_only',
ARRAY['Rechnung', 'Download', 'PDF', 'Zahlung', 'Geld'],
'Wo finde ich meine Rechnungen?',
ARRAY['Rechnungen im Menü öffnen', 'Rechnung auswählen', 'PDF-Symbol für Download', 'Auf dem Handy speichern'],
'Lade deine letzte Rechnung herunter!',
51, false),

('Dein Pferd im Blick',
'## Alle Infos zu deinem Pferd

1. Gehe zu **Meine Pferde**
2. Wähle dein Pferd
3. Du siehst:
   - **Steckbrief:** Grunddaten, Foto
   - **Historie:** Alle bisherigen Termine
   - **Dokumente:** Befunde & Berichte

**Teilen:**
- Der Hufbearbeiter kann Fotos und Notizen für dich freigeben
- Du siehst den Fortschritt über die Zeit

Fragen? Nutze den Chat!',
'Für Kunden', 'kid_only',
ARRAY['Pferd', 'Steckbrief', 'Historie', 'Dokumente', 'Fotos'],
'Möchtest du wissen, was beim letzten Termin gemacht wurde?',
ARRAY['Meine Pferde öffnen', 'Pferd auswählen', 'Steckbrief & Historie ansehen', 'Freigegebene Dokumente prüfen'],
'Schau dir jetzt das Profil deines Pferdes an!',
52, false),

-- Allgemein
('Offline-Modus nutzen',
'## Kein Internet? Kein Problem!

**Was funktioniert offline:**
- Termine anzeigen
- Fotos aufnehmen (werden später synchronisiert)
- Notizen schreiben
- Kundendaten einsehen

**Was passiert bei Wiederverbindung:**
- Alle Daten werden automatisch synchronisiert
- Du siehst einen Sync-Indikator

**Anzeige:**
- Oben erscheint "Offline" wenn keine Verbindung
- Daten mit ⏳ warten auf Sync

Arbeite einfach weiter – die App kümmert sich um den Rest!',
'Allgemein', 'all',
ARRAY['Offline', 'Internet', 'Sync', 'Verbindung', 'Synchronisierung'],
'Was mache ich ohne Internetempfang auf der Weide?',
ARRAY['Einfach weiterarbeiten', 'Fotos & Notizen werden gespeichert', 'Bei Verbindung: Auto-Sync', 'Offline-Anzeige beachten'],
'Teste den Offline-Modus: Schalte kurz den Flugmodus ein!',
60, false),

('Push-Benachrichtigungen einrichten',
'## Verpasse keinen Termin mehr

1. Beim ersten App-Start: "Benachrichtigungen erlauben"
2. Falls verpasst: **Profil** → **Benachrichtigungen**
3. Aktiviere:
   - Terminerinnerungen (24h/1h vorher)
   - Neue Nachrichten
   - Statusänderungen

**Nicht gestört werden?**
- Nutze "Bitte nicht stören" auf deinem Handy
- Oder deaktiviere einzelne Typen in der App

Tipp: Erlaube Benachrichtigungen für wichtige Erinnerungen!',
'Allgemein', 'all',
ARRAY['Push', 'Benachrichtigung', 'Erinnerung', 'Notification', 'Termin'],
'Vergisst du manchmal Termine?',
ARRAY['Benachrichtigungen erlauben', 'In Profil → Benachrichtigungen prüfen', 'Gewünschte Typen aktivieren', 'Nie mehr vergessen!'],
'Aktiviere jetzt Push-Benachrichtigungen!',
61, false);