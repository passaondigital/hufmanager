-- ============================================================
-- HUFI BRAIN: Wissenssystem-Tabellen + Seed-Daten
-- Migration: 20260514210000_hufi_brain.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABELLE 1: hufi_professions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_professions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_alternatives TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  work_location TEXT NOT NULL DEFAULT 'both',
  environment TEXT DEFAULT 'both',
  delivery TEXT DEFAULT 'offline',
  team_sizes TEXT[] DEFAULT '{}',
  scopes TEXT[] DEFAULT '{}',
  pricing_models TEXT[] DEFAULT '{}',
  typical_services TEXT[] DEFAULT '{}',
  typical_clients TEXT[] DEFAULT '{}',
  key_tools TEXT[] DEFAULT '{}',
  common_problems TEXT[] DEFAULT '{}',
  seasonal_patterns TEXT[] DEFAULT '{}',
  hufi_tips TEXT[] DEFAULT '{}',
  relevant_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hufi_professions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_prof_read" ON hufi_professions;
DROP POLICY IF EXISTS "hufi_prof_admin" ON hufi_professions;
CREATE POLICY "hufi_prof_read" ON hufi_professions FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_prof_admin" ON hufi_professions USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ────────────────────────────────────────────────────────────
-- TABELLE 2: hufi_horse_breeds
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_horse_breeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  aliases TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  origin TEXT,
  characteristics TEXT[] DEFAULT '{}',
  common_uses TEXT[] DEFAULT '{}',
  health_notes TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE hufi_horse_breeds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_breeds_read" ON hufi_horse_breeds;
DROP POLICY IF EXISTS "hufi_breeds_admin" ON hufi_horse_breeds;
CREATE POLICY "hufi_breeds_read" ON hufi_horse_breeds FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_breeds_admin" ON hufi_horse_breeds USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ────────────────────────────────────────────────────────────
-- TABELLE 3: hufi_health_conditions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_health_conditions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_latin TEXT,
  aliases TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  symptoms TEXT[] DEFAULT '{}',
  hoof_relevance TEXT,
  urgency TEXT DEFAULT 'medium',
  description TEXT,
  treatment_notes TEXT,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE hufi_health_conditions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_conditions_read" ON hufi_health_conditions;
DROP POLICY IF EXISTS "hufi_conditions_admin" ON hufi_health_conditions;
CREATE POLICY "hufi_conditions_read" ON hufi_health_conditions FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_conditions_admin" ON hufi_health_conditions USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ────────────────────────────────────────────────────────────
-- TABELLE 4: hufi_equipment
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  description TEXT,
  for_roles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE hufi_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_equip_read" ON hufi_equipment;
DROP POLICY IF EXISTS "hufi_equip_admin" ON hufi_equipment;
CREATE POLICY "hufi_equip_read" ON hufi_equipment FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_equip_admin" ON hufi_equipment USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ────────────────────────────────────────────────────────────
-- TABELLE 5: hufi_terminology
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_terminology (
  id TEXT PRIMARY KEY,
  term_de TEXT NOT NULL,
  term_en TEXT,
  term_latin TEXT,
  definition TEXT NOT NULL,
  category TEXT NOT NULL,
  related_terms TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE hufi_terminology ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_term_read" ON hufi_terminology;
DROP POLICY IF EXISTS "hufi_term_admin" ON hufi_terminology;
CREATE POLICY "hufi_term_read" ON hufi_terminology FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_term_admin" ON hufi_terminology USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_hufi_term_de ON hufi_terminology (lower(term_de));

-- ────────────────────────────────────────────────────────────
-- TABELLE 6: hufi_keywords
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hufi_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  language TEXT DEFAULT 'de',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(keyword, entity_type, entity_id)
);
ALTER TABLE hufi_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hufi_kw_read" ON hufi_keywords;
DROP POLICY IF EXISTS "hufi_kw_admin" ON hufi_keywords;
CREATE POLICY "hufi_kw_read" ON hufi_keywords FOR SELECT USING (is_active = true);
CREATE POLICY "hufi_kw_admin" ON hufi_keywords USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_hufi_kw_keyword ON hufi_keywords (lower(keyword));
CREATE INDEX IF NOT EXISTS idx_hufi_kw_entity ON hufi_keywords (entity_type, entity_id);

-- ────────────────────────────────────────────────────────────
-- profiles ALTER: Berufsprofil-Felder
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profession_slug TEXT,
  ADD COLUMN IF NOT EXISTS work_location TEXT[],
  ADD COLUMN IF NOT EXISTS work_structure TEXT,
  ADD COLUMN IF NOT EXISTS work_scale TEXT,
  ADD COLUMN IF NOT EXISTS work_environment TEXT[],
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS business_size TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[],
  ADD COLUMN IF NOT EXISTS horse_breeds_specialty TEXT[],
  ADD COLUMN IF NOT EXISTS service_area_radius_km INT,
  ADD COLUMN IF NOT EXISTS service_area_description TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_profession_done BOOLEAN DEFAULT false;

-- ============================================================
-- SEED: hufi_professions (25 Berufe)
-- ============================================================

INSERT INTO hufi_professions (id, name, name_alternatives, category, work_location, environment, delivery, team_sizes, scopes, pricing_models, typical_services, typical_clients, key_tools, common_problems, seasonal_patterns, hufi_tips, relevant_keywords, sort_order) VALUES

('hufbearbeiter', 'Hufbearbeiter (mobil)', ARRAY['Hufpfleger','Barhufpfleger','Hoof Trimmer','Natural Hoof Care Practitioner','NHCP'], 'huf', 'mobile', 'outdoor', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional'], ARRAY['per_session','subscription'],
  ARRAY['Barhuf-Bearbeitung','Hufkorrektur','Balancecheck','Hufrehab','Hufpflege-Coaching','Dokumentation'],
  ARRAY['Pferdebesitzer','Reiterhöfe','Pensionsställe','Gestüte'],
  ARRAY['Hufkratzer','Hufmesser','Raspel','Hufzange','Winkelmaß','Huforthese','Lederschürze','Kamera'],
  ARRAY['Terminausfall kurzfristig','Wetter (Regen, Frost, Hitze)','Schwer erreichbare Kunden','Pferde die nicht halten','Offene Rechnungen','Tourenplanung'],
  ARRAY['Winter: Frost erschwert Arbeit','Frühjahr: Weideumstellung → Rehegefahr','Sommer: Hitze und harte Böden','Herbst: Viele Kunden vor Winter'],
  ARRAY['Tourenoptimierung ist bares Geld','Fotos vor/nach dokumentieren','Erinnerungs-WhatsApp 1 Woche vor Termin','Abo-Modell sichert planbare Einnahmen'],
  ARRAY['huf','hufpflege','bearbeitung','barhuf','trimmen','raspel','hufmesser','hufpfleger','naturhuf','barfoot','nhcp'],
  10),

('hufschmied', 'Hufschmied', ARRAY['Beschlagschmied','Farrier','Equine Farrier','Hufbeschlag'], 'huf', 'mobile', 'outdoor', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional'], ARRAY['per_session','flat_rate'],
  ARRAY['Hufbeschlag kalt/warm','Beschlagkorrektur','Orthopädischer Beschlag','Eisen anfertigen','Klebeisen','Notbeschlag','Gleitschutz'],
  ARRAY['Sportpferdebesitzer','Rennställe','Turnierpferde','Arbeitspferde','Pensionsställe'],
  ARRAY['Mobile Esse','Amboss','Hammer','Hufnägel','Hufeisen alle Größen','Raspel','Hufmesser','Lederschürze'],
  ARRAY['Hoher Invest in Werkzeug','Körperlich sehr belastend','Terminplanung komplex','Notfälle unterbrechen Tour','Wetterabhängigkeit'],
  ARRAY['Winter: Gleitschutznieten gefragt','Turniersaison Frühjahr-Herbst: Mehr Eil-Aufträge','Sommer: Harte Böden mehr Verschleiß'],
  ARRAY['Notfallslots freihalten für verlorene Eisen','Turnierpferde-Kunden binden','Digitale Rechnung sofort nach Termin'],
  ARRAY['schmied','beschlag','hufeisen','eisen','farrier','nagel','amboss','beschlagschmied','hufbeschlag','kaltbeschlag','warmbeschlag'],
  20),

('huforthopaedie', 'Huforthopäde', ARRAY['Equine Podologe','Rehabilitations-Hufpfleger','Hoof Rehabilitation Specialist'], 'huf', 'both', 'outdoor', 'offline', ARRAY['solo'], ARRAY['regional','national'], ARRAY['per_session','package'],
  ARRAY['Hufrehabilitation bei Hufrehe','Bockhuf-Korrektur','Chronische Lahmheit','Huforthesen-Anpassung','Zusammenarbeit mit Tierarzt','Ganganalyse'],
  ARRAY['Rehafall-Pferdebesitzer','Tierarzt-Überweisung','Chronisch kranke Pferde'],
  ARRAY['Huforthesen','Messequipment','Kamera für Ganganalyse','Spezialmesser','Softpad-Material'],
  ARRAY['Komplexe Fälle brauchen enge Tierarzt-Koordination','Kunden haben hohe Erwartungen','Lange Behandlungszeiten'],
  ARRAY['Frühjahr: Rehepeaks bei Weideumstellung','Ganzjährig ohne starke Saisonalität'],
  ARRAY['Immer schriftliche Vereinbarung über Reha-Ziele','Fotodoku bei jedem Termin','Mit lokalen Tierärzten Netzwerk aufbauen'],
  ARRAY['orthopädie','reha','rehabilitation','orthese','bockhuf','chronisch','podologie','hufrehab','hufkorrektur'],
  30),

('pferdephysiotherapeut', 'Pferdephysiotherapeut', ARRAY['Equine Physiotherapist','Tierphysiotherapeut Pferd','Pferdephysio'], 'therapie', 'both', 'indoor', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional'], ARRAY['per_session','per_hour','package'],
  ARRAY['Manuelle Therapie','Massage','Myofasziale Behandlung','Dehnübungen','Thermotherapie','TENS/EMS-Therapie','Lasertherapie','Ganganalyse','Rückenbehandlung'],
  ARRAY['Sportpferdebesitzer','Freizeitreiter','Tierarzt-Überweisungen','Rennstallbesitzer'],
  ARRAY['Ultraschallgerät','TENS/EMS-Gerät','Lasertherapiegerät','Massageöle','Wärmepads','Bandagen','Goniometer','Tablet'],
  ARRAY['Versicherungsabrechnung komplex','Tierärztliche Überweisung oft nötig','Kunden erwarten zu schnelle Ergebnisse','Körperlich belastend'],
  ARRAY['Turniersaison: Mehr Nachfrage','Winter: Eher Rehapatienten'],
  ARRAY['Behandlungsberichte immer an den Tierarzt','Besitzer-Coaching steigert Behandlungserfolg','Zertifizierungen sichtbar machen'],
  ARRAY['physio','physiotherapie','massage','manuelle therapie','rücken','muskel','therapie','pferdephysio','kissingspines','rehabilitation'],
  40),

('pferdeosteopath', 'Pferdeosteopath', ARRAY['Equine Osteopath','Animal Osteopath','Ganzheitlicher Tierosteopath'], 'therapie', 'both', 'indoor', 'offline', ARRAY['solo'], ARRAY['regional','national'], ARRAY['per_session','package'],
  ARRAY['Osteopathische Behandlung','Faszienarbeit','Viszerale Osteopathie','Craniosacraler Rhythmus','Strukturelle Behandlung','Integrative Ganzkörperbehandlung'],
  ARRAY['Sportpferdebesitzer','Freizeitreiter','Chronisch kranke Pferde'],
  ARRAY['Dokumentationsapp','Palpationsdiagnostik'],
  ARRAY['Anerkennung gegenüber konventioneller Medizin','Lange Ausbildung'],
  ARRAY['Ganzjährig ähnlich'],
  ARRAY['Fallberichte dokumentieren für eigene Fortbildung','Netzwerk mit Tierärzten und Physios'],
  ARRAY['osteo','osteopathie','faszie','cranio','ganzheitlich','viszerale','pferdeosteo','körperarbeit'],
  50),

