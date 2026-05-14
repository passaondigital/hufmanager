// Hufi Horse Knowledge Base
// Rassen, Gesundheit, Verhalten, Ausrüstung — Deutsch & Englisch

// ── PFERDERASSEN (200+, kategorisiert) ────────────────────────────────────

export interface HorseBreed {
  name: string;           // Hauptname DE
  nameEn?: string;        // Englischer Name
  aliases: string[];      // Synonyme
  category: BreedCategory;
  origin: string;
  characteristics: string[];  // Typische Eigenschaften
  commonUses: string[];
  healthNotes?: string;   // Rassetypische Gesundheitshinweise
}

export type BreedCategory =
  | "warmblood"    // Warmblut
  | "coldblood"    // Kaltblut
  | "thoroughbred" // Vollblut
  | "pony"         // Pony
  | "western"      // Westernrassen
  | "gaited"       // Gangpferde
  | "iberian"      // Iberische
  | "oriental"     // Orientalische
  | "draft"        // Zugpferde
  | "miniature"    // Mini/Zwerg
  | "specialty";   // Speziell

export const HORSE_BREEDS: HorseBreed[] = [
  // WARMBLUT
  { name: "Hannoveraner", nameEn: "Hanoverian", aliases: ["Hannoveraner Warmblut"], category: "warmblood", origin: "Deutschland", characteristics: ["Groß", "Edel", "Leistungsstark", "Für Dressur & Springen"], commonUses: ["Dressur", "Springen", "Vielseitigkeit"], healthNotes: "Neigung zu OCD, aufmerksam auf Beingesundheit" },
  { name: "Oldenburger", nameEn: "Oldenburg", aliases: [], category: "warmblood", origin: "Deutschland", characteristics: ["Groß", "Kräftig", "Ausdrucksstark"], commonUses: ["Dressur", "Springen"], healthNotes: "Magengeschwüre bei hohem Trainingspensum" },
  { name: "Trakehner", nameEn: "Trakehner", aliases: [], category: "warmblood", origin: "Deutschland (Ostpreußen)", characteristics: ["Edel", "Sensibel", "Ausdauernd", "Araber-Einfluss"], commonUses: ["Dressur", "Vielseitigkeit", "Distanz"] },
  { name: "Westfale", nameEn: "Westphalian", aliases: ["Westfälisches Warmblut"], category: "warmblood", origin: "Deutschland", characteristics: ["Kräftig", "Verlässlich", "Vielseitig"], commonUses: ["Dressur", "Springen"] },
  { name: "KWPN", nameEn: "Dutch Warmblood", aliases: ["Holländisches Warmblut", "Niederländisches Warmblut"], category: "warmblood", origin: "Niederlande", characteristics: ["Leistungsstark", "Schwungvoll", "Top-Sportpferd"], commonUses: ["Dressur", "Springen"] },
  { name: "Selle Français", aliases: ["SF"], category: "warmblood", origin: "Frankreich", characteristics: ["Springtalent", "Ausdauer", "Athletisch"], commonUses: ["Springen", "Vielseitigkeit"] },
  { name: "OTTB", nameEn: "Off-Track Thoroughbred", aliases: ["Ex-Rennpferd", "Rennpferd Umschulung"], category: "thoroughbred", origin: "International", characteristics: ["Schnell", "Sensibel", "Arbeitswillig", "Braucht Geduld"], commonUses: ["Umschulung", "Vielseitigkeit", "Reiten"], healthNotes: "Häufig magersüchtig nach Rennsport, Magengeschwüre" },
  { name: "Belgisches Warmblut", nameEn: "Belgian Warmblood", aliases: ["BWP"], category: "warmblood", origin: "Belgien", characteristics: ["Springtalent", "Gehorsam"], commonUses: ["Springen"] },
  { name: "Lusitano", aliases: ["Lusitaner"], category: "iberian", origin: "Portugal", characteristics: ["Edel", "Gelehrig", "Schrittstärke"], commonUses: ["Dressur", "Pferdearbeit", "Working Equitation"] },
  { name: "PRE", nameEn: "Pura Raza Española", aliases: ["Andalusier", "Spanisches Pferd"], category: "iberian", origin: "Spanien", characteristics: ["Schrittstärke", "Impulsiv", "Ausdrucksstark", "Stolz"], commonUses: ["Dressur", "Barockreiten", "Parade"] },

  // VOLLBLUT
  { name: "Englisches Vollblut", nameEn: "Thoroughbred", aliases: ["Vollblut", "TB"], category: "thoroughbred", origin: "England", characteristics: ["Extrem schnell", "Sensibel", "Schmal", "Ausdauernd"], commonUses: ["Rennsport", "Vielseitigkeit", "Springen"], healthNotes: "Magengeschwüre häufig, feine Haut, Hufpflege wichtig" },
  { name: "Arabisches Vollblut", nameEn: "Arabian", aliases: ["Araber", "Arab"], category: "oriental", origin: "Arabische Halbinsel", characteristics: ["Ausdauernd", "Intelligent", "Edel", "Hitzeresistent"], commonUses: ["Distanzreiten", "Zucht", "Dressur"], healthNotes: "Magengeschwüre, Erbkrankheiten (SCID bei Reinzucht prüfen)" },
  { name: "Anglo-Araber", nameEn: "Anglo-Arabian", aliases: ["AA"], category: "thoroughbred", origin: "Frankreich", characteristics: ["Schnell", "Ausdauernd", "Vielseitig"], commonUses: ["Vielseitigkeit", "Distanz", "Springen"] },
  { name: "Shagya-Araber", aliases: ["Shagya"], category: "oriental", origin: "Ungarn", characteristics: ["Edel", "Ausdauernd", "Robust"], commonUses: ["Distanzreiten", "Dressur"] },

  // KALTBLUT & ZUGPFERDE
  { name: "Noriker", aliases: ["Norisches Kaltblut", "Pinzgauer"], category: "coldblood", origin: "Österreich", characteristics: ["Gutmütig", "Kräftig", "Robust"], commonUses: ["Zugarbeit", "Freizeit", "Wanderreiten"] },
  { name: "Haflinger", aliases: ["Avelignese"], category: "coldblood", origin: "Südtirol/Österreich", characteristics: ["Robust", "Ausdauernd", "Freundlich", "Vielseitig"], commonUses: ["Freizeitreiten", "Voltigieren", "Wanderreiten"], healthNotes: "Neigung zu EMS, Adipositas — Fütterung kontrollieren" },
  { name: "Shire", aliases: ["Shire Horse"], category: "draft", origin: "England", characteristics: ["Sehr groß (bis 195cm)", "Sanft", "Behäbig"], commonUses: ["Zugarbeit", "Schaustellung", "Freizeit"] },
  { name: "Kaltblut", nameEn: "Draft Horse", aliases: ["Schweres Warmblut"], category: "coldblood", origin: "International", characteristics: ["Kräftig", "Ruhig", "Zugstark"], commonUses: ["Forstarbeit", "Landwirtschaft", "Kutschenfahren"] },
  { name: "Schwarzwälder Fuchs", aliases: ["Schwarzwälder Kaltblut"], category: "coldblood", origin: "Deutschland (Schwarzwald)", characteristics: ["Kompakt", "Robust", "Füchsig", "Freundlich"], commonUses: ["Zugarbeit", "Freizeit", "Tourismus"] },
  { name: "Rheinisch-Deutsches Kaltblut", aliases: ["RDK"], category: "coldblood", origin: "Deutschland", characteristics: ["Groß", "Schwer", "Ausdauernd"], commonUses: ["Zugarbeit"] },

  // PONYS
  { name: "Shetland Pony", nameEn: "Shetland Pony", aliases: ["Shetländer", "Shetty"], category: "pony", origin: "Schottland (Shetlandinseln)", characteristics: ["Klein (bis 107cm)", "Robust", "Schlau", "Dickköpfig"], commonUses: ["Kinder", "Voltigieren", "Kutsche"], healthNotes: "Sehr neigung zu EMS/Hufrehe — Weidezugang einschränken" },
  { name: "Welsh Pony", aliases: ["Welsh Mountain", "Welsh Cob"], category: "pony", origin: "Wales", characteristics: ["Sportlich", "Robust", "Ausdauernd"], commonUses: ["Kinder", "Springen", "Fahrpony"] },
  { name: "Isländer", nameEn: "Icelandic Horse", aliases: ["Islandpferd", "Islänger", "Íslenskt hross"], category: "pony", origin: "Island", characteristics: ["Tölt-Gang", "Robust", "Freundlich", "Klein (140-148cm)"], commonUses: ["Gangpferderitt", "Wanderreiten", "Freizeitreiten"], healthNotes: "Kommen nur einmal aus Island — keine Rückkehr erlaubt (Seuchenschutz)" },
  { name: "Konik", nameEn: "Konik", aliases: [], category: "pony", origin: "Polen", characteristics: ["Wildtyp", "Robust", "Scheues Wesen"], commonUses: ["Naturschutz", "Halbwild"] },
  { name: "Fjordpferd", nameEn: "Norwegian Fjord", aliases: ["Norweger", "Fjord"], category: "pony", origin: "Norwegen", characteristics: ["Typisch Fahlfarbe", "Robust", "Gutmütig", "Ausdauernd"], commonUses: ["Freizeitreiten", "Kutsche", "Kinder"] },
  { name: "Deutsches Classic Pony", aliases: ["DCP", "Miniatur-Shetty"], category: "miniature", origin: "Deutschland", characteristics: ["Sehr klein", "Familienfreundlich"], commonUses: ["Kinder", "Voltigieren"] },
  { name: "New Forest Pony", aliases: ["New Forest"], category: "pony", origin: "England", characteristics: ["Robust", "Geländetauglich"], commonUses: ["Kinder", "Springen", "Wanderreiten"] },
  { name: "Dartmoor Pony", aliases: [], category: "pony", origin: "England", characteristics: ["Robust", "Genügsam"], commonUses: ["Kinder", "Freizeitreiten"] },
  { name: "Exmoor Pony", aliases: [], category: "pony", origin: "England", characteristics: ["Älteste Pony-Rasse Englands", "Robust", "Wildtyp"], commonUses: ["Halbwild", "Naturschutz"] },

  // WESTERNRASSEN
  { name: "Quarter Horse", nameEn: "American Quarter Horse", aliases: ["QH", "American Quarter"], category: "western", origin: "USA", characteristics: ["Kurze schnelle Sprints", "Muskulös", "Ruhig", "Vielseitig"], commonUses: ["Western", "Reining", "Cutting", "Barrel Racing", "Rodeo"] },
  { name: "Paint Horse", nameEn: "Paint Horse", aliases: ["Paint", "APHA"], category: "western", origin: "USA", characteristics: ["Gescheckt", "Ähnlich QH", "Freundlich"], commonUses: ["Western", "Freizeitreiten"] },
  { name: "Appaloosa", nameEn: "Appaloosa", aliases: ["Appy", "Tigerpferd"], category: "western", origin: "USA (Nez Perce)", characteristics: ["Getüpfelt/Gefleckt", "Robust", "Vielseitig"], commonUses: ["Western", "Freizeitreiten"] },
  { name: "Mustang", nameEn: "Mustang", aliases: ["Wild Horse", "Kiger Mustang"], category: "western", origin: "USA (wild)", characteristics: ["Robust", "Zäh", "Braucht Vertrauen"], commonUses: ["Freizeitreiten nach Gentling", "Western"] },
  { name: "Morgan", nameEn: "Morgan", aliases: [], category: "western", origin: "USA", characteristics: ["Kompakt", "Elegant", "Ausdauernd"], commonUses: ["Western", "Pleasure", "Dressur"] },

  // GANGPFERDE
  { name: "Paso Fino", nameEn: "Paso Fino", aliases: ["Paso"], category: "gaited", origin: "Lateinamerika", characteristics: ["Natürlicher Viertakt-Gang", "Klein", "Leidenschaftlich"], commonUses: ["Freizeitreiten", "Showreiten"] },
  { name: "Tennessee Walking Horse", nameEn: "Tennessee Walker", aliases: ["TWH"], category: "gaited", origin: "USA", characteristics: ["Running Walk", "Ruhig", "Familienfreundlich"], commonUses: ["Pleasure", "Trail"] },
  { name: "Standardbred", aliases: [], category: "gaited", origin: "USA", characteristics: ["Trab-/Passrennsport", "Ausdauernd"], commonUses: ["Rennsport", "Umschulung"] },
  { name: "Peruanisches Paso", nameEn: "Peruvian Paso", aliases: ["Peruvian Stepping Horse"], category: "gaited", origin: "Peru", characteristics: ["Natürlicher Paso Llano", "Stolze Haltung"], commonUses: ["Showreiten", "Freizeitreiten"] },

  // SPEZIAL
  { name: "Friese", nameEn: "Friesian", aliases: ["Friesenpferd", "Fries"], category: "specialty", origin: "Niederlande (Friesland)", characteristics: ["Schwarz", "Behangreich", "Groß", "Barocktyp"], commonUses: ["Kutschenfahren", "Dressur", "Film"], healthNotes: "Neigung zu Magengeschwüren, Beinödem, Megakolon" },
  { name: "Lipizzaner", aliases: ["Lipizzan"], category: "specialty", origin: "Österreich/Slowenien", characteristics: ["Weiß (wird im Alter)", "Barock", "Intelligent"], commonUses: ["Haute École", "Wiener Hofreitschule", "Dressur"] },
  { name: "Camargue-Pferd", nameEn: "Camargue Horse", aliases: ["Camargue"], category: "specialty", origin: "Frankreich (Camargue)", characteristics: ["Grau/Weiß", "Halbwild", "Zäh", "Sumpfland-angepasst"], commonUses: ["Halbwild", "Freizeitreiten in Camargue"] },
  { name: "Knabstrupper", nameEn: "Knabstrupper", aliases: ["Knabstrup"], category: "specialty", origin: "Dänemark", characteristics: ["Gefleckt wie Appaloosa", "Freundlich"], commonUses: ["Dressur", "Zirkus", "Freizeitreiten"] },
  { name: "Falabella", nameEn: "Falabella", aliases: ["Miniaturpferd"], category: "miniature", origin: "Argentinien", characteristics: ["Sehr klein (bis 80cm)", "Familienpferd", "Begleitpferd"], commonUses: ["Begleitpferd", "Ausstellungen"] },
];

