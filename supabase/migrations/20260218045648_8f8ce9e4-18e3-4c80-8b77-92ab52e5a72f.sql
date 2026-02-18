
-- Glossar-Tabelle für HufManager Feature-Dokumentation
CREATE TABLE public.glossary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'allgemein',
  icon TEXT DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  related_terms TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.glossary_entries ENABLE ROW LEVEL SECURITY;

-- Öffentlich lesbar für alle (Landingpage)
CREATE POLICY "Glossary entries are publicly readable"
  ON public.glossary_entries
  FOR SELECT
  USING (is_published = true);

-- Nur Admins können erstellen/bearbeiten/löschen (via service role oder direkt)
CREATE POLICY "Admins can manage glossary entries"
  ON public.glossary_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger für updated_at
CREATE TRIGGER update_glossary_entries_updated_at
  BEFORE UPDATE ON public.glossary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initiale Glossar-Einträge mit allen HufManager-Funktionen
INSERT INTO public.glossary_entries (term, description, category, icon, tags, related_terms, sort_order) VALUES
-- Kernfunktionen
('Dashboard', 'Das zentrale Cockpit für Provider mit Tagesübersicht, anstehenden Terminen, Quick-Actions und KPIs auf einen Blick.', 'Kernfunktionen', 'LayoutDashboard', ARRAY['übersicht', 'startseite', 'cockpit'], ARRAY['Termine', 'KPIs'], 1),
('Terminverwaltung', 'Erstellen, bearbeiten und verwalten von Hufbearbeitungs-Terminen mit Kalenderansicht, Serienterminen und Gruppenplanung.', 'Kernfunktionen', 'Calendar', ARRAY['kalender', 'buchung', 'planung'], ARRAY['Tourenplanung', 'Kunden'], 2),
('Tourenplanung', 'Intelligente Routenoptimierung für den Arbeitstag mit Drag-and-Drop-Sortierung, Kartenansicht und GPS-Tracking.', 'Kernfunktionen', 'Map', ARRAY['route', 'navigation', 'tour'], ARRAY['Terminverwaltung', 'GPS-Tracking'], 3),
('Kundenverwaltung', 'Zentrale Verwaltung aller Kunden mit Kontaktdaten, Pferdeübersicht, Terminhistorie und Zugriffssteuerung.', 'Kernfunktionen', 'Users', ARRAY['kunden', 'kontakte', 'crm'], ARRAY['Pferdedatenbank', 'Zugriffskontrolle'], 4),
('Pferdedatenbank', 'Umfassende Pferdekartei mit Stammdaten, Huffotos, Behandlungshistorie und medizinischen Notizen.', 'Kernfunktionen', 'Horse', ARRAY['pferde', 'kartei', 'hufe'], ARRAY['Huffotos', 'Behandlungshistorie'], 5),

-- Dokumentation & Fotos
('Huffotos', 'Foto-Dokumentation der Hufe mit Vorher/Nachher-Vergleich, Hufpositionen-Zuordnung und automatischer Galerie.', 'Dokumentation', 'Camera', ARRAY['fotos', 'bilder', 'dokumentation'], ARRAY['Pferdedatenbank', 'Vorher-Nachher-Galerie'], 10),
('Ganganalyse', 'Digitale Gangbild-Analyse mit Video-Upload, Bewertungsfunktion und automatischer Protokollierung.', 'Dokumentation', 'Video', ARRAY['gang', 'bewegung', 'analyse'], ARRAY['Huffotos', 'Befund'], 11),
('Behandlungsprotokoll', 'Digitales Protokoll jeder Behandlung mit Befund, verwendeten Materialien, Unterschrift und PDF-Export.', 'Dokumentation', 'FileText', ARRAY['protokoll', 'befund', 'behandlung'], ARRAY['PDF-Export', 'Unterschrift'], 12),

-- Finanzen
('Rechnungswesen', 'Professionelle Rechnungserstellung mit automatischer Nummerierung, MwSt-Berechnung und PDF-Versand.', 'Finanzen', 'Euro', ARRAY['rechnung', 'faktura', 'abrechnung'], ARRAY['PDF-Export', 'Buchhaltung'], 20),
('Angebotsverwaltung', 'Service-Pakete und Angebote erstellen mit flexibler Preisgestaltung, Bilanz-Tracking und Landingpage-Integration.', 'Finanzen', 'Tag', ARRAY['angebote', 'pakete', 'preise'], ARRAY['Landingpage', 'Services'], 21),
('Buchhaltungsexport', 'Export von Finanzdaten für den Steuerberater mit DATEV-kompatiblem Format und Jahresübersichten.', 'Finanzen', 'Download', ARRAY['export', 'datev', 'steuer'], ARRAY['Rechnungswesen'], 22),