('pferdechiropraktiker', 'Pferdechiropraktiker', ARRAY['Equine Chiropractor','Animal Chiropractor','Veterinary Chiropractor'], 'therapie', 'both', 'both', 'offline', ARRAY['solo'], ARRAY['regional'], ARRAY['per_session'],
  ARRAY['Manuelle Wirbelsäulenkorrektur','Gelenkmobilisation','Weichteilbehandlung'],
  ARRAY['Sportpferdebesitzer','Dressur- und Springpferde'],
  ARRAY['Aktivator','Perkussionsgerät'],
  ARRAY['Rechtliche Grauzone','Kurze Behandlungszeit'],
  ARRAY['Turniersaison: Mehr Nachfrage'],
  ARRAY['Klärung rechtlicher Situation im Bundesland','Enge Kooperation mit Tierarzt'],
  ARRAY['chiro','chiropraktik','wirbel','gelenk','justieren','wirbelsäule','chiropraktor'],
  60),

('pferdezahnpfleger', 'Pferdezahnpfleger', ARRAY['Equine Dentist','Equine Dental Technician','Zahnbearbeiter Pferd'], 'medizin', 'mobile', 'indoor', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional'], ARRAY['per_session'],
  ARRAY['Gebissuntersuchung','Zahn-Raspeln manuell/elektrisch','Wolfszahn-Entfernung','Haken abrunden','Wangengeschwür-Behandlung'],
  ARRAY['Pferdebesitzer','Pensionsställe','Rennställe'],
  ARRAY['Mundsperre','Zahnspiegel','elektrische Raspel','manuelle Feilen','Beleuchtungsgerät'],
  ARRAY['Pferde die sich widersetzen','Sedierungsbedarf Tierarzt nötig','Saisonale Häufung'],
  ARRAY['Frühjahr/Herbst: Häufigste Zahnpflege-Termine'],
  ARRAY['Jahres-Erinnerungen pro Pferd automatisieren','Mit Tierarzt für Sedierungen kooperieren'],
  ARRAY['zahn','zähne','gebiss','dental','kiefer','wolfszahn','zahnpfleger','equine dentist','zahnbehandlung'],
  70),

('tierarzt_pferd', 'Tierarzt (Pferd)', ARRAY['Equine Vet','Pferdetierarzt','Equine Veterinarian','Veterinärmediziner'], 'medizin', 'both', 'both', 'offline', ARRAY['solo','small_team','company'], ARRAY['local','regional'], ARRAY['per_session','per_hour'],
  ARRAY['Impfungen','Entwurmung','Kolikuntersuchung','Lahmheitsdiagnostik','Geburtshilfe','Röntgen/Ultraschall','OP','Notfallversorgung'],
  ARRAY['Alle Pferdehalter'],
  ARRAY['Stethoskop','Blutabnahmeequipment','Röntgengerät','Ultraschall','Medikamente','Notfallkoffer'],
  ARRAY['Erreichbarkeit rund um die Uhr','Notfalleinsätze nachts','Abrechnungskomplexität'],
  ARRAY['Frühjahr: Impfungen und Entwurmung','Sommer: Koliken häufiger','Herbst: Entwurmung'],
  ARRAY['Notfallnummern kommunizieren','Kooperationsnetzwerk mit anderen Fachrichtungen'],
  ARRAY['tierarzt','vet','veterinär','impfen','entwurmen','kolik','diagnose','tiermedizin','pferdemedizin'],
  80),

('pferde_heilpraktiker', 'Tierheilpraktiker (Pferd)', ARRAY['Naturheilkunde Pferd','Homöopath Pferd','Ganzheitlicher Pferdetherapeut'], 'medizin', 'both', 'both', 'both', ARRAY['solo'], ARRAY['regional','national'], ARRAY['per_session','package'],
  ARRAY['Homöopathie','Akupunktur','Phytotherapie Kräuter','Bach-Blüten','Bioresonanz','TCM für Pferde','Ernährungsberatung'],
  ARRAY['Ganzheitlich orientierte Pferdebesitzer'],
  ARRAY['Homöopathika','Akupunkturnadeln','Kräuterpräparate','Bioresonanzgerät'],
  ARRAY['Rechtliche Einschränkungen keine Diagnose','Skepsis seitens konventioneller Medizin'],
  ARRAY['Ganzjährig kein stark saisonales Muster'],
  ARRAY['Immer klar: keine Diagnose keine Heilsversprechen','Kooperation mit Tierarzt empfehlen'],
  ARRAY['heilpraktiker','homöopathie','akupunktur','naturheil','TCM','kräuter','ganzheitlich','bachblüten','bioresonanz'],
  90),

('reitlehrer', 'Reitlehrer', ARRAY['Reiterinstruktor','Riding Instructor','Reittrainerin','FN-Trainer'], 'training', 'stationary', 'indoor', 'both', ARRAY['solo','small_team','company'], ARRAY['local','regional'], ARRAY['per_session','package','subscription'],
  ARRAY['Einzel-Reitstunde','Gruppen-Reitstunde','Longierstunde','Dressur-Training','Spring-Training','Anfänger-Kurse','Online-Coaching','Reitkurse/Kliniken'],
  ARRAY['Einsteiger','Fortgeschrittene','Kinder/Jugendliche','Erwachsene','Turniersportler'],
  ARRAY['Longe','Gerte','Mikrofon-Headset','Video-Analyse-App','Cavaletti','Stangen','Hindernisse'],
  ARRAY['Wetterabhängigkeit bei Außenbahn','Kurzfristige Absagen','Schüler-Fluktuation','Haftungsfragen','Hallenzeiten-Konflikte'],
  ARRAY['Sommer: Außenbahn-Saison und Kliniken','Winter: Hallenbetrieb','Turniersaison: Prüfungsvorbereitung'],
  ARRAY['Pakete 10er-Block senken Ausfallquote','WhatsApp-Gruppe für Schüler spart Koordinationsaufwand','Warteliste führen'],
  ARRAY['reitstunde','reiten','trainer','dressur','springen','longe','unterricht','lektion','reitunterricht','reitschule','fn-trainer'],
  100),

('horsemanship_trainer', 'Horsemanship-Trainer', ARRAY['Natural Horsemanship','NH-Trainer','Bodenarbeit-Trainer','Liberty-Trainer'], 'training', 'both', 'outdoor', 'both', ARRAY['solo'], ARRAY['regional','national'], ARRAY['per_session','package','subscription'],
  ARRAY['Bodenarbeit','Liberty-Training','Desensibilisierung','Aufbautraining Jungpferd','Vertrauensarbeit','Trailern-Training','Clinics und Workshops'],
  ARRAY['Problempferdebesitzer','Jungpferdehalter','Freizeitreiter'],
  ARRAY['Stick und String','Carrot Stick','Bodenarbeitsgeschirr','Roundpen','Kamera für Online-Content'],
  ARRAY['Erklärungsbedarf bei konventionellen Reitern','Reisen für Clinics kostenintensiv'],
  ARRAY['Sommer: Outdoor-Clinics','Winter: Online-Kurse'],
  ARRAY['YouTube/Social Media als Marketing','Clinics vorbuchen lassen für Sicherheit'],
  ARRAY['horsemanship','bodenarbeit','liberty','natural','nh','roundpen','desensibilisierung','parelli','join-up','vertrauen'],
  110),

('western_trainer', 'Western-Trainer', ARRAY['Western Riding Instructor','Reining Trainer','Cutting Trainer','Barrel Trainer'], 'training', 'stationary', 'both', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional','national'], ARRAY['per_session','package'],
  ARRAY['Western-Grundausbildung','Reining-Training','Cutting','Trail-Training','Barrel Racing','Showvorbereitung','Jungpferde-Anreiten Western'],
  ARRAY['Western-Enthusiasten','Turniersportler Western','Quarter Horse Besitzer'],
  ARRAY['Western-Sattel','Bosal','Snaffle','Shank-Bit','Sporen Western','Roundpen'],
  ARRAY['Kleinere Szene in DE','Import-Pferde koordinieren'],
  ARRAY['Turniersaison Frühjahr-Herbst'],
  ARRAY['Community-Events/Clinics aufbauen','Social Media für Szene-Sichtbarkeit'],
  ARRAY['western','reining','cutting','barrel','quarter horse','rodeo','westernreiten','show','trail'],
  120),

('voltigiertrainer', 'Voltigiertrainer', ARRAY['Voltigiererin','Vaulting Coach'], 'training', 'stationary', 'indoor', 'offline', ARRAY['small_team','company'], ARRAY['local','regional'], ARRAY['subscription','per_session'],
  ARRAY['Voltigiertraining','Gruppenvoltigieren','Einzelvoltigieren','Wettkampfvorbereitung'],
  ARRAY['Kinder/Jugendliche','Erwachsene','Wettkampfvoltigierer'],
  ARRAY['Longe','Voltigiergurt','Kissen','Longierausrüstung'],
  ARRAY['Pferde-Pflege/Longeur-Koordination komplex','Hallenzeiten begrenzt'],
  ARRAY['Wettkampfsaison: Frühjahr-Herbst','Winter: Training in der Halle'],
  ARRAY['Vereinsstruktur oft sinnvoll','Wettbewerbe als Motivation für Kinder'],
  ARRAY['voltigier','voltigieren','vaulting','longe','voltige','bodenturnen','pferd'],
  130),

('distanz_trainer', 'Distanz-Trainer', ARRAY['Endurance Coach','Distanzreiten','Endurance Rider'], 'training', 'both', 'outdoor', 'both', ARRAY['solo'], ARRAY['regional','national'], ARRAY['per_session','package'],
  ARRAY['Konditionsaufbau','Rennvorbereitung','Puls-/Herzfrequenz-Training','Hufpflege-Beratung für Distanz'],
  ARRAY['Distanzreiter','Ausdauerreiter','Araberzüchter'],
  ARRAY['Herzfrequenzmesser','GPS-Tracker','Spezial-Hufschuhe','Elektrolyte'],
  ARRAY['Konditionsplanung komplex','Wetterunabhängige Planung schwer'],
  ARRAY['Rennsaison: Frühjahr-Herbst'],
  ARRAY['Trainingsplan digital dokumentieren','Puls-Daten tracken für Fortschritt'],
  ARRAY['distanz','endurance','ausdauer','kondition','herzfrequenz','distanzreiten','langstrecke','araberpferd'],
  140),

('jungpferde_trainer', 'Jungpferdetrainer', ARRAY['Anreiter','Youngster Trainer','Jungpferde-Ausbilder'], 'training', 'both', 'both', 'offline', ARRAY['solo','small_team'], ARRAY['regional','national'], ARRAY['per_session','package','flat_rate'],
  ARRAY['Anreiten','Grundausbildung','Desensibilisierung','Jungpferdeauktion-Vorbereitung'],
  ARRAY['Züchter','Jungpferdehalter'],
  ARRAY['Kappzaum','Longe','Westerngeschirr','Kamera'],
  ARRAY['Pferde kommen mit verschiedenem Vorwissen','Zeitintensiv'],
  ARRAY['Frühjahr: Viele Jungpferdeankäufe → Nachfrage'],
  ARRAY['Genaues Protokoll was das Pferd kann','Besitzer einbeziehen für Kontinuität'],
  ARRAY['jungpferd','anreiten','youngster','ausbilden','grundausbildung','dreijährig','vierjährig','angewöhnen'],
  150),

('stallbesitzer', 'Stallbesitzer/Pensionsstall', ARRAY['Pensionsinhaber','Reitbetrieb','Equestrian Center','Pferdehotel'], 'stall', 'stationary', 'both', 'offline', ARRAY['solo','small_team','company'], ARRAY['local','regional'], ARRAY['subscription','flat_rate','mixed'],
  ARRAY['Pferdeeinstellung Box/Offenstall/Paddock-Trail','Fütterung und Pflege','Weidegang','Reithallen-/Außenbahnvermietung','Ferienprogramme'],
  ARRAY['Pensionspferdehalter','Vereine','Freizeitreiter','Turniersportler'],
  ARRAY['Stallmanagement-Software','Futterplan','Putzzeug','Medizinschrank','Schlüsselsystem'],
  ARRAY['Personalprobleme','Pferdeseuchen Quarantäne','Wetterextreme','Zahlungsausfälle bei Einstellern','Behördenauflagen'],
  ARRAY['Sommer: Weidegang mehr Arbeit draußen','Winter: Mehr Hallennutzung'],
  ARRAY['Wartungslisten digital führen','Einstellerverträge schriftlich mit SEPA-Lastschrift','Notfallplan für Seuchen'],
  ARRAY['stall','pension','reitanlage','einsteller','box','offenstall','weide','paddockbox','pferdepension','pensionsstall'],
  160),