// ── GESUNDHEIT & KRANKHEITEN ──────────────────────────────────────────────────

export interface HorseCondition {
  name: string;
  nameEn?: string;
  aliases: string[];
  category: HealthCategory;
  severity: "leicht" | "mittel" | "schwer" | "notfall";
  symptoms: string[];
  firstAid: string;
  vetRequired: boolean;
  hufRelevance?: string;  // Relevanz für Hufpflege
  prevention?: string;
}

export type HealthCategory =
  | "huf_bein"        // Huf und Beinerkrankungen
  | "stoffwechsel"    // Metabolismus
  | "muskel_skelett"  // Muskeln und Knochen
  | "atemwege"        // Atemwegsprobleme
  | "verdauung"       // Magen/Darm
  | "haut"            // Hautprobleme
  | "neurologie"      // Neurologisch
  | "augen"           // Augenkrankheiten
  | "infektionskrankheit"  // Infektionen
  | "verhalten"       // Verhaltensstörungen
  | "reproduktion"    // Fortpflanzung
  | "zaehne"          // Zähne
  | "allgemein";      // Allgemein

export const HORSE_CONDITIONS: HorseCondition[] = [
  // HUF & BEIN
  { name: "Hufrehe", nameEn: "Laminitis", aliases: ["Rehe", "laminitis", "Gewebeschäden im Huf"], category: "huf_bein", severity: "notfall", symptoms: ["Taktfehler vorne", "Heiße Hufe", "Starke Pulsation der Zehengefäße", "Pferd entlastet Vorderbeine", "Lahmt auf hartem Boden"], firstAid: "Sofort Tierarzt — Pferd in Stall mit tiefer Einstreu, kein Treiben, Kaltwasser wenn akut", vetRequired: true, hufRelevance: "Notfall für Hufbearbeiter: Bearbeitung nur in Absprache mit Tierarzt, oft Spezialhufschuhe nötig", prevention: "Weidemanagement, Zuckerreduktion, EMS-Kontrolle" },
  { name: "Strahlfäule", nameEn: "Thrush", aliases: ["Fäulnis im Strahl", "Strahlkrankheit"], category: "huf_bein", severity: "leicht", symptoms: ["Schwarze faulige Masse im Strahl", "Übel-riechend", "Schmerz bei Druck", "Weicher/löchriger Strahl"], firstAid: "Strahl täglich reinigen, trocken halten, Kupfersulfat-Lösung oder Jodtinktur", vetRequired: false, hufRelevance: "Hufbearbeiter: Abgestorbenes Gewebe entfernen, Strahl freilegen, Kunden Pflegeanweisung", prevention: "Saubere trockene Einstreu, tägliches Auskratzen" },
  { name: "Hufabszess", nameEn: "Hoof Abscess", aliases: ["Abszess im Huf", "Nageltritt", "Hufgeschwür"], category: "huf_bein", severity: "mittel", symptoms: ["Plötzliche starke Lahmheit", "Heiße Hufwand", "Starker Puls an Zehengefäßen", "Schwellung im Bereich Krone/Fessel"], firstAid: "Tierarzt oder erfahrener Hufbearbeiter öffnet Abszess, Warmwasser-Bäder, Verband", vetRequired: true, hufRelevance: "Hufbearbeiter oft erste Anlaufstelle — Abszess lokalisieren, ggf. öffnen" },
  { name: "Bockhuf", nameEn: "Club Foot", aliases: ["Steiler Huf", "Steilhuf"], category: "huf_bein", severity: "mittel", symptoms: ["Zu steiler Hufwinkel (>60°)", "Zehenspitzengang", "Muskuläre Verkürzung in Beugesehne"], firstAid: "Regelmäßiger Korrekturschnitt, ggf. Keile, Bodenarbeit/Dehnübungen", vetRequired: false, hufRelevance: "Kernaufgabe Huforthopädie — regelmäßige kurze Intervalle, sorgfältige Dokumentation" },
  { name: "Spat", nameEn: "Spavin", aliases: ["Knochengallen", "Gelenkspat", "Ringelspat"], category: "huf_bein", severity: "mittel", symptoms: ["Lahmheit hinten", "Steife beim Anreiten", "Verbesserung bei Wärme", "Knöchelne Zubildung innen am Sprunggelenk"], firstAid: "Tierarzt für Diagnose, entzündungshemmend, Bewegung", vetRequired: true },
  { name: "Mauke", nameEn: "Pastern Dermatitis", aliases: ["Fessel-Ekzem", "Raspe", "Regengalle"], category: "haut", severity: "mittel", symptoms: ["Krustenbildung Fesselbeuge", "Juckreiz", "Schwellung", "Nässen", "Schmerz"], firstAid: "Haare kürzen, täglich reinigen, austrocknen lassen, Zinksalbe", vetRequired: false, prevention: "Trockenes Paddock, kein nasses Gras morgens ohne Abtrocknen" },
  { name: "Fesselträgerschaden", nameEn: "Suspensory Ligament Injury", aliases: ["Fesselträgerprobleme", "Suspensoirverletzung", "SL-Schaden"], category: "muskel_skelett", severity: "schwer", symptoms: ["Lahmheit", "Schwellung Knie/Sprunggelenk", "Schmerz bei Palpation"], firstAid: "Ruhe, Tierarzt, Ultraschall zur Diagnose", vetRequired: true },
  { name: "Schere", nameEn: "Shear Heels", aliases: ["Schritt-Schere", "Absatzschere"], category: "huf_bein", severity: "mittel", symptoms: ["Ein Hufballen deutlich tiefer als der andere", "Ungleichmäßige Belastung"], firstAid: "Hufbearbeiter Korrekturschnitt", vetRequired: false, hufRelevance: "Typisches Hufbearbeiter-Problem — Balance herstellen" },

  // STOFFWECHSEL
  { name: "EMS", nameEn: "Equine Metabolic Syndrome", aliases: ["Equines Metabolisches Syndrom", "Insulinresistenz", "Insulin-Dysregulation"], category: "stoffwechsel", severity: "schwer", symptoms: ["Übergewicht trotz Diät", "Fettpolster Nacken/Schmolle/Kruppe", "Abflachen Hufrehe-Puls", "Träges Aufstehen"], firstAid: "Tierarzt, Blutbild, Diät (zuckerarm), Bewegung, kein Weidegras in Frühling", vetRequired: true, hufRelevance: "Erhöhtes Rehepotenzial — Hufbearbeiter erhöht Kontrollfrequenz", prevention: "Gewichtskontrolle, zuckerarmes Heu (Analyse!)" },
  { name: "PPID (Cushing)", nameEn: "Pituitary Pars Intermedia Dysfunction", aliases: ["Equines Cushing-Syndrom", "Cushing Pferd"], category: "stoffwechsel", severity: "schwer", symptoms: ["Langes lockiges Fell (Hypertrichose)", "Muskelschwund", "Polydipsie/Polyurie", "Lethargie", "Reheanfälligkeit"], firstAid: "Tierarzt, Blutbild (ACTH), Pergolid-Therapie", vetRequired: true },
  { name: "Kolik", nameEn: "Colic", aliases: ["Pferdekolik", "Magenkolik", "Darmkolik", "Verlegungskolik"], category: "verdauung", severity: "notfall", symptoms: ["Unruhe", "Aufkratzen", "Flankenschauen", "Wälzen", "Schwitzen", "Kein Kotabsatz", "Verweigerung Futter"], firstAid: "SOFORT TIERARZT anrufen — nicht warten. Pferd in Bewegung halten bis Tierarzt kommt. KEIN Schmerzmittel ohne Tierarzt-Anweisung", vetRequired: true },
  { name: "Magengeschwür", nameEn: "Gastric Ulcer / EGUS", aliases: ["EGUS", "Magenulzera", "Equine Gastric Ulcer Syndrome"], category: "verdauung", severity: "mittel", symptoms: ["Leistungsabfall", "Futterverweigerung", "Grinsen beim Aufgurten", "Gewichtsverlust", "Kolik-Symptome wiederkehrend"], firstAid: "Tierarzt, Magenspiegelung, Omeprazol-Behandlung", vetRequired: true, prevention: "Heu rund um die Uhr verfügbar, kein langer Magenleerlauf" },
  { name: "Hyperlipämie", nameEn: "Hyperlipemia", aliases: ["Equine Hyperlipidaemia", "Hyperlipidämie"], category: "stoffwechsel", severity: "notfall", symptoms: ["Fressunlust", "Lethargie", "Trübsinn", "Gelbliches Blut"], firstAid: "Notfall-Tierarzt — IV-Glucose, Ursache beheben", vetRequired: true },

  // ATEMWEGE
  { name: "COB / RAO", nameEn: "RAO / Heaves", aliases: ["Chronische Obstruktive Bronchitis", "Dämpfigkeit", "Heaves", "Stallgassen-Husten", "RAO"], category: "atemwege", severity: "mittel", symptoms: ["Husten", "Nasenausfluss", "Angestrengte Bauchatmung", "Nasenflügeln", "Belastungsintoleranz"], firstAid: "Haltung verbessern (Frischluft, staubarmes Heu), Tierarzt für Medikation", vetRequired: true, prevention: "Heu einweichen oder dämpfen, Stroh durch Späne/Pellets ersetzen" },
  { name: "Druse", nameEn: "Strangles", aliases: ["Drüse", "Streptococcus equi"], category: "infektionskrankheit", severity: "schwer", symptoms: ["Hohes Fieber", "Eitriger Nasenausfluss", "Geschwollene Lymphknoten (Kehlgang)", "Schluckbeschwerden"], firstAid: "Quarantäne sofort, Tierarzt, Antibiotika nach Abstrich", vetRequired: true },

  // HAUT
  { name: "Sommerekzem", nameEn: "Sweet Itch", aliases: ["Mückenallergie", "Insektenstichallergie", "IBH"], category: "haut", severity: "mittel", symptoms: ["Heftiges Scheuern (Mähne, Schweif)", "Schuppige Haut", "Kahlstellen", "Quaddeln"], firstAid: "Ekzemerdecken, DEET-freies Mittel, Mückenzeiten meiden", vetRequired: false, prevention: "Mückendecke, Stall bei Dämmerung" },
  { name: "Ringworm", nameEn: "Ringworm / Dermatomycosis", aliases: ["Dermatophytose", "Hautpilz Pferd", "Schimmel Haut"], category: "haut", severity: "leicht", symptoms: ["Kreisrunde haarlose Stellen", "Schuppig", "Krustenbildung", "Juckreiz"], firstAid: "Zoonose-Vorsicht! Pferd isolieren, Tierarzt, Antifungal", vetRequired: true },
  { name: "Sarkoid", nameEn: "Equine Sarcoid", aliases: ["Fibrosarkom Pferd", "Sarkoidose Pferd"], category: "haut", severity: "mittel", symptoms: ["Hautveränderungen (flach, warzig, knotig)", "Bevorzugt Gesicht, Bauch, Innenschenkel"], firstAid: "Tierarzt — Behandlung nötig (Immuntherapie, Laser, Kryotherapie)", vetRequired: true },

  // INFEKTIONSKRANKHEITEN / NEUROLOGIE
  { name: "Tetanus", nameEn: "Tetanus", aliases: ["Wundstarrkrampf", "Clostridium tetani"], category: "infektionskrankheit", severity: "notfall", symptoms: ["Muskelsteifheit", "Kieferklemme", "Aufrechte Ohren", "Dritter Augenlid vor", "Starrer Gang"], firstAid: "NOTFALL — Tierarzt sofort. Impfung schützt!", vetRequired: true, prevention: "Impfung alle 2 Jahre" },
  { name: "Equines Herpesvirus", nameEn: "EHV", aliases: ["EHV-1", "EHV-4", "Rhinopneumonitis"], category: "infektionskrankheit", severity: "schwer", symptoms: ["Fieber", "Nasenausfluss", "neurologische Symptome bei EHV-1 (Ataxie, Lähmung)", "Aborte bei Stuten"], firstAid: "Quarantäne, Tierarzt, Meldepflicht prüfen", vetRequired: true, prevention: "Impfung, Quarantäne neuer Pferde" },
  { name: "Mondblindheit", nameEn: "ERU / Equine Recurrent Uveitis", aliases: ["ERU", "Uveitis", "Periodische Augenentzündung"], category: "augen", severity: "schwer", symptoms: ["Tränen", "Lichtscheu", "Getrübtes Auge", "Zugezogenes Augenlid", "Wiederkehrende Entzündungen"], firstAid: "Tierarzt sofort, Verdunkelung, entzündungshemmend", vetRequired: true },

  // VERHALTEN
  { name: "Koppen", nameEn: "Cribbing", aliases: ["Crib-biting", "Stall-Koppen"], category: "verhalten", severity: "leicht", symptoms: ["Pferd beißt auf Kante und schluckt Luft", "Typisches Geräusch", "Muskulaturveränderung am Hals"], firstAid: "Koppriemen (umstritten), Umgebung anpassen, Sozial- und Auslaufbedarf decken", vetRequired: false },
  { name: "Weben", nameEn: "Weaving", aliases: ["Webeschritte", "Webeschaukeln"], category: "verhalten", severity: "leicht", symptoms: ["Rhythmisches Schaukeln im Stand (Kopf von Seite zu Seite)"], firstAid: "Mehr Auslauf, sozialer Kontakt, Anti-Webe-Gitter", vetRequired: false },
  { name: "Boxenlaufen", nameEn: "Box Walking / Stall Walking", aliases: ["Stallkoller"], category: "verhalten", severity: "leicht", symptoms: ["Kreisläufe in der Box", "Unruhe", "Körperliche Abmagerung möglich"], firstAid: "Mehr Auslauf, Sozialgruppe, Beschäftigung", vetRequired: false },
  { name: "Trennungsangst", nameEn: "Separation Anxiety", aliases: ["Abtrennungsangst", "Herdentrieb extrem"], category: "verhalten", severity: "mittel", symptoms: ["Schreien", "Schwitzen", "Gefährliches Verhalten wenn Herdenmitglieder weggehen", "Unmöglich allein zu reiten"], firstAid: "Training (schrittweise Desensibilisierung)", vetRequired: false },
];