-- Kommunikation
('Nachrichten-System', 'Integriertes Messaging zwischen Provider und Kunden mit Echtzeit-Benachrichtigungen und Konversationshistorie.', 'Kommunikation', 'MessageSquare', ARRAY['chat', 'nachrichten', 'kommunikation'], ARRAY['Push-Benachrichtigungen'], 30),
('Push-Benachrichtigungen', 'Web-Push-Notifications für Terminerinnerungen, neue Nachrichten und wichtige Updates.', 'Kommunikation', 'Bell', ARRAY['push', 'benachrichtigung', 'reminder'], ARRAY['Terminerinnerung'], 31),
('Terminerinnerung', 'Automatische Erinnerungen per Push oder E-Mail mit konfigurierbaren Intervallen (24h, 48h, 1 Woche).', 'Kommunikation', 'Clock', ARRAY['erinnerung', 'reminder', 'automatisch'], ARRAY['Push-Benachrichtigungen', 'Terminverwaltung'], 32),
('Broadcast-System', 'Massen-Nachrichtenversand an ausgewählte Kundengruppen für Ankündigungen und Informationen.', 'Kommunikation', 'Megaphone', ARRAY['broadcast', 'massennachricht', 'ankündigung'], ARRAY['Nachrichten-System'], 33),

-- Team & Mitarbeiter
('Mitarbeiter-Management', 'Verwaltung von Angestellten und Auszubildenden mit Rollen, Berechtigungen und Einsatzplanung.', 'Team', 'UserCheck', ARRAY['mitarbeiter', 'team', 'personal'], ARRAY['Einsatzplanung', 'Berechtigungen'], 40),
('Einsatzplanung', 'Zuweisung von Terminen an Mitarbeiter mit Check-in/Check-out, GPS-Standort und Arbeitszeiterfassung.', 'Team', 'Briefcase', ARRAY['einsatz', 'zuweisung', 'planung'], ARRAY['Mitarbeiter-Management', 'Tourenplanung'], 41),
('Dokumentations-Freigabe', 'Prüfung und Freigabe von Mitarbeiter-Dokumentationen mit Kommentarfunktion und Statusverfolgung.', 'Team', 'FileCheck', ARRAY['freigabe', 'review', 'prüfung'], ARRAY['Behandlungsprotokoll', 'Mitarbeiter-Management'], 42),
('Abwesenheitsverwaltung', 'Urlaubs- und Krankheitsverwaltung mit Antrags-Workflow, Kalenderintegration und Vertretungsplanung.', 'Team', 'CalendarOff', ARRAY['urlaub', 'krank', 'abwesenheit'], ARRAY['Mitarbeiter-Management'], 43),

-- Landingpage & Marketing
('Provider-Landingpage', 'Individuelle, öffentliche Webseite pro Provider mit anpassbarem Design, Services und Kontaktformular.', 'Marketing', 'Globe', ARRAY['landingpage', 'webseite', 'online'], ARRAY['SEO', 'Kontaktformular'], 50),
('SEO-Optimierung', 'Automatische Suchmaschinenoptimierung mit Meta-Tags, strukturierten Daten und semantischem HTML.', 'Marketing', 'Search', ARRAY['seo', 'google', 'suchmaschine'], ARRAY['Provider-Landingpage'], 51),
('Bewertungssystem', 'Kundenbewertungen mit Sterne-Rating, Textreviews, Quellenangabe und Reaktionsfunktion.', 'Marketing', 'Star', ARRAY['bewertung', 'review', 'feedback'], ARRAY['Provider-Landingpage'], 52),
('Lead-ChatBot', 'KI-gestützter Chatbot auf der Landingpage für automatische Kundenanfragen und Terminvorschläge.', 'Marketing', 'Bot', ARRAY['chatbot', 'ki', 'leads'], ARRAY['Kontaktformular', 'Provider-Landingpage'], 53),
('Kontaktformular', 'DSGVO-konformes Kontakt- und Anfrage-Formular mit automatischer Lead-Erfassung und Benachrichtigung.', 'Marketing', 'Mail', ARRAY['kontakt', 'anfrage', 'formular'], ARRAY['Lead-ChatBot', 'Provider-Landingpage'], 54),