('pferdepfleger', 'Pferdepfleger', ARRAY['Pferdewirt','Stable Hand','Equine Groom','Stallknecht'], 'stall', 'stationary', 'both', 'offline', ARRAY['small_team','company'], ARRAY['local'], ARRAY['flat_rate'],
  ARRAY['Fütterung','Einstreuen','Ausmisten','Pflegen','Bewegung','Tierarzt-Begleitung'],
  ARRAY['Stallbetriebe','Rennställe','Gestüte'],
  ARRAY['Putzzeug','Mistgabel','Schubkarre','Sattelzeug'],
  ARRAY['Frühschicht-Arbeit','Wochenenddienste','Körperlich anspruchsvoll'],
  ARRAY['Ganzjährig gleichmäßig'],
  ARRAY['Schichtplan digital koordinieren','Pferdezustand täglich notieren'],
  ARRAY['pfleger','pflegerin','ausmisten','füttern','groom','pflege','stallarbeit','pferdewirt','tierpfleger'],
  170),

('pferdezuechter', 'Pferdezüchter', ARRAY['Horse Breeder','Gestütsinhaber','Stutbuchzüchter'], 'stall', 'stationary', 'both', 'offline', ARRAY['solo','small_team','company'], ARRAY['regional','national','international'], ARRAY['flat_rate'],
  ARRAY['Zucht','Deckstation','Fohlenaufzucht','Jungpferde-Verkauf','Turnier-Platzierung'],
  ARRAY['Käufer von Jungpferden','Reiter im Sport'],
  ARRAY['Hengst','Zuchtdokumentation','Embryotransfer-Ausrüstung'],
  ARRAY['Lange Kapitalbindung','Abhängigkeit von Hengst-Gesundheit','Marktpreisschwankungen'],
  ARRAY['Deckzeit: Frühjahr','Fohlensaison: März-Juni'],
  ARRAY['Hengstbuch und Stutbuch digital pflegen','Fohlendaten von Geburt an dokumentieren'],
  ARRAY['zucht','züchter','fohlen','hengst','stute','deckung','stutbuch','gestüt','breeding','fohlenzucht'],
  180),

('pferdeernährungsberater', 'Pferdeernährungsberater', ARRAY['Equine Nutritionist','Fütterungsberater Pferd','Pferdefutter-Coach'], 'ernaehrung', 'both', 'both', 'both', ARRAY['solo'], ARRAY['regional','national','international'], ARRAY['per_session','package','subscription'],
  ARRAY['Futteranalyse','Futterplan-Erstellung','Mineralstoff-Optimierung','Rehe-Diät','EMS/PPID-Ernährungsplan','Gewichtsmanagement','Online-Beratung'],
  ARRAY['Pferdebesitzer','Stallbetriebe','Tierärzte Überweisung'],
  ARRAY['Heu-Analyse','Blutbild-Interpretation','Berechnungssoftware','Online-Meeting-Tool'],
  ARRAY['Kunden ignorieren Empfehlungen','Produkt-Lobbying erschwert neutrale Beratung'],
  ARRAY['Weideumstellung Frühjahr/Herbst: Mehr Nachfrage'],
  ARRAY['Online-Beratung skaliert besser als vor-Ort','Heu-Analyse als Einstiegsprodukt'],
  ARRAY['futter','ernährung','nutrition','mineralstoff','heu','diät','rehe ernährung','futterplan','ems','fütterung'],
  190),

('futtermittelberater', 'Futtermittelberater', ARRAY['Tiernahrungsberater','Feed Consultant','Sales Agronomist Pferd'], 'ernaehrung', 'both', 'both', 'both', ARRAY['solo','company'], ARRAY['regional','national'], ARRAY['flat_rate','per_session'],
  ARRAY['Produktberatung','Fütterungsoptimierung','Stallbesuche','Schulungen'],
  ARRAY['Stallbetriebe','Großkunden','Einzelpferdehalter'],
  ARRAY['Muster','Produktkatalog','Fahrzeug'],
  ARRAY['Abhängigkeit vom Arbeitgeber/Hersteller','Neutralität vs. Verkaufsdruck'],
  ARRAY['Ganzjährig leicht saisonal'],
  ARRAY['Kundendatenbank sauber führen','Follow-up nach Erstkauf'],
  ARRAY['futtermittel','pellets','müsli','kraftfutter','ergänzungsfutter','heucobs','supplement'],
  200),

('hippotherapeut', 'Hippotherapeut', ARRAY['Hippotherapy Practitioner','Therapeutisches Reiten','Pferde-assistierte Therapie'], 'begleitung', 'stationary', 'indoor', 'offline', ARRAY['small_team'], ARRAY['local','regional'], ARRAY['per_session','package'],
  ARRAY['Motorische Förderung','Neurologische Rehabilitation','Sensorische Integration'],
  ARRAY['Menschen mit Behinderungen','Neurologische Patienten','Kinder mit Entwicklungsverzögerung'],
  ARRAY['Spezialsattel','Longierausrüstung','Therapieequipment'],
  ARRAY['Krankenversicherungs-Abrechnung komplex','Pferd muss sehr ausgeglichen sein'],
  ARRAY['Ganzjährig wetterunabhängig Halle'],
  ARRAY['Kassenabrechnung frühzeitig klären','Pferd regelmäßig auf Eignung prüfen'],
  ARRAY['hippotherapie','therapeutisches reiten','pferde therapie','rehabilitation mensch','assistierte therapie','heilpädagogisch'],
  210),

('reitpaedagoge', 'Reitpädagoge', ARRAY['Equine Assisted Learning','Pferde-gestützte Pädagogik','EAL Coach','Heilpädagoge mit Pferd'], 'begleitung', 'stationary', 'both', 'offline', ARRAY['solo','small_team'], ARRAY['local','regional'], ARRAY['per_session','package'],
  ARRAY['Persönlichkeitsentwicklung','Teambuilding mit Pferden','Coaching','Traumaarbeit'],
  ARRAY['Schulen','Jugendeinrichtungen','Erwachsene im Coaching','Unternehmen'],
  ARRAY['Bodenarbeitsgeschirr','Roundpen','Dokumentationsmaterial'],
  ARRAY['Schwierige Abgrenzung zu Therapie','Marketing komplex'],
  ARRAY['Schuljahr: Mehr Nachfrage','Sommer: Ferienangebote'],
  ARRAY['Kooperation mit Schulen/Einrichtungen','Klar kommunizieren was EAL ist und was nicht'],
  ARRAY['pädagoge','eal','coaching pferd','teambuilding','heilpädagoge','sozialarbeit pferd','pferde pädagogik'],
  220),

('sattler', 'Sattler', ARRAY['Sattelmacher','Saddler','Saddle Fitter','Sattelanpasser'], 'handwerk', 'both', 'indoor', 'offline', ARRAY['solo','small_team'], ARRAY['regional','national'], ARRAY['per_session','flat_rate'],
  ARRAY['Sattelanpassung','Sattelreparatur','Sattelneubau','Gurte/Zaumzeug-Reparatur','Sattelkauf-Beratung','Trense anpassen'],
  ARRAY['Pferdebesitzer','Reitschulen','Turnierstallbetreiber'],
  ARRAY['Nähmaschine Leder','Ahle','Schaber','Leder','Sattelwerkzeug','Messgerät'],
  ARRAY['Auftragsplanung schwankend','Teures Material vorstrecken','Kunden mit unrealistischen Erwartungen'],
  ARRAY['Frühjahr: Saisoneinstieg Sattel-Check','Herbst: Reparatur vor Winter'],
  ARRAY['Sattel-Check-Termine als Abo-Modell anbieten','Warteliste für Neubau'],
  ARRAY['sattel','sattler','anpassung','sattelanpassung','zaumzeug','trense','reparatur','saddle','sattelmacher'],
  230),

('pferdehandel', 'Pferdehändler', ARRAY['Pferdevermittler','Horse Dealer','Pferdeverkauf'], 'handel', 'both', 'both', 'both', ARRAY['solo','small_team'], ARRAY['national','international'], ARRAY['flat_rate','mixed'],
  ARRAY['An- und Verkauf','Vermittlung','Ankaufsuntersuchung','Probereiten','Import/Export'],
  ARRAY['Käufer und Verkäufer'],
  ARRAY['Inserate-Plattformen','Video-Equipment','Transportkontakte'],
  ARRAY['Rechtliche Haftungsfragen','Vertrauen aufbauen','Zustandsbeschreibung ehrlich vs. kommerziell'],
  ARRAY['Frühjahr: Kaufsaison'],
  ARRAY['Ankaufsuntersuchung immer empfehlen','AGB schriftlich bei jedem Verkauf'],
  ARRAY['handel','händler','verkaufen','kaufen','vermittlung','inserieren','export','pferdeverkauf','ehorses'],
  240),

('pferdetransport', 'Pferdetransporteur', ARRAY['Horse Transport','Pferdetaxi','Equine Transport'], 'handel', 'mobile', 'outdoor', 'offline', ARRAY['solo','small_team'], ARRAY['regional','national','international'], ARRAY['per_session','flat_rate'],
  ARRAY['Einzeltransport','Routentransport','Kliniktransport','Turniertransport','Internationaler Transport'],
  ARRAY['Pferdebesitzer','Rennställe','Händler','Tierärzte'],
  ARRAY['Pferdetransporter 1er/2er/3er','LKW','Laderaumkameras','GPS'],
  ARRAY['Stress für Pferde im Transport','Termintreue bei langen Routen','Papiere international'],
  ARRAY['Turniersaison: Mehr Aufträge'],
  ARRAY['Transportstress-Protokoll für Pferde dokumentieren','Versicherung klar kommunizieren'],
  ARRAY['transport','transporter','hänger','trailer','fahren','abholen','bringen','pferdetaxi','kliniktransport'],
  250)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_alternatives = EXCLUDED.name_alternatives,
  category = EXCLUDED.category,
  work_location = EXCLUDED.work_location,
  environment = EXCLUDED.environment,
  delivery = EXCLUDED.delivery,
  team_sizes = EXCLUDED.team_sizes,
  scopes = EXCLUDED.scopes,
  pricing_models = EXCLUDED.pricing_models,
  typical_services = EXCLUDED.typical_services,
  typical_clients = EXCLUDED.typical_clients,
  key_tools = EXCLUDED.key_tools,
  common_problems = EXCLUDED.common_problems,
  seasonal_patterns = EXCLUDED.seasonal_patterns,
  hufi_tips = EXCLUDED.hufi_tips,
  relevant_keywords = EXCLUDED.relevant_keywords,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================
-- SEED: hufi_horse_breeds (30 Rassen)
-- ============================================================

INSERT INTO hufi_horse_breeds (id, name, name_en, aliases, category, origin, characteristics, common_uses, health_notes) VALUES

('hannoveraner', 'Hannoveraner', 'Hanoverian', ARRAY['Hannover','Hann'], 'warmblood', 'Deutschland (Niedersachsen)',
  ARRAY['Großrahmig','Korrekte Gänge','Springvermögen','Rittigkeit','Vielseitig'],
  ARRAY['Dressur','Springen','Vielseitigkeit','Freizeitreiten'],
  'Neigung zu Osteochondrose bei schnellem Wachstum; Hufpflege wichtig bei großem Körpergewicht.'),

('holsteiner', 'Holsteiner', 'Holsteiner', ARRAY['Holstein'], 'warmblood', 'Deutschland (Schleswig-Holstein)',
  ARRAY['Starkes Springvermögen','Kraftvoll','Ausdauernd','Robustheit'],
  ARRAY['Springen','Vielseitigkeit','Dressur'],
  'Robust; gelegentlich anfällig für Hufrollenprobleme (Podotrochlose).'),

('westfale', 'Westfale', 'Westphalian', ARRAY['Westfälisches Warmblut','Westf'], 'warmblood', 'Deutschland (Westfalen)',
  ARRAY['Ausgeglichener Charakter','Gute Rittigkeit','Vielseitig','Leistungsbereit'],
  ARRAY['Dressur','Springen','Freizeitreiten'],
  'Solide Hufqualität; auf ausgewogene Fütterung achten um Hufrehe vorzubeugen.'),

('trakehner', 'Trakehner', 'Trakehner', ARRAY['Trakehnerpferd'], 'warmblood', 'Ostpreußen (heute Polen)',
  ARRAY['Edel','Sensibel','Ausdauernd','Natürliche Bewegung','Temperamentvoll'],
  ARRAY['Dressur','Vielseitigkeit','Distanzreiten'],
  'Feine Haut und Hufe; empfindlich bei feuchten Bedingungen; Strahlfäule-Vorbeugung wichtig.'),

('oldenburger', 'Oldenburger', 'Oldenburg', ARRAY['Oldenburg','OL'], 'warmblood', 'Deutschland (Oldenburg)',
  ARRAY['Großrahmig','Bewegungsstark','Rittigkeit','Springvermögen'],
  ARRAY['Dressur','Springen'],
  'Große Hufe mit hohem Körpergewicht; regelmäßige Hufpflege essenziell.'),