// ── AUSRÜSTUNG (Pferd & Mensch) ──────────────────────────────────────────────

export interface EquipmentItem {
  name: string;
  nameEn?: string;
  aliases: string[];
  category: EquipmentCategory;
  forWhom: "pferd" | "mensch" | "both";
  description: string;
}

export type EquipmentCategory =
  | "hufpflege" | "sattel" | "zaumzeug" | "decken" | "transport"
  | "fütterung" | "medizin" | "sicherheit" | "training"
  | "stallbetrieb" | "bekleidung" | "elektronik";

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  // HUFPFLEGE
  { name: "Hufkratzer", nameEn: "Hoof pick", aliases: ["Hufpick"], category: "hufpflege", forWhom: "pferd", description: "Zum Auskratzen der Hufe vor und nach Ritt/Arbeit" },
  { name: "Hufmesser", nameEn: "Hoof knife", aliases: ["Hufmesser Barhuf", "Söhlenmesser"], category: "hufpflege", forWhom: "pferd", description: "Zum Entfernen von überschüssigem Strahlgewebe und Hornmaterial" },
  { name: "Raspel", nameEn: "Rasp", aliases: ["Huffeile", "Doppelraspel"], category: "hufpflege", forWhom: "pferd", description: "Zum Glätten und Formgeben der Hufwand" },
  { name: "Hufzange", nameEn: "Hoof nippers", aliases: ["Vorderzange", "Seitenzange"], category: "hufpflege", forWhom: "pferd", description: "Zum Kürzen überwachsener Hufwand" },
  { name: "Huforthese", nameEn: "Hoof orthotic", aliases: ["Hufschuhe (Reha)", "Softride Boot"], category: "hufpflege", forWhom: "pferd", description: "Weiche Schiene für Reha-Pferde (Hufrehe, Abszess)" },
  { name: "Schürze (Hufpflege)", nameEn: "Apron", aliases: ["Lederschürze", "Hufbearbeiter-Schürze"], category: "hufpflege", forWhom: "mensch", description: "Schutz für Beine beim Halten der Pferdehufe" },
  { name: "Hufeisen", nameEn: "Horseshoe", aliases: ["Eisen", "Beschlag"], category: "hufpflege", forWhom: "pferd", description: "Metallenes Eisen für Hufschutz — kalt oder warm angepasst" },
  { name: "Hufnägel", nameEn: "Horseshoe nails", aliases: ["Beschlagnägel"], category: "hufpflege", forWhom: "pferd", description: "Befestigungsnägel für Hufeisen" },

  // SATTEL
  { name: "Dressursattel", nameEn: "Dressage saddle", aliases: ["Dressurattel"], category: "sattel", forWhom: "both", description: "Langer Sattelblatt, tiefes Kissen, für Dressur" },
  { name: "Springsattel", nameEn: "Jumping saddle", aliases: ["Close contact saddle"], category: "sattel", forWhom: "both", description: "Kürzeres Sattelblatt, vorwärts, für Springreiten" },
  { name: "Western-Sattel", nameEn: "Western saddle", aliases: ["Westernsattel", "Trail Saddle", "Ranch Saddle"], category: "sattel", forWhom: "both", description: "Breite Auflage, Horn, für Western-Reitweisen" },
  { name: "Endurance-Sattel", nameEn: "Endurance saddle", aliases: ["Distanzsattel"], category: "sattel", forWhom: "both", description: "Leicht, bequem für lange Ausritte" },
  { name: "Islandpferdesattel", aliases: ["Tölt-Sattel"], category: "sattel", forWhom: "both", description: "Speziell für Gangreiten, fördert Schwung" },
  { name: "Sattelgurt", nameEn: "Girth", aliases: ["Gurt", "Kurzgurt"], category: "sattel", forWhom: "pferd", description: "Befestigung des Sattels am Pferd" },

  // ZAUMZEUG
  { name: "Trense", nameEn: "Snaffle bridle", aliases: ["Reittrense", "Reithalfter"], category: "zaumzeug", forWhom: "pferd", description: "Basis-Reitgebiss für Kommunikation über Mundwinkel" },
  { name: "Kandare", nameEn: "Curb bit", aliases: ["Doppeltrense", "Kandaren-Gebiss"], category: "zaumzeug", forWhom: "pferd", description: "Zweiteilige Zäumung für Dressur auf hohem Niveau" },
  { name: "Hackamore", nameEn: "Hackamore", aliases: ["Gebissloses Zaumzeug", "Kappzaum"], category: "zaumzeug", forWhom: "pferd", description: "Keine Mundwirkung — drückt auf Nase, Kehlgang" },
  { name: "Sidepull", aliases: ["Sidepull-Halfter"], category: "zaumzeug", forWhom: "pferd", description: "Gebissloses Zaumzeug — direkter Seitendruck" },
  { name: "Bosal", aliases: [], category: "zaumzeug", forWhom: "pferd", description: "Geflochtene Nase, traditionell western" },
  { name: "Longe", nameEn: "Lunge line", aliases: ["Longierband", "Longierleine"], category: "training", forWhom: "pferd", description: "8-10m langes Band für Longenarbeit" },

  // DECKEN
  { name: "Weidedecke", nameEn: "Turnout rug", aliases: ["Outdoordecke", "Regendecke"], category: "decken", forWhom: "pferd", description: "Wasserdichte Decke für den Weidegang" },
  { name: "Stalldecke", nameEn: "Stable rug", aliases: ["Boxendecke", "Abschwitzdecke"], category: "decken", forWhom: "pferd", description: "Weiche Decke für den Stall" },
  { name: "Fliegendecke", nameEn: "Fly rug", aliases: ["Insektendecke", "Sommerdecke Netz"], category: "decken", forWhom: "pferd", description: "Netz-Decke gegen Insekten — wichtig bei Sommerekzem" },
  { name: "Kühldecke", nameEn: "Cooler", aliases: ["Abschwitzdecke", "Cooling rug"], category: "decken", forWhom: "pferd", description: "Feuchtigkeitstransportierend für nach dem Training" },

  // MENSCH / BEKLEIDUNG
  { name: "Reithelm", nameEn: "Riding helmet", aliases: ["Reitkappe", "Sicherheitshelm", "Jockeykappe"], category: "sicherheit", forWhom: "mensch", description: "Norm: EN1384 oder VG1 — Pflicht für Kinder, empfohlen für alle" },
  { name: "Schutzweste", nameEn: "Body protector", aliases: ["Reitweste", "Airbag-Weste"], category: "sicherheit", forWhom: "mensch", description: "Schutz des Oberkörpers bei Sturz" },
  { name: "Airbag-Weste", nameEn: "Airbag vest", aliases: ["Helite", "Punto Airbag"], category: "sicherheit", forWhom: "mensch", description: "Aufblasbare Schutzweste — löst bei Sturz aus" },
  { name: "Reitstiefel", nameEn: "Riding boots", aliases: ["Stiefel", "Lederstiefel", "Gummistiefel Reiten"], category: "bekleidung", forWhom: "mensch", description: "Langer Stiefel mit kleinem Absatz für Steigbügelsicherheit" },
  { name: "Chaps", aliases: ["Halbstiefel & Chaps", "Reiterchaps"], category: "bekleidung", forWhom: "mensch", description: "Ergänzung zu kurzem Stiefel, schützt Wade/Knie" },
  { name: "Reithose", nameEn: "Riding tights", aliases: ["Jodhpur", "Reitleggings", "Reithose Vollbesatz", "Kniebesatz"], category: "bekleidung", forWhom: "mensch", description: "Mit Grip-Besatz (Knie oder Vollbesatz) für Halt im Sattel" },
  { name: "Reithandschuhe", nameEn: "Riding gloves", aliases: ["Handschuhe Reiten"], category: "bekleidung", forWhom: "mensch", description: "Grip an Zügeln, Schutz der Hände" },
  { name: "Sicherheitsschuhe Hufpflege", nameEn: "Safety shoes hoof care", aliases: ["Stahlkappenschuhe", "Hufbearbeiter Schuhe"], category: "sicherheit", forWhom: "mensch", description: "Pflicht für Hufbearbeiter — Stahlkappe schützt bei Huf-Auftreten" },
  { name: "Knieschutz", nameEn: "Knee pads", aliases: ["Knieschoner Hufbearbeiter"], category: "sicherheit", forWhom: "mensch", description: "Gelenk-Schutz beim Halten der Vorderbeine" },

  // ELEKTRONIK / DIGITAL
  { name: "Herzfrequenzmessgerät", nameEn: "Heart rate monitor", aliases: ["HFM", "Pulsuhr Pferd"], category: "elektronik", forWhom: "pferd", description: "Zur Trainingssteuerung und Gesundheitsmonitoring" },
  { name: "GPS-Tracker Pferd", aliases: ["Horse GPS", "Weide-GPS"], category: "elektronik", forWhom: "pferd", description: "Standort-Tracking für Weidepferde" },
  { name: "Huf-Dokumentations-App", aliases: ["Hufi", "Hufpflege-App", "Pferdeakte App"], category: "elektronik", forWhom: "mensch", description: "Digitale Pferdeakte, Terminplanung, Kommunikation" },
];