-- Schnittstellen & Integrationen  
('PWA (Progressive Web App)', 'Installierbare Web-App mit Offline-Funktionalität, Push-Benachrichtigungen und nativer App-Erfahrung.', 'Technik', 'Smartphone', ARRAY['pwa', 'app', 'mobil', 'offline'], ARRAY['Push-Benachrichtigungen'], 60),
('PDF-Export', 'Generierung professioneller PDFs für Rechnungen, Behandlungsprotokolle und Berichte mit Logo-Integration.', 'Schnittstellen', 'FileDown', ARRAY['pdf', 'export', 'drucken'], ARRAY['Rechnungswesen', 'Behandlungsprotokoll'], 61),
('Kalender-Sync (iCal)', 'Export von Terminen als iCal-Format für die Synchronisation mit Google Calendar, Apple Calendar etc.', 'Schnittstellen', 'CalendarSync', ARRAY['ical', 'kalender', 'sync', 'google'], ARRAY['Terminverwaltung'], 62),
('QR-Code-System', 'QR-Codes für Pferdeprofile, Terminbestätigungen und schnellen Datenzugriff vor Ort.', 'Schnittstellen', 'QrCode', ARRAY['qr', 'code', 'scan'], ARRAY['Pferdedatenbank'], 63),
('GPS-Tracking', 'Standortbasierte Funktionen für Check-in am Einsatzort, Entfernungsberechnung und Fahrkostenabrechnung.', 'Schnittstellen', 'MapPin', ARRAY['gps', 'standort', 'tracking'], ARRAY['Tourenplanung', 'Einsatzplanung'], 64),
('CopeCart-Integration', 'Anbindung an CopeCart für Zahlungsabwicklung, Abo-Management und automatische Lizenzfreischaltung.', 'Schnittstellen', 'CreditCard', ARRAY['copecart', 'zahlung', 'abo'], ARRAY['Rechnungswesen'], 65),
('Stripe-Integration', 'Payment-Gateway für Online-Zahlungen mit automatischer Rechnungsstellung und Webhook-Verarbeitung.', 'Schnittstellen', 'CreditCard', ARRAY['stripe', 'zahlung', 'online'], ARRAY['Rechnungswesen', 'CopeCart-Integration'], 66),

-- Kunden-Portal
('Kunden-Portal', 'Eigenständiger Bereich für Pferdebesitzer mit Terminübersicht, Pferdekartei und Dokumentenzugriff.', 'Kunden-Portal', 'Home', ARRAY['kundenportal', 'pferdebesitzer', 'client'], ARRAY['Kundenverwaltung', 'Zugriffskontrolle'], 70),
('Zugriffskontrolle', 'Granulare Berechtigungssteuerung: Welcher Kunde welchem Provider Zugriff auf Pferdedaten gewährt.', 'Kunden-Portal', 'Shield', ARRAY['zugriff', 'berechtigung', 'datenschutz'], ARRAY['Kunden-Portal', 'DSGVO'], 71),
('Kunden-Rechnungen', 'Rechnungsübersicht für Kunden mit Download-Funktion, Zahlungsstatus und Zahlungshistorie.', 'Kunden-Portal', 'Receipt', ARRAY['rechnung', 'kunde', 'zahlung'], ARRAY['Rechnungswesen', 'Kunden-Portal'], 72),

-- Admin & System
('Mission Control', 'Zentrale Administrations-Suite für Master-Admins mit Provider-Verwaltung, KPIs und System-Tools.', 'Administration', 'Shield', ARRAY['admin', 'verwaltung', 'steuerung'], ARRAY['Feature-Flags', 'Versionsverwaltung'], 80),
('Feature-Flags', 'Granulare Modul-Steuerung mit vier Status-Stufen (disabled, beta, early_access, public) pro Provider.', 'Administration', 'Sparkles', ARRAY['feature', 'flag', 'rollout', 'modul'], ARRAY['Mission Control'], 81),
('Versionsverwaltung', 'PWA-Cache-Management mit Force-Update-Funktion und Changelog-Verwaltung.', 'Administration', 'Download', ARRAY['version', 'update', 'cache'], ARRAY['PWA (Progressive Web App)', 'Mission Control'], 82),
('Hilfe-Center', 'Integriertes Knowledge-Base mit rollenbasierten Artikeln, Suchfunktion und Presenter-Modus.', 'Administration', 'HelpCircle', ARRAY['hilfe', 'faq', 'wissen'], ARRAY['Mission Control'], 83),
('DSGVO-Konformität', 'Datenschutz-Tools mit Cookie-Consent, AVV-Unterzeichnung, Datenexport und Löschfunktionen.', 'Rechtliches', 'Lock', ARRAY['dsgvo', 'datenschutz', 'gdpr', 'privacy'], ARRAY['Zugriffskontrolle', 'Impressum'], 90),
('Glossar', 'Umfassendes, selbst-aktualisierendes Nachschlagewerk aller HufManager-Funktionen und Begriffe.', 'Administration', 'BookOpen', ARRAY['glossar', 'lexikon', 'nachschlagewerk'], ARRAY['Hilfe-Center'], 84);