('rheinlaender', 'Rheinländer', 'Rhinelander', ARRAY['Rheinisch-Deutsches Warmblut','Rheinland'], 'warmblood', 'Deutschland (Rheinland)',
  ARRAY['Ausgeglichen','Leistungsbereit','Gute Gänge'],
  ARRAY['Dressur','Springen','Freizeitreiten'],
  'Stabile Gesundheit; auf ausreichend Bewegung achten zur Hufdurchblutung.'),

('kwpn', 'KWPN (Niederländisches Warmblut)', 'KWPN', ARRAY['Niederländisches Warmblut','Dutch Warmblood','Holländer'], 'warmblood', 'Niederlande',
  ARRAY['Hochmotion','Springtalent','Rittigkeit','Leistungsbereit'],
  ARRAY['Dressur','Springen'],
  'Osteochondrose-Disposition bei manchen Linien; Hufqualität variiert; Barhuf-Übergang oft möglich.'),

('bayerisches_warmblut', 'Bayerisches Warmblut', 'Bavarian Warmblood', ARRAY['Bayern','Bay WB'], 'warmblood', 'Deutschland (Bayern)',
  ARRAY['Gutmütig','Vielseitig','Robustheit'],
  ARRAY['Freizeit','Dressur','Springen'],
  'Gute Hufqualität; unkompliziert in der Haltung.'),

('lipizzaner', 'Lipizzaner', 'Lipizzan', ARRAY['Lipizzan','Lippizaner'], 'warmblood', 'Slowenien/Österreich',
  ARRAY['Spätentwickler','Langlebig','Intelligent','Edel','Grauschimmel'],
  ARRAY['Klassische Dressur','Spanische Hofreitschule','Freizeitreiten'],
  'Sehr langlebig (25+ Jahre); neigt zu EMS/Fettansatz; Hufrehe-Prophylaxe durch Futterkontrolle.'),

('andalusier', 'Andalusier', 'Andalusian', ARRAY['PRE','Pura Raza Española','Spanier'], 'iberian', 'Spanien',
  ARRAY['Elegant','Temperamentvoll','Gelehrig','Beweglichkeit','Kollektion'],
  ARRAY['Klassische Dressur','Working Equitation','Freizeitreiten'],
  'Anfällig für EMS und Hufrehe; Futtermenge genau kontrollieren; regelmäßige Hufpflege nötig.'),

('lusitano', 'Lusitano', 'Lusitano', ARRAY['PSL','Puro Sangue Lusitano','Portugiese'], 'iberian', 'Portugal',
  ARRAY['Mutig','Wendig','Gelehrig','Natürliche Kollektion'],
  ARRAY['Stierkampf (Rejoneo)','Working Equitation','Dressur'],
  'Ähnlich Andalusier EMS-anfällig; auf Gewicht und Weidezeit achten.'),

('arabisches_vollblut', 'Arabisches Vollblut', 'Arabian', ARRAY['Araber','Arab','Arabian Horse'], 'oriental', 'Arabische Halbinsel',
  ARRAY['Ausdauernd','Intelligent','Sensibel','Edel','Trockene Konstitution'],
  ARRAY['Distanzreiten','Dressur','Zucht','Freizeitreiten'],
  'Trockene feine Hufe; neigt zu empfindlichen Hufen; Barhuf oft gut möglich.'),

('anglo_araber', 'Anglo-Araber', 'Anglo-Arabian', ARRAY['Anglo-Arab','AA'], 'warmblood', 'Frankreich/International',
  ARRAY['Ausdauernd','Temperamentvoll','Schnell','Vielseitig'],
  ARRAY['Distanzreiten','Vielseitigkeit','Dressur'],
  'Feine Hufe wie Vollblut; gute Barhuf-Eignung; regelmäßige Bearbeitung wichtig.'),

('englisches_vollblut', 'Englisches Vollblut', 'Thoroughbred', ARRAY['Vollblut','Thoroughbred','TB'], 'thoroughbred', 'England',
  ARRAY['Sehr schnell','Feiner Knochenbau','Sensibel','Ausdauernd'],
  ARRAY['Rennsport','Vielseitigkeit','Springreiten','Zucht'],
  'Feine dünne Hufwände; braucht intensive Hufpflege; Strahlfäule häufig bei Stallhaltung.'),

('friese', 'Friese', 'Friesian', ARRAY['Friesenpferd','Friesian Horse'], 'warmblood', 'Niederlande (Friesland)',
  ARRAY['Elegante Gänge','Hohe Knie-Aktion','Sanftmütig','Schwarzes Fell','Volles Langhaar'],
  ARRAY['Dressur','Kutschpferd','Freizeitreiten','Film/Fotografie'],
  'Neigt zu Mauke durch Behang; intensive Beinpflege nötig; Hufrehe-Risiko bei Übergewicht.'),

('haflinger', 'Haflinger', 'Haflinger', ARRAY['Haflingerpferd'], 'pony', 'Österreich/Südtirol',
  ARRAY['Kräftig','Gutmütig','Ausdauernd','Füchse mit Flachs-Mähne','Bergpferd'],
  ARRAY['Freizeitreiten','Fahren','Kinder','Therapeutisches Reiten'],
  'Stark EMS-anfällig und Hufrehe-gefährdet; Weidezugang und Futter streng kontrollieren.'),

('fjordpferd', 'Fjordpferd', 'Norwegian Fjord', ARRAY['Norweger','Fjord','Fjordpony'], 'pony', 'Norwegen',
  ARRAY['Robust','Ausdauernd','Gutmütig','Zweifarbige Mähne','Urtyp'],
  ARRAY['Freizeitreiten','Fahren','Kinder','Wanderreiten'],
  'Sehr leichtfuttrig; Hufrehe-anfällig; Weide und Futterration genau überwachen.'),

('islaender', 'Isländer', 'Icelandic Horse', ARRAY['Islandpferd','Islandpony','Tölter'], 'gaited', 'Island',
  ARRAY['Tölt','Pass','Robust','Langlebig','Vielseitige Gangarten'],
  ARRAY['Freizeitreiten','Töltreiten','Distanzreiten','Fahren'],
  'Sehr robust; anfällig für Hufrehe bei europäischen Weidebedingungen; Barhuf gut geeignet.'),

('shetlandpony', 'Shetlandpony', 'Shetland Pony', ARRAY['Shetty','Shetland'], 'pony', 'Shetlandinseln (Schottland)',
  ARRAY['Sehr robust','Klein','Stark für seine Größe','Eigenwillig'],
  ARRAY['Kinder (Anfänger)','Kutschpony','Voltigieren'],
  'Extrem leichtfuttrig; sehr Hufrehe-anfällig; kein oder sehr begrenzter Weidegang empfohlen.'),

('welsh_pony', 'Welsh Pony', 'Welsh Pony', ARRAY['Welsh','Welsh Cob'], 'pony', 'Wales (Großbritannien)',
  ARRAY['Edel','Bewegungsstark','Ausdauernd','Vielseitig'],
  ARRAY['Kinder','Jugendsport','Fahren','Springen'],
  'Robust; auf Gewicht achten da Neigung zu Hufrehe; gute Hufqualität in der Regel.'),

('quarter_horse', 'American Quarter Horse', 'American Quarter Horse', ARRAY['Quarter Horse','QH'], 'western', 'USA',
  ARRAY['Sehr schnell auf kurzen Strecken','Muskulös','Ruhig','Vielseitig'],
  ARRAY['Western','Reining','Cutting','Barrel Racing','Ranch Work'],
  'Gute Hufqualität; neigt zu Podotrochlose bei intensiver Nutzung; regelmäßige Hufpflege wichtig.'),

('paint_horse', 'Paint Horse', 'American Paint Horse', ARRAY['Paint','APHA'], 'western', 'USA',
  ARRAY['Schecken-Zeichnung','Ruhig','Vielseitig','Muskulös'],
  ARRAY['Western','Freizeitreiten','Showreiten'],
  'Ähnlich Quarter Horse; gute Hufqualität; auf Gewicht achten.'),

('appaloosa', 'Appaloosa', 'Appaloosa', ARRAY['Appy','Nez Perce Horse'], 'western', 'USA (Nez Perce)',
  ARRAY['Geflecktes Fell','Robust','Ausdauernd','Temperamentvoll'],
  ARRAY['Western','Freizeitreiten','Distanzreiten'],
  'Neigung zu Uveitis (Mondblindheit); Hufe oft gestreift; gute Hufhärte in der Regel.'),

('mustang', 'Mustang', 'Mustang', ARRAY['Wild Horse','American Mustang','BLM Horse'], 'western', 'USA (verwilderte Spanier)',
  ARRAY['Sehr robust','Ausdauernd','Harte Hufe','Selbstständig'],
  ARRAY['Freizeitreiten','Distanzreiten','Barhuf-Projekte'],
  'Exzellente Hufhärte durch natürliche Selektion; ideale Barhuf-Kandidaten; minimale Hufpflege nötig.'),

('paso_fino', 'Paso Fino', 'Paso Fino', ARRAY['Paso','Puerto Rican Paso'], 'gaited', 'Lateinamerika/Karibik',
  ARRAY['Natürlicher Vier-Takt-Gang','Komfortabel','Elegant','Ausdauernd'],
  ARRAY['Freizeitreiten','Showreiten','Distanzreiten'],
  'Feine Hufe; gute Pflege nötig; empfindlich bei feuchten Böden.'),

('tennessee_walker', 'Tennessee Walker', 'Tennessee Walking Horse', ARRAY['TWH','Walking Horse'], 'gaited', 'USA (Tennessee)',
  ARRAY['Running Walk','Sanftmütig','Ausdauernd','Bequeme Gänge'],
  ARRAY['Freizeitreiten','Trail Riding','Showreiten'],
  'Gute Hufgesundheit bei artgerechter Haltung; historisch Hufmanipulation → Barhuf-Rehab möglich.'),

('criollo', 'Criollo', 'Criollo', ARRAY['Kreolenpferd','South American Horse'], 'western', 'Südamerika (Argentinien/Uruguay)',
  ARRAY['Extrem robust','Ausdauernd','Harte Hufe','Stressresistent'],
  ARRAY['Distanzreiten','Ranch Work','Polo','Freizeitreiten'],
  'Sehr harte Hufe; ausgezeichnete Barhuf-Eignung; sehr leichtfuttrig.'),

('missouri_fox_trotter', 'Missouri Fox Trotter', 'Missouri Fox Trotter', ARRAY['MFT','Fox Trotter'], 'gaited', 'USA (Missouri)',
  ARRAY['Fox Trot Gang','Ruhig','Ausdauernd','Komfortabel'],
  ARRAY['Trail Riding','Freizeitreiten','Distanzreiten'],
  'Gute Hufgesundheit; Barhuf meist möglich; regelmäßige Pflege nötig.'),

('konik', 'Konik', 'Konik', ARRAY['Polnisches Wildpferd','Konikpony'], 'pony', 'Polen',
  ARRAY['Sehr robust','Naturschutz','Wildpferd-ähnlich','Mausgrau'],
  ARRAY['Naturschutz (Beweidung)','Freizeitreiten','Zucht'],
  'Sehr robuste Hufe; ideal für Barhuf; minimal Pflege nötig da stark an natürliche Bedingungen angepasst.'),

('exmoor_pony', 'Exmoor-Pony', 'Exmoor Pony', ARRAY['Exmoor'], 'pony', 'England (Exmoor)',
  ARRAY['Urtyp','Sehr robust','Wasserresistentes Fell','Harte Hufe'],
  ARRAY['Naturschutz','Kinder','Freizeitreiten'],
  'Sehr robuste Hufe; hervorragende Barhuf-Kandidaten; strenge Futterkontrolle da leichtfuttrig.')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  aliases = EXCLUDED.aliases,
  category = EXCLUDED.category,
  origin = EXCLUDED.origin,
  characteristics = EXCLUDED.characteristics,
  common_uses = EXCLUDED.common_uses,
  health_notes = EXCLUDED.health_notes;

-- ============================================================
-- SEED: hufi_health_conditions (25 Erkrankungen)
-- ============================================================

INSERT INTO hufi_health_conditions (id, name, name_en, name_latin, aliases, category, symptoms, hoof_relevance, urgency, description, treatment_notes) VALUES