// ── FACHBEGRIFFE (DE/EN) ──────────────────────────────────────────────────────

export const TERMINOLOGY: Record<string, string> = {
  // Hufanatomie
  "Strahl": "Frog (EN) — weiches V-förmiges Horn in der Hufmitte",
  "Trachten": "Heel bulbs — hintere erhöhte Partie des Hufs",
  "Weiße Linie": "White line — Verbindung zwischen Hufwand und Sohle",
  "Kronlederhaut": "Coronary band / coronet — Wachstumszone des Hufhorns",
  "Sohle": "Sole — untere Fläche des Hufes",
  "Hufwand": "Hoof wall — äußere Hornkapsel",
  "Seime": "Quarter crack / seime — Riss in der Hufwand",
  "Hufbein": "Coffin bone / P3 / Distal phalanx — innerster Knochen im Huf",
  "Strecksehne": "Common digital extensor tendon",
  "Beugesehnen": "Flexor tendons — tiefe + oberflächliche",
  // Lahmheit
  "Lahmheitsgrad 1-5": "Lameness scale 1-5 (AAEP-Skala: 0 = keine, 5 = schwere Stützlahmheit)",
  "Stützbeinlahmheit": "Weight-bearing lameness — Pferd stützt sich kaum noch auf den Huf",
  "Hangbeinlahmheit": "Swinging leg lameness — Problem in der Schwingphase",
  // Allgemein
  "Pulsation": "Digital pulse — Puls an Zehenarterie, erhöht bei Hufrehe",
  "Hufprüfzange": "Hoof tester — Gerät zum Lokalisieren von Hufschmerz",
  "Balancepunkt": "Balance point — korrekte Aufstandsfläche des Hufes",
};

// ── HALTUNGSFORMEN ────────────────────────────────────────────────────────────

export const HALTUNGSFORMEN = [
  { name: "Einzelboxenhaltung", desc: "Klassisch, Pferd hat eigene Box (mind. 3x3m für Pony, 4x4m für Warmblut)" },
  { name: "Offenstallhaltung", desc: "Pferd hat freien Zugang zu Stall und Paddock, Gruppenhaltung" },
  { name: "Paddock-Trail", desc: "Bewegungsfördernde Anlage — Pferd bewegt sich von Futter zu Tränke" },
  { name: "Aktivstall", desc: "Automatisierter Paddock-Trail mit Chip-gesteuerten Futterstellen" },
  { name: "Weidehaltung", desc: "Pferd lebt hauptsächlich auf der Weide, Stall nur bei Bedarf" },
  { name: "Herdenhaltung", desc: "Mehrere Pferde zusammen — soziales Miteinander" },
];