('strahlfaeule', 'Strahlfäule', 'Thrush', 'Pododermatitis septica circumscripta', ARRAY['Strahl-Fäule','Strahlfäulnis','schwarzer Strahl'], 'huf',
  ARRAY['Schwarze übelriechende Masse im Strahl','Weicher zersetzter Strahl','Lahmheit in schweren Fällen','Schwarze Verfärbung der Strahlgänge'],
  'direct', 'medium',
  'Bakterielle Infektion des Strahls durch anaerobe Bakterien, begünstigt durch feuchte Stallhaltung und mangelhafte Hufhygiene. Sehr häufige Erkrankung besonders in nassen Jahreszeiten.',
  'Täglich reinigen und trockenlegen; antimikrobielle Mittel (Jod, Kupfersulfat, spezielle Strahlfäule-Sprays); trockenere Haltungsbedingungen; regelmäßige Hufpflege.'),

('hufrehe', 'Hufrehe', 'Laminitis', 'Pododermatitis aseptica diffusa', ARRAY['Rehe','Laminitis','Hufrehe akut','Chronische Rehe'], 'huf',
  ARRAY['Entlastungshaltung Vorhand','Erhöhte Huftemperatur','Verstärkter Puls an den Fesselarterien','Lahmheit','Weigerung sich zu bewegen','Zittern'],
  'direct', 'high',
  'Entzündung der Huflederhaut mit möglicher Rotation oder Senkung des Hufbeins. Häufig ausgelöst durch Futterfehler, Weideumstellung, EMS, PPID oder mechanische Überlastung.',
  'Sofortige Entlastung, Tierarzt kontaktieren, Futter drastisch reduzieren (nur Heu), Tiefes Einstreuen, Huforthesen zur Entlastung der Hufspitze, konsequente Hufbearbeitung durch Spezialisten.'),

('weisslinienkrankheit', 'Weißlinienkrankheit', 'White Line Disease', 'Onychomycosis equi', ARRAY['Seime','White Line Disease','WLD','Hufwandablösung'], 'huf',
  ARRAY['Hohlräume in der weißen Linie','Krümelige Hufwand','Verfärbung gelb/schwarz/grau','In schweren Fällen Lahmheit'],
  'direct', 'high',
  'Pilz- und/oder bakterielle Infektion der weißen Linie mit Hohlraumbildung in der Hufwand. Kann unbehandelt zu erheblichem Hufwandverlust führen.',
  'Betroffene Bereiche ausschneiden und säubern; Austrocknung fördern; antifungale Behandlung; regelmäßige Kontrolle; Hufschutz bis zur Regeneration.'),

('barhuf_uebergang', 'Barhuf-Übergangszeit', 'Barefoot Transition', NULL, ARRAY['Umstieg auf Barhuf','Barhuf-Umstellung','Entbeschlag'], 'huf',
  ARRAY['Empfindlichkeit auf hartem Boden','Veränderte Gangbilder','Temporäre Lahmheit möglich','Hufwandveränderungen'],
  'direct', 'low',
  'Anpassungsphase nach dem Entfernen des Beschlags, in der sich der Huf neu strukturiert und stärkt. Kann je nach Pferd mehrere Monate dauern.',
  'Langsame Steigerung auf hartem Untergrund; Hufschuhe für sensible Phasen; regelmäßige professionelle Bearbeitung; ausreichend Bewegung auf verschiedenen Untergründen.'),

('bockhuf', 'Bockhuf', 'Club Foot', 'Pes equinus congenitus', ARRAY['Steiler Huf','Steilhuf','High-Low Syndrom'], 'huf',
  ARRAY['Steilgestellter Huf','Unterschied zwischen Vorderhufen','Zehe tendiert nach vorne','Ferse kaum absetzbar'],
  'direct', 'medium',
  'Fehlstellung mit zu steilem Hufwinkel, häufig bedingt durch Verkürzung der tiefen Beugesehne. Kann angeboren oder erworben sein.',
  'Konsequente Hufbearbeitung zum Absenken der Ferse; orthopädischer Beschlag oder Keilung; in schweren Fällen tierärztliche Intervention; Physiotherapie.'),

('flachhuf', 'Flachhuf', 'Flat Foot', NULL, ARRAY['Flache Sohle','Platter Huf'], 'huf',
  ARRAY['Flache Sohle kaum Wölbung','Weiße Linie verbreitert','Empfindliche Sohle','Anfällig für Sohlenwunden'],
  'direct', 'medium',
  'Zu flache Hufform mit wenig Sohlengewölbe, oft verbunden mit breiter weißer Linie. Erhöhte Verletzungsgefahr durch Steinauftritte.',
  'Regelmäßige Bearbeitung; Vermeidung von scharfem Untergrund; Hufschuhe bei Bedarf; Sole stärken durch gezielte Bewegung.'),

('hufgeschwuer', 'Hufgeschwür', 'Hoof Abscess', NULL, ARRAY['Hufabszess','Abszess im Huf','Nageltritt'], 'huf',
  ARRAY['Plötzliche schwere Lahmheit','Pulsieren am Huf','Erhöhte Huftemperatur','Schwellung Fesselbereich','Entlastung des Beins'],
  'direct', 'high',
  'Eitrige Entzündung im Hufinneren, oft ausgelöst durch eingedrungene Bakterien über Risse oder Verletzungen. Schmerzhaft und plötzlich auftretend.',
  'Huf aufweichen, Hufschmied/Tierarzt öffnet Abszess; Ausspülen; Verband; Ruhe; Antibiose nur auf tierärztliche Anweisung; nach Öffnung schnelle Besserung.'),

('hufkrebs', 'Hufkrebs', 'Canker', 'Pododermatitis chronica hypertrophicans', ARRAY['Canker','Hufwucherung'], 'huf',
  ARRAY['Wucherndes weißes/graues Gewebe','Übler Geruch','Schlechte Wundheilung','Lahmheit','Weiche Konsistenz'],
  'direct', 'high',
  'Chronische Hyperplasie der Huflederhaut mit wucherndem infiziertem Gewebe, häufiger bei Pferden mit breiten Hufen in feuchter Haltung.',
  'Chirurgische Entfernung des Gewebes; intensive Wundpflege; trockene Haltung; Verband; langer Heilungsprozess mehrere Monate.'),

('podotrochlose', 'Podotrochlose', 'Navicular Syndrome', 'Podotrochlose', ARRAY['Navicular','Hufrollenproblem','Strahlbeinlahmheit','Navicular Disease'], 'huf',
  ARRAY['Schleichende Lahmheit Vorhand','Zehenfußen','Entlastung abwechselnd','Steifheit nach Ruhe','Besserung nach Erwärmen'],
  'direct', 'high',
  'Degenerative Erkrankung des Hufrollenapparats (Strahlbein, Bursa, tiefe Beugesehne). Chronisch schmerzhaft, häufig bei Pferden mittleren Alters.',
  'Orthopädischer Beschlag mit Aufzug; entzündungshemmende Medikamente; Tiludronat-Therapie; regelmäßige tierärztliche Kontrolle; moderates Training.'),

('ems', 'Equines Metabolisches Syndrom', 'Equine Metabolic Syndrome', NULL, ARRAY['EMS','Insulinresistenz Pferd','Metabolisches Syndrom Pferd'], 'stoffwechsel',
  ARRAY['Verfettung bestimmter Stellen (Cresty Neck, Kruppe)','Chronische Hufrehe','Polydipsie/Polyurie','Insulinresistenz','Gewichtszunahme trotz reduzierter Fütterung'],
  'indirect', 'high',
  'Stoffwechselerkrankung mit Insulindysregulation und Adipositas, die zur chronischen Hufrehe prädisponiert. Häufig bei bestimmten Rassen (Haflinger, Pony, Iberer).',
  'Strenge Diät (zuckerarmes Heu); kein Gras; regelmäßige Bewegung; Gewichtsreduktion; Tierarzt zur Blutwert-Kontrolle; ggf. Metformin oder andere Medikamente.'),

('ppid_cushing', 'PPID/Cushing-Syndrom', 'PPID/Cushing''s Disease', 'Pars pituitary intermedia dysfunction', ARRAY['Cushing','PPID','Equines Cushing','Hypophysen-Syndrom'], 'stoffwechsel',
  ARRAY['Langes lockiges Fell (Hypertrichose)','Nicht mausern','Muskelabbau','Erhöhte Wasseraufnahme','Hufrehe','Schweißausbrüche','Lethargie'],
  'indirect', 'high',
  'Dysfunktion der Hypophyse mit erhöhter ACTH-Produktion. Häufig bei älteren Pferden (>15 Jahre). Führt zu Immunsuppression und Reheanfälligkeit.',
  'Pergolid (Prascend) als Dauertherapie; Futteranpassung; engmaschige Kontrolle; Hufpflege intensivieren; Zähne und Parasitenbelastung regelmäßig kontrollieren.'),

('insulin_dysregulation', 'Insulin-Dysregulation', 'Insulin Dysregulation', NULL, ARRAY['Insulinresistenz','ID','hyperinsulinemia'], 'stoffwechsel',
  ARRAY['Hufrehe','Verfettung','Abnorme Insulinantwort','Chronische Lahmheit'],
  'indirect', 'high',
  'Gestörte Insulinregulation die direkt zur Hufrehe führen kann. Kann im Rahmen von EMS oder PPID auftreten, aber auch als eigenständige Erkrankung.',
  'Blutzucker- und Insulinmessung durch Tierarzt; kohlenhydratarme Ernährung; Bewegung; Gewichtsmanagement.'),

('lahmheit', 'Lahmheit', 'Lameness', NULL, ARRAY['Lahm','Humpeln','Schongang'], 'gelenk',
  ARRAY['Asymmetrische Bewegung','Kopfnicken','Hüftheben','Schonung eines Beins','Veränderte Schrittlänge'],
  'indirect', 'medium',
  'Symptom vieler Erkrankungen des Bewegungsapparats. Kann von Grad 1 (kaum erkennbar) bis Grad 5 (Aufstützen unmöglich) reichen.',
  'Ursachendiagnostik durch Tierarzt (Beugeproben, Leitungsanästhesie, Röntgen, Ultraschall); Behandlung je nach Ursache; Ruhe bis zur Diagnose.'),

('arthrose', 'Arthrose', 'Osteoarthritis', 'Osteoarthritis', ARRAY['Gelenkarthrose','Arthrosis','Gelenkverschleiß'], 'gelenk',
  ARRAY['Chronische Lahmheit','Steifheit nach Ruhe','Gelenkvergrößerung','Besserung nach Erwärmen','Schmerzhaftigkeit bei Palpation'],
  'indirect', 'medium',
  'Degenerative Gelenkerkrankung mit Knorpelabbau und Knochenveränderungen. Häufig bei älteren Pferden oder nach Gelenkverletzungen.',
  'Entzündungshemmende Medikamente; Gelenkinjektion (Kortison, HA, PRP); angepasstes Training; Physiotherapie; orthopädischer Beschlag; kein Heilmittel.'),

('sehnenprobleme', 'Sehnenprobleme', 'Tendinitis', 'Tendinitis / Desmitis', ARRAY['Sehnenentzündung','Tendinitis','Sehnenriss','Strecksehne'], 'muskel',
  ARRAY['Wärme im Bereich der Sehne','Schwellung','Lahmheit','Schmerzreaktion bei Palpation','Verdickte Sehne'],
  'indirect', 'medium',
  'Entzündung oder Ruptur von Sehnen oder Bändern, häufig an tiefer oder oberflächlicher Beugesehne. Oft durch Überlastung oder Trauma.',
  'Sofortige Ruhe und Kühlung; Tierarzt; Ultraschalldiagnostik; Ruhezeit 6-12 Monate; kontrollierter Trainingsaufbau; PRP-Behandlung möglich.'),

('spat', 'Spat', 'Spavin', 'Osteoarthritis articulationis tarsocruralis', ARRAY['Knochenpat','Bogspat','Schale'], 'gelenk',
  ARRAY['Lahmheit Hinterbein','Besserung nach Erwärmen','Spatprobe positiv','Seltene Vergrößerung am Sprunggelenk'],
  'indirect', 'medium',
  'Degenerative Veränderung der kleinen Sprunggelenke, häufig bei Pferden mit steiler Hinterhandstellung. Führt zu Versteifung der Gelenke.',
  'Entzündungshemmend; Gelenkinjektion; Versteifung (Ankylierung) als Ziel bei Behandlung; Lahmheit oft nach vollständiger Versteifung besser.'),

('krongelenkentzuendung', 'Krongelenkentzündung', 'Pastern Joint Arthritis', 'Osteoarthritis articulationis coronariae', ARRAY['Ringbein','Krongelenkarthrose','Schale'], 'gelenk',
  ARRAY['Lahmheit Vorhand','Warmstart-Lahmheit','Gelenkvergrößerung','Schmerzreaktion bei Biegen'],
  'indirect', 'high',
  'Arthritische Veränderung des Krongelenks zwischen Fesselbein und Kronbein. Kann zu Lahmheit und Funktionseinschränkung führen.',
  'Tierärztliche Diagnose (Röntgen); entzündungshemmende Therapie; Gelenkinjektion; angepasster Beschlag; ggf. Gelenkversteifung.'),

('sommerekzem', 'Sommerekzem', 'Sweet Itch', 'Dermatitis allergica insectorum', ARRAY['Sweet Itch','Mückenallergie','Insektenstich-Überempfindlichkeit'], 'haut',
  ARRAY['Starker Juckreiz','Scheuern an Mähne und Schweif','Hautverdickungen','Haarausfall','Wunden durch Scheuern','Saisonal (Sommer)'],
  'none', 'low',
  'Allergische Reaktion auf Speichel von Culicoides-Mücken. Starker Juckreiz führt zu Selbstverletzung durch Scheuern. Nicht heilbar aber gut managebar.',
  'Ekzemerdecke (feinmaschig); Insektenschutzmittel; Stallhaltung bei Dämmerung; Antihistaminika; Kortison in akuten Phasen; Immuntherapie möglich.'),

('mauke', 'Mauke', 'Scratches / Pastern Dermatitis', 'Dermatitis verrucosa', ARRAY['Raspe','Stoppelkrankheit','Fesselgrind','Schlamm-Fieber'], 'haut',
  ARRAY['Krusten im Fesselbereich','Rötung','Nässen','Juckreiz','Schmerzhaftigkeit','Schwellung in schweren Fällen'],
  'direct', 'medium',
  'Entzündung der Haut im Fesselbereich durch Feuchtigkeit, Schmutz oder Pilze/Bakterien. Häufig bei Pferden mit starkem Behang oder bei feuchter Haltung.',
  'Trockenlegen des Fesselbereichs; Krusten vorsichtig entfernen; desinfizierende Cremes; Behang kürzen; trockene Haltung; Antibiotika oder Antimykotika nach Erreger.'),

('druse', 'Druse', 'Strangles', 'Adenitis equi', ARRAY['Strangles','Druse beim Pferd','Streptococcus equi'], 'atemwege',
  ARRAY['Fieber','Nasenausfluss','Geschwollene Lymphknoten','Abszessbildung','Schluckbeschwerden','Husten'],
  'none', 'high',
  'Hochansteckende bakterielle Erkrankung (Streptococcus equi) der oberen Atemwege. Meldepflichtig in manchen Bundesländern. Ausbrüche in Ställen sehr problematisch.',
  'Quarantäne sofort; Tierarzt; Antibiose (umstritten – kann Abszessreifung verzögern); Abszesse reifen lassen und öffnen; Desinfektion des Stalls; keine Impfung für akut Erkrankte.'),

('kolik', 'Kolik', 'Colic', 'Colica equi', ARRAY['Bauchschmerzen Pferd','Darmkolik','Verstopfungskolik','Verlagerungskolik'], 'verdauung',
  ARRAY['Schwitzen','Scharren','Flanken anschauen','Wälzen','Aufstampfen','Erhöhte Herzfrequenz','Keine Kotabsatz','Aufgeblähter Bauch'],
  'none', 'emergency',
  'Akuter Bauchschmerz mit diversen Ursachen (Gasung, Verstopfung, Verlagerung, Darmverschluss). Häufigste Todesursache bei Pferden. Sofortige Behandlung erforderlich.',
  'SOFORT Tierarzt rufen; Pferd nicht allein lassen; kontrolliertes Bewegen erlaubt; keine Nahrung; Schmerztherapie durch Tierarzt; OP bei Verlagerung/Verschluss; Prognose je nach Ursache.'),

('magendarmwuermer', 'Endoparasiten (Würmer)', 'Endoparasites / Worms', NULL, ARRAY['Würmer','Parasiten','Spulwürmer','Strongyliden','Bandwürmer','Kleiner Blutegel'], 'parasiten',
  ARRAY['Gewichtsverlust','Schlechtes Fell','Kolik','Bauchschmerzen','Durchfall','Scheuern am Schweif (Madenwurm)'],
  'none', 'medium',
  'Infektion mit verschiedenen Darmparasiten. Resistenzproblematik durch übermäßigen Einsatz von Entwurmungsmitteln. Selektives Entwurmen nach Kotprobe empfohlen.',
  'Kotprobenuntersuchung vor Entwurmung; selektives Entwurmen nur bei Befall; Weidehygiene; Kotabsammeln auf der Weide; Rotieren der Wirkstoffe.'),

('gastritis_pferd', 'Magenulzera (EGUS)', 'Equine Gastric Ulcer Syndrome', 'Ulcus ventriculi equi', ARRAY['Magengeschwür Pferd','EGUS','Gastritis Pferd'], 'verdauung',
  ARRAY['Gewichtsverlust','Schlechtes Fell','Kolikneigung','Zahneknirschen','Verminderte Futteraufnahme','Leistungsabfall','Verhaltensänderungen'],
  'none', 'high',
  'Magengeschwüre sehr verbreitet bei Sportpferden (bis 90%). Entstehen durch zu lange Fressenpausen, Stress, NSAR-Gabe.',
  'Omeprazol (Gastrogard) als Therapie; Fütterungsoptimierung (viel Heu, kleine Pausen); Stress reduzieren; Kontrolle durch Magenspiegelung; Prävention durch rauhfaserreiche Ernährung.')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  name_latin = EXCLUDED.name_latin,
  aliases = EXCLUDED.aliases,
  category = EXCLUDED.category,
  symptoms = EXCLUDED.symptoms,
  hoof_relevance = EXCLUDED.hoof_relevance,
  urgency = EXCLUDED.urgency,
  description = EXCLUDED.description,
  treatment_notes = EXCLUDED.treatment_notes;

-- ============================================================
-- SEED: hufi_terminology (50 Fachbegriffe)
-- ============================================================

INSERT INTO hufi_terminology (id, term_de, term_en, term_latin, definition, category, related_terms) VALUES

-- Anatomie (10)
('huf', 'Huf', 'Hoof', 'Ungula equi', 'Der Huf ist die Umhüllung des dritten Zehenknochens (Hufbein) beim Pferd, bestehend aus Hufwand, Sohle und Strahl. Er übernimmt tragende, federnde und durchblutungsfördernde Funktionen.', 'anatomie', ARRAY['hufwand','sohle','strahl','hufbein','krone']),

('krone', 'Kronenbein', 'Coronet', 'Os coronae', 'Das Kronenbein (Os coronae) ist der zweite Zehenknochenbei des Pferdes, gelegen zwischen Fesselbein und Hufbein. Der Kronenrand ist die Übergangszone zwischen Haut und Hufwand.', 'anatomie', ARRAY['hufbein','fesselbein','hufwand']),

('strahl', 'Strahl', 'Frog', 'Cuneus ungulae', 'Der Strahl ist eine keilförmige elastische Hornstruktur an der Sohle des Hufs. Er dämpft Aufprallkräfte und fördert die Huf-Herzdruckmechanik (Blutzirkulation). Ein gesunder Strahl ist fest, elastisch und frei von Fäulnis.', 'anatomie', ARRAY['sohle','huf','strahlfaeule','hufmechanismus']),

('hufwand', 'Hufwand', 'Hoof Wall', 'Paries ungulae', 'Die Hufwand besteht aus Röhrchenhorn und schützt die inneren Hufstrukturen. Sie wächst von der Lederhaut (Corium) aus und trägt das gesamte Körpergewicht des Pferdes bei der Abstützung.', 'anatomie', ARRAY['huf','weisse_linie','krone','hufhorn']),

('sohle', 'Sohle', 'Sole', 'Solea ungulae', 'Die Sohle ist die untere hornige Abschlussfläche des Hufs zwischen Hufwand und Strahl. Sie schützt das Innere des Hufs vor Druck von unten und sollte leicht konkav (gewölbt) sein.', 'anatomie', ARRAY['huf','strahl','weisse_linie','flachhuf']),

('weisse_linie', 'Weiße Linie', 'White Line', 'Zona lamellata', 'Die Weiße Linie ist die hornige Verbindungszone zwischen Hufwand und Sohle. Sie verbindet die Hornblättchen der Hufwand mit der Sohle und ist bei Hufbearbeitung sichtbar. Weißlinienkrankheit entsteht bei Infektion dieser Zone.', 'anatomie', ARRAY['hufwand','sohle','weisslinienkrankheit']),

('fessel', 'Fessel', 'Pastern', 'Pars ungularis', 'Die Fessel ist der Bereich zwischen Karpalgelenk/Sprunggelenk und dem Huf, bestehend aus Fesselbein, Kronbein und den dazugehörigen Weichteilen. Ein korrekter Fesselwinkel ist wichtig für Stoßdämpfung und Hufgesundheit.', 'anatomie', ARRAY['fesselbein','kronbein','fessel_winkel']),

('fesselbein', 'Fesselbein', 'Pastern Bone', 'Os compedale', 'Das Fesselbein (Os compedale) ist der erste Zehenknochenbei des Pferdes, zwischen dem Fesselgelenk und dem Krongelenk gelegen. Es überträgt das Körpergewicht auf die unteren Zehenabschnitte.', 'anatomie', ARRAY['fessel','kronbein','hufbein']),

('strahlbein', 'Strahlbein', 'Navicular Bone', 'Os sesamoideum distale', 'Das Strahlbein (Os sesamoideum distale) liegt im Hufkapsel hinter dem Hufbein und dient der tiefen Beugesehne als Umlenkrolle. Bei Podotrochlose ist das Strahlbein degenerativ verändert.', 'anatomie', ARRAY['hufbein','podotrochlose','tiefe_beugesehne']),

('hufbein', 'Hufbein', 'Coffin Bone', 'Os ungulare', 'Das Hufbein (Os ungulare) ist der dritte und unterste Zehenknochenbei des Pferdes, vollständig von der Hufkapsel umschlossen. Bei Hufrehe kann das Hufbein rotieren oder sinken.', 'anatomie', ARRAY['hufrehe','strahlbein','hufkapsel']),

-- Pflege (10)
('barhuf', 'Barhuf', 'Barefoot', NULL, 'Haltungsweise bei der das Pferd ohne Hufeisen gehalten wird. Der Huf wird regelmäßig von einem Hufbearbeiter oder -schmied geformt und geglättet. Viele Pferde leben gesünder barhuf bei ausreichend Bewegung auf verschiedenen Untergründen.', 'pflege', ARRAY['beschlag','hufbearbeitung','barhuf_uebergang']),

('beschlag', 'Beschlag', 'Shoeing', NULL, 'Das Anbringen von Hufeisen an den Pferdehufen durch einen Hufschmied. Beschlag schützt die Hufwand auf hartem Untergrund und ermöglicht orthopädische Korrekturen. Zu unterscheiden: Kalt- und Warmbeschlag.', 'pflege', ARRAY['hufeisen','hufschmied','barhuf','orthop_beschlag']),

('raspe', 'Raspel', 'Rasp', 'Lima', 'Die Huf-Raspel ist das wichtigste Werkzeug des Hufbearbeiters und -schmieds. Sie dient zum Formen der Hufwand, Glätten nach der Bearbeitung und Entfernen von überschüssigem Horn. Erhältlich in verschiedenen Körnungen.', 'pflege', ARRAY['hufbearbeitung','hufschmied','hufmesser']),

('zange', 'Hufzange', 'Nippers', NULL, 'Die Hufzange (Nippers) ist eine zangenartige Schere zum Kürzen der Hufwand. Sie schneidet überschüssiges Horn ab bevor mit der Raspel gearbeitet wird. Wichtigstes schneidendes Werkzeug der Hufpflege.', 'pflege', ARRAY['raspe','hufmesser','hufbearbeitung']),

('hufeisen', 'Hufeisen', 'Horseshoe', 'Ferrum equinum', 'Hufeisen sind U-förmige Metallplatten (Stahl oder Aluminium) die an den Pferdehufen befestigt werden. Sie schützen die Hufwand vor Abrieb und ermöglichen durch ihre Form orthopädische Anpassungen.', 'pflege', ARRAY['beschlag','hufschmied','stollen','klebeisen']),

('hufmesser', 'Hufmesser', 'Hoof Knife', NULL, 'Das Hufmesser ist ein gekrümmtes Messer zum Ausschneiden von Hornmaterial beim Huf. Es gibt gerade und gebogene Versionen für linke und rechte Hand. Wichtig für das Freilegen von Strahlfäule und Abszessen.', 'pflege', ARRAY['raspe','zange','hufbearbeitung']),

('hufpick', 'Hufpick', 'Hoof Pick', NULL, 'Der Hufpick ist ein einfaches spitzes Werkzeug zum täglichen Ausmisten der Hufe. Das Entfernen von Schmutz, Steinen und Mist aus dem Huf ist grundlegende Hygienemaßnahme und Krankheitsvorbeugung.', 'pflege', ARRAY['huf','strahlfaeule','hufpflege']),

('polstereisen', 'Polstereisen', 'Padded Shoe', NULL, 'Hufeisen mit Kunststoff- oder Gummipolster zwischen Eisen und Hufsohle. Schützt empfindliche Sohlen vor Druck und dämpft Aufprallkräfte. Eingesetzt bei Hufrehe, flachen Hufen und nach Steinauftritten.', 'pflege', ARRAY['hufeisen','beschlag','hufrehe','flachhuf']),

('hufpflegeoel', 'Hufpflegeöl', 'Hoof Oil', NULL, 'Pflegemittel zur Pflege und Feuchtigkeitsregulation der Hufwand. Sollte nicht übermäßig angewendet werden da zu viel Feuchtigkeit die Hufstruktur schwächen kann. Am besten gezielt bei sehr trockenen rissigen Hufen.', 'pflege', ARRAY['huf','hufwand','hufpflege']),

('kneifer', 'Kneifer', 'Pull-offs', NULL, 'Spezialzange zum Lösen und Entfernen von Hufeisen beim Entbeschlag oder Umschmieden. Wird genutzt um Eisen rückstandsfrei abzuheben ohne die Hufwand zu beschädigen.', 'pflege', ARRAY['hufeisen','beschlag','hufschmied']),

-- Haltung (8)
('offenstall', 'Offenstall', 'Open Stable / Track System', NULL, 'Haltungsform bei der Pferde freien Zugang zum Außenbereich haben und sich sozial in der Herde bewegen können. Fördert Hufgesundheit durch natürliche Bewegung und verschiedene Untergründe.', 'haltung', ARRAY['paddockbox','einzelbox','weide','hufgesundheit']),

('paddockbox', 'Paddockbox', 'Paddock Box', NULL, 'Kombination aus überdachter Box und angrenzendem Außenpaddock. Ermöglicht dem Pferd selbstbestimmten Zugang nach draußen bei gleichzeitigem Witterungsschutz.', 'haltung', ARRAY['einzelbox','offenstall','auslauf']),

('einzelbox', 'Einzelbox', 'Single Stall / Box Stall', NULL, 'Traditionelle Haltungsform bei der das Pferd in einer abgetrennten Box untergebracht ist. Ermöglicht individuelle Fütterung aber reduziert natürliche Bewegung und sozialen Kontakt.', 'haltung', ARRAY['offenstall','paddockbox','einstreu']),

('koppel', 'Koppel', 'Paddock', NULL, 'Eingezäunter Auslaufbereich für Pferde, meist kleiner als eine Weide und ohne oder mit wenig Gras. Dient Bewegung und sozialem Kontakt ohne übermäßigen Graszugang.', 'haltung', ARRAY['weide','offenstall','bewegung']),

('weide', 'Weide', 'Pasture', NULL, 'Grasbewachsene Fläche zur Beweidung durch Pferde. Wichtig für natürliches Verhalten und Bewegung, aber bei zuckerreichem Gras Vorsicht bei Hufrehe-anfälligen Pferden.', 'haltung', ARRAY['koppel','hufrehe','ems','gras']),

('einstreu', 'Einstreu', 'Bedding', NULL, 'Material auf dem Boxenboden zur Feuchtigkeitsaufnahme und Polsterung. Gute Einstreu ist trocken und saugfähig. Zu feuchte Einstreu fördert Strahlfäule und Mauke.', 'haltung', ARRAY['stroh','spaene','strahlfaeule','box']),

('stroh', 'Stroh', 'Straw', NULL, 'Traditionelles Einstreumaterial aus Getreidehalmrückständen. Gut für Komfort, aber Pferde fressen es (Kalorien beachten). Feuchtes Stroh fördert Hufprobleme.', 'haltung', ARRAY['einstreu','spaene','box']),

('spaene', 'Späne', 'Wood Shavings', NULL, 'Holzspäne als Einstreumaterial. Sehr saugfähig und hygienisch, beliebt in modernen Ställen. Darauf achten dass keine terpentinhaltigen Holzarten (z.B. Fichte) verwendet werden.', 'haltung', ARRAY['einstreu','stroh','box']),

-- Training (8)
('dressur', 'Dressur', 'Dressage', NULL, 'Klassische Reiterliche Disziplin bei der Pferd und Reiter harmonische Zusammenarbeit in Lektionen zeigen. Von einfachen Schulaufgaben bis zu Piaffe und Passage. Fördert Durchlässigkeit und Anlehnung.', 'training', ARRAY['reitlehrer','grundgangarten','durchlaessigkeit']),

('springen', 'Springen', 'Show Jumping', NULL, 'Reiterliche Disziplin bei der Pferd und Reiter einen Hindernisparcours fehlerfrei überwinden. Von kleinen Cavaletti bis zu Grand Prix-Höhen. Erfordert gutes Springvermögen und Kondition.', 'training', ARRAY['reitlehrer','parcours','hindernisse']),

('vielseitigkeit', 'Vielseitigkeit', 'Eventing', NULL, 'Kombinierte Disziplin aus Dressur, Geländereiten und Springen. Testet Pferd und Reiter in verschiedenen Anforderungen. Auch Military oder Three-Day-Event genannt.', 'training', ARRAY['dressur','springen','gelaende']),

('westernreiten', 'Westernreiten', 'Western Riding', NULL, 'Aus der amerikanischen Cowboy-Tradition entstandene Reitweise mit spezieller Ausrüstung (Western-Sattel, Bosal/Hackamore). Disziplinen: Reining, Cutting, Trail, Barrel Racing.', 'training', ARRAY['western_trainer','reining','quarter_horse']),

('freiarbeit', 'Freiarbeit', 'Liberty Work', NULL, 'Training des Pferdes ohne Zügel, Longe oder Halfter – allein durch Körpersprache und gegenseitiges Vertrauen. Teil des Natural Horsemanship. Zeigt tiefe Verbindung zwischen Mensch und Pferd.', 'training', ARRAY['bodenarbeit','horsemanship','liberty']),

('bodenarbeit', 'Bodenarbeit', 'Groundwork', NULL, 'Training des Pferdes vom Boden aus ohne aufgesessen zu reiten. Beinhaltet Führen, Longieren, Desensibilisierung, Zirkulation und Lektionen an der Hand. Grundlage für alle weiteren Ausbildungsstufen.', 'training', ARRAY['longieren','horsemanship','freiarbeit','desensibilisierung']),

('longieren', 'Longieren', 'Lungeing / Longeing', NULL, 'Training des Pferdes an einer langen Leine (Longe) auf einem Kreis. Dient Konditionsaufbau, Muskelentwicklung, Ausbildung und Beurteilung der Bewegung. Auch als Aufwärmen oder therapeutische Maßnahme.', 'training', ARRAY['longe','bodenarbeit','reitlehrer']),

('gangpferd', 'Gangpferd', 'Gaited Horse', NULL, 'Pferd mit natürlichem Sondertakt (Tölt, Pass, Fox Trot) zusätzlich zu den drei Grundgangarten. Diese Gänge sind sehr bequem für den Reiter. Beispiele: Isländer, Tennessee Walker, Paso Fino.', 'training', ARRAY['islaender','tennessee_walker','paso_fino','toelt']),

-- Recht/Business (7)
('tierschutzgesetz', 'Tierschutzgesetz', 'Animal Welfare Act', NULL, 'Deutsches Bundesgesetz zum Schutz von Tieren. Regelt Anforderungen an Haltung, Transport, Nutzung und Schlachtung. Verstöße gegen Mindeststandards der Pferdehaltung sind strafbar.', 'recht', ARRAY['tierhalterhaftung','veterinärrecht']),

('tierhalterhaftung', 'Tierhalterhaftpflicht', 'Equine Liability Insurance', NULL, 'Haftung des Pferdehalters für Schäden die durch sein Pferd verursacht werden (§833 BGB). Verschuldensunabhängig – der Halter haftet auch ohne Fehler. Spezielle Haftpflichtversicherung unbedingt empfohlen.', 'recht', ARRAY['tierschutzgesetz','versicherung_pferd']),

('pflegevertrag', 'Pflegevertrag', 'Care Contract', NULL, 'Vertrag über die entgeltliche oder unentgeltliche Pflege eines Pferdes durch eine andere Person als den Eigentümer. Regelt Pflichten, Haftung und Kosten. Schriftliche Form dringend empfohlen.', 'recht', ARRAY['einstellungsvertrag','tierhalterhaftung']),

('einstellungsvertrag', 'Einstellungsvertrag', 'Boarding Contract', NULL, 'Vertrag zwischen Stallbesitzer und Pferdeeinsteller über die Einstellung und Versorgung des Pferdes. Regelt Leistungsumfang, Preis, Kündigung und Haftung. Schriftliche Vereinbarung ist Standard.', 'recht', ARRAY['stallbesitzer','pflegevertrag','tierhalterhaftung']),

('kaufvertrag_pferd', 'Kaufvertrag Pferd', 'Horse Purchase Contract', NULL, 'Rechtsverbindliche Vereinbarung beim Kauf und Verkauf eines Pferdes. Sollte schriftlich erfolgen und Angaben zu Alter, Gesundheitszustand, Mängeln, Preis und Gewährleistung enthalten.', 'recht', ARRAY['pferdehandel','ankaufsuntersuchung','gewaehrleistung']),

('veterinärrecht', 'Veterinärrecht', 'Veterinary Law', NULL, 'Rechtliche Bestimmungen rund um Tiergesundheit, Tierhaltung und Tierschutz. Umfasst Tierseuchenrecht, Arzneimittelrecht für Tiere und Berufsrecht der Tierärzte.', 'recht', ARRAY['tierschutzgesetz','tierarzt_pferd']),

('betaeubungsmittel', 'Betäubungsmittelgesetz (BtMG)', 'Narcotics Act', NULL, 'Bundesgesetz das Umgang mit Betäubungsmitteln regelt, relevant für Tierärzte bei Sedierung und Schmerzbehandlung von Pferden. Strikte Aufzeichnungspflichten.', 'recht', ARRAY['tierarzt_pferd','veterinärrecht']),

-- Rassen (7)
('warmblut', 'Warmblut', 'Warmblood', NULL, 'Sammelbezeichnung für veredelte Reitpferde-Rassen aus der Kreuzung von Kaltblut und Vollblut. Beispiele: Hannoveraner, Holsteiner, KWPN. Ideal für Dressur und Springen.', 'rassen', ARRAY['kaltblut','vollblut','hannoveraner','holsteiner']),

('kaltblut', 'Kaltblut', 'Coldblood / Draft Horse', NULL, 'Schwere zugpferdetypen mit ruhigem Temperament und massigem Körperbau. Früher als Arbeitspferde, heute selten. Beispiele: Noriker, Schwarzwälder, Rheinisch-Deutsches Kaltblut.', 'rassen', ARRAY['warmblut','zugpferd','noriker']),

('vollblut', 'Vollblut', 'Thoroughbred', NULL, 'Reinblütige Rennpferderassen, meist Englisches Vollblut. Sehr schnell, fein und sensibel. Eingetragen im Gestütsbuch/Stutbuch der jeweiligen Vollblutzucht. Hohe Anforderungen an Haltung und Pflege.', 'rassen', ARRAY['englisches_vollblut','arabisches_vollblut','rennsport']),

('pony', 'Pony', 'Pony', NULL, 'Kleinpferde bis ca. 148 cm Stockmaß. Viele verschiedene Rassen mit unterschiedlichem Charakter. Oft robuster als Großpferde aber häufig leichtfuttrig und hufrehe-anfällig (insbes. Haflinger, Shetty).', 'rassen', ARRAY['haflinger','shetlandpony','welsh_pony','hufrehe']),

('zwergpferd', 'Zwergpferd', 'Miniature Horse', NULL, 'Sehr kleine Pferdeartige unter 90 cm Stockmaß. Werden nicht geritten, häufig als Begleit- oder Showpferde. Strenge Futterkontrolle nötig da sehr hufrehe-anfällig.', 'rassen', ARRAY['pony','hufrehe']),

('halbblut', 'Halbblut', 'Halfblood', NULL, 'Informelle Bezeichnung für Pferde die zu 50% Warmblut/Vollblut und zu 50% einer anderen Rasse entstammen. Heute kaum noch offizielle Rassenbezeichnung; eher descriptiv.', 'rassen', ARRAY['warmblut','vollblut','kreuzung']),

('iberier', 'Iberier', 'Iberian', NULL, 'Sammelbezeichnung für iberische Pferderassen wie Andalusier (PRE) und Lusitano (PSL). Bekannt für Kollektion, Eleganz und natürliche Versammlung. Anfällig für EMS bei falscher Fütterung.', 'rassen', ARRAY['andalusier','lusitano','ems','dressur'])

ON CONFLICT (id) DO UPDATE SET
  term_de = EXCLUDED.term_de,
  term_en = EXCLUDED.term_en,
  term_latin = EXCLUDED.term_latin,
  definition = EXCLUDED.definition,
  category = EXCLUDED.category,
  related_terms = EXCLUDED.related_terms;

-- ============================================================
-- SEED: hufi_keywords
-- ============================================================

INSERT INTO hufi_keywords (keyword, language, entity_type, entity_id) VALUES

-- Rassen → breed
('hannoveraner','de','breed','hannoveraner'),
('hann','de','breed','hannoveraner'),
('holsteiner','de','breed','holsteiner'),
('westfale','de','breed','westfale'),
('westfälisches warmblut','de','breed','westfale'),
('trakehner','de','breed','trakehner'),
('oldenburger','de','breed','oldenburger'),
('rheinländer','de','breed','rheinlaender'),
('kwpn','de','breed','kwpn'),
('niederländisches warmblut','de','breed','kwpn'),
('dutch warmblood','en','breed','kwpn'),
('bayerisches warmblut','de','breed','bayerisches_warmblut'),
('lipizzaner','de','breed','lipizzaner'),
('lipizzan','en','breed','lipizzaner'),
('andalusier','de','breed','andalusier'),
('pre','de','breed','andalusier'),
('pura raza española','de','breed','andalusier'),
('lusitano','de','breed','lusitano'),
('psl','de','breed','lusitano'),
('araber','de','breed','arabisches_vollblut'),
('arabisches vollblut','de','breed','arabisches_vollblut'),
('arabian','en','breed','arabisches_vollblut'),
('anglo-araber','de','breed','anglo_araber'),
('vollblut','de','breed','englisches_vollblut'),
('thoroughbred','en','breed','englisches_vollblut'),
('friese','de','breed','friese'),
('friesenpferd','de','breed','friese'),
('friesian','en','breed','friese'),
('haflinger','de','breed','haflinger'),
('fjordpferd','de','breed','fjordpferd'),
('norweger','de','breed','fjordpferd'),
('isländer','de','breed','islaender'),
('islandpferd','de','breed','islaender'),
('icelandic horse','en','breed','islaender'),
('shetlandpony','de','breed','shetlandpony'),
('shetty','de','breed','shetlandpony'),
('welsh pony','de','breed','welsh_pony'),
('welsh','de','breed','welsh_pony'),
('quarter horse','de','breed','quarter_horse'),
('american quarter horse','en','breed','quarter_horse'),
('paint horse','de','breed','paint_horse'),
('appaloosa','de','breed','appaloosa'),
('mustang','de','breed','mustang'),
('paso fino','de','breed','paso_fino'),
('tennessee walker','de','breed','tennessee_walker'),
('tennessee walking horse','en','breed','tennessee_walker'),
('criollo','de','breed','criollo'),
('kreolenpferd','de','breed','criollo'),
('missouri fox trotter','de','breed','missouri_fox_trotter'),
('konik','de','breed','konik'),
('exmoor pony','de','breed','exmoor_pony'),

-- Erkrankungen → condition
('strahlfäule','de','condition','strahlfaeule'),
('thrush','en','condition','strahlfaeule'),
('strahlfaeule','de','condition','strahlfaeule'),
('schwarzer strahl','de','condition','strahlfaeule'),
('hufrehe','de','condition','hufrehe'),
('rehe','de','condition','hufrehe'),
('laminitis','en','condition','hufrehe'),
('weißlinienkrankheit','de','condition','weisslinienkrankheit'),
('weisslinienkrankheit','de','condition','weisslinienkrankheit'),
('white line disease','en','condition','weisslinienkrankheit'),
('wld','de','condition','weisslinienkrankheit'),
('barhuf übergang','de','condition','barhuf_uebergang'),
('entbeschlag','de','condition','barhuf_uebergang'),
('bockhuf','de','condition','bockhuf'),
('club foot','en','condition','bockhuf'),
('steilhuf','de','condition','bockhuf'),
('flachhuf','de','condition','flachhuf'),
('flat foot','en','condition','flachhuf'),
('hufgeschwür','de','condition','hufgeschwuer'),
('hufabszess','de','condition','hufgeschwuer'),
('abszess huf','de','condition','hufgeschwuer'),
('hufkrebs','de','condition','hufkrebs'),
('canker','en','condition','hufkrebs'),
('podotrochlose','de','condition','podotrochlose'),
('navicular','en','condition','podotrochlose'),
('strahlbeinlahmheit','de','condition','podotrochlose'),
('hufrollenproblem','de','condition','podotrochlose'),
('ems','de','condition','ems'),
('equines metabolisches syndrom','de','condition','ems'),
('insulinresistenz','de','condition','ems'),
('cushing','de','condition','ppid_cushing'),
('ppid','de','condition','ppid_cushing'),
('cushing pferd','de','condition','ppid_cushing'),
('insulin dysregulation','de','condition','insulin_dysregulation'),
('insulindysregulation','de','condition','insulin_dysregulation'),
('lahmheit','de','condition','lahmheit'),
('lahm','de','condition','lahmheit'),
('lameness','en','condition','lahmheit'),
('arthrose','de','condition','arthrose'),
('gelenkarthrose','de','condition','arthrose'),
('osteoarthritis','en','condition','arthrose'),
('sehnenprobleme','de','condition','sehnenprobleme'),
('sehnenentzündung','de','condition','sehnenprobleme'),
('tendinitis','en','condition','sehnenprobleme'),
('spat','de','condition','spat'),
('spavin','en','condition','spat'),
('krongelenkentzündung','de','condition','krongelenkentzuendung'),
('ringbein','de','condition','krongelenkentzuendung'),
('sommerekzem','de','condition','sommerekzem'),
('sweet itch','en','condition','sommerekzem'),
('mauke','de','condition','mauke'),
('scratches','en','condition','mauke'),
('fesselgrind','de','condition','mauke'),
('druse','de','condition','druse'),
('strangles','en','condition','druse'),
('kolik','de','condition','kolik'),
('colic','en','condition','kolik'),
('würmer pferd','de','condition','magendarmwuermer'),
('parasiten pferd','de','condition','magendarmwuermer'),
('strongyliden','de','condition','magendarmwuermer'),
('magenulzera','de','condition','gastritis_pferd'),
('magengeschwür pferd','de','condition','gastritis_pferd'),
('egus','de','condition','gastritis_pferd'),

-- Berufe → profession (aus relevant_keywords)
('huf','de','profession','hufbearbeiter'),
('hufpflege','de','profession','hufbearbeiter'),
('barhuf','de','profession','hufbearbeiter'),
('hufpfleger','de','profession','hufbearbeiter'),
('nhcp','de','profession','hufbearbeiter'),
('schmied','de','profession','hufschmied'),
('beschlag','de','profession','hufschmied'),
('hufeisen','de','profession','hufschmied'),
('farrier','en','profession','hufschmied'),
('orthopädie huf','de','profession','huforthopaedie'),
('hufrehab','de','profession','huforthopaedie'),
('physio pferd','de','profession','pferdephysiotherapeut'),
('physiotherapie pferd','de','profession','pferdephysiotherapeut'),
('massage pferd','de','profession','pferdephysiotherapeut'),
('osteopathie pferd','de','profession','pferdeosteopath'),
('chiropraktik pferd','de','profession','pferdechiropraktiker'),
('zahn pferd','de','profession','pferdezahnpfleger'),
('dental pferd','de','profession','pferdezahnpfleger'),
('tierarzt pferd','de','profession','tierarzt_pferd'),
('vet','en','profession','tierarzt_pferd'),
('heilpraktiker pferd','de','profession','pferde_heilpraktiker'),
('homöopathie pferd','de','profession','pferde_heilpraktiker'),
('reitlehrer','de','profession','reitlehrer'),
('reitunterricht','de','profession','reitlehrer'),
('reitstunde','de','profession','reitlehrer'),
('horsemanship','de','profession','horsemanship_trainer'),
('bodenarbeit trainer','de','profession','horsemanship_trainer'),
('western trainer','de','profession','western_trainer'),
('reining','de','profession','western_trainer'),
('voltigieren','de','profession','voltigiertrainer'),
('distanzreiten','de','profession','distanz_trainer'),
('endurance trainer','de','profession','distanz_trainer'),
('jungpferde ausbildung','de','profession','jungpferde_trainer'),
('anreiten','de','profession','jungpferde_trainer'),
('pensionsstall','de','profession','stallbesitzer'),
('reitanlage','de','profession','stallbesitzer'),
('pferdepfleger','de','profession','pferdepfleger'),
('groom','en','profession','pferdepfleger'),
('zucht pferd','de','profession','pferdezuechter'),
('fohlen','de','profession','pferdezuechter'),
('ernährungsberatung pferd','de','profession','pferdeernährungsberater'),
('futterplan pferd','de','profession','pferdeernährungsberater'),
('futtermittel pferd','de','profession','futtermittelberater'),
('hippotherapie','de','profession','hippotherapeut'),
('therapeutisches reiten','de','profession','hippotherapeut'),
('reitpädagoge','de','profession','reitpaedagoge'),
('eal coach','de','profession','reitpaedagoge'),
('sattler','de','profession','sattler'),
('sattelanpassung','de','profession','sattler'),
('pferdekauf','de','profession','pferdehandel'),
('pferdeverkauf','de','profession','pferdehandel'),
('pferdetransport','de','profession','pferdetransport'),
('pferdetaxi','de','profession','pferdetransport'),

-- Terminologie → terminology
('huf','de','terminology','huf'),
('hoof','en','terminology','huf'),
('kronenbein','de','terminology','krone'),
('coronet','en','terminology','krone'),
('strahl','de','terminology','strahl'),
('frog','en','terminology','strahl'),
('hufwand','de','terminology','hufwand'),
('hoof wall','en','terminology','hufwand'),
('sohle','de','terminology','sohle'),
('sole','en','terminology','sohle'),
('weiße linie','de','terminology','weisse_linie'),
('white line','en','terminology','weisse_linie'),
('fessel','de','terminology','fessel'),
('pastern','en','terminology','fessel'),
('fesselbein','de','terminology','fesselbein'),
('strahlbein','de','terminology','strahlbein'),
('navicular bone','en','terminology','strahlbein'),
('hufbein','de','terminology','hufbein'),
('coffin bone','en','terminology','hufbein'),
('barhuf','de','terminology','barhuf'),
('barefoot','en','terminology','barhuf'),
('beschlag','de','terminology','beschlag'),
('shoeing','en','terminology','beschlag'),
('raspel','de','terminology','raspe'),
('rasp','en','terminology','raspe'),
('hufzange','de','terminology','zange'),
('hufeisen','de','terminology','hufeisen'),
('horseshoe','en','terminology','hufeisen'),
('hufmesser','de','terminology','hufmesser'),
('offenstall','de','terminology','offenstall'),
('paddockbox','de','terminology','paddockbox'),
('dressur','de','terminology','dressur'),
('dressage','en','terminology','dressur'),
('longieren','de','terminology','longieren'),
('bodenarbeit','de','terminology','bodenarbeit'),
('groundwork','en','terminology','bodenarbeit'),
('warmblut','de','terminology','warmblut'),
('warmblood','en','terminology','warmblut'),
('kaltblut','de','terminology','kaltblut'),
('vollblut','de','terminology','vollblut'),
('pony','de','terminology','pony'),
('tierschutzgesetz','de','terminology','tierschutzgesetz'),
('tierhalterhaftung','de','terminology','tierhalterhaftung'),
('einstellungsvertrag','de','terminology','einstellungsvertrag'),
('kaufvertrag pferd','de','terminology','kaufvertrag_pferd')

ON CONFLICT (keyword, entity_type, entity_id) DO NOTHING;
