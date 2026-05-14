// Hufi Professions Database
// Vollständige Datenbank aller von Hufi unterstützten Pferdeberufe
// Jeder Beruf hat eigene Charakteristika, Use Cases, Preismodelle, typische Probleme

export type WorkLocation = "mobile" | "stationary" | "both";
export type Environment = "indoor" | "outdoor" | "both";
export type Delivery = "offline" | "online" | "both";
export type TeamSize = "solo" | "small_team" | "company";
export type Scope = "local" | "regional" | "national" | "international";
export type PricingModel = "per_session" | "per_hour" | "package" | "subscription" | "flat_rate" | "mixed";

export interface HufiBeruf {
  id: string;                        // machine-readable key
  name: string;                      // Anzeigename DE
  nameAlternatives: string[];        // Synonyme / englische Begriffe
  category: BerufCategory;
  workLocation: WorkLocation;
  environment: Environment;
  delivery: Delivery;
  teamSize: TeamSize[];              // welche Varianten gibt es?
  scope: Scope[];
  pricingModels: PricingModel[];
  typicalServices: string[];
  typicalClients: string[];
  keyTools: string[];
  commonProblems: string[];          // typische Alltagsprobleme im Business
  seasonalPatterns: string[];
  hufiTips: string[];                // Hufi-spezifische Ratschläge für diesen Beruf
  relevantKeywords: string[];        // Trigger-Wörter für Intent-Erkennung
}

export type BerufCategory =
  | "huf"           // Hufpflege & Beschlag
  | "therapie"      // Physio, Osteo, etc.
  | "training"      // Reit-, Boden-, Verhaltenstraining
  | "medizin"       // Tierarzt, Zahnpflege
  | "stall"         // Stallbetrieb, Pension, Zucht
  | "ernaehrung"    // Fütterung, Beratung
  | "handel"        // Verkauf, Transport
  | "begleitung"    // Therapeutisches Reiten, Pädagogik
  | "handwerk"      // Sattler, Schmied
  | "beratung";     // Coaching, Consulting

export const HUFI_BERUFE: HufiBeruf[] = [

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: HUF
  // ═══════════════════════════════════════════════════════════════
  {
    id: "hufbearbeiter",
    name: "Hufbearbeiter",
    nameAlternatives: ["Hufpfleger", "Barhufpfleger", "Hoof Trimmer", "Natural Hoof Care Practitioner", "NHCP"],
    category: "huf",
    workLocation: "mobile",
    environment: "outdoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "subscription"],
    typicalServices: [
      "Barhuf-Bearbeitung", "Hufkorrektur", "Balancecheck", "Hufrehab",
      "Hufpflege-Coaching für Besitzer", "Dokumentation", "Huforthopädie"
    ],
    typicalClients: [
      "Pferdebesitzer", "Reiterhöfe", "Pensionsställe", "Gestüte",
      "Therapeutische Reiteinrichtungen", "Pferdepensionen"
    ],
    keyTools: [
      "Hufkratzer", "Hufmesser", "Raspel (gerade, gebogen)", "Hufzange",
      "Winkelmaß", "Huforthese", "Lederschürze", "Knieschutz", "Sicherheitsschuhe",
      "Hufstandplatten", "Kamera/App für Dokumentation"
    ],
    commonProblems: [
      "Terminausfall kurzfristig", "Wetter (Regen, Frost, Hitze)",
      "Schwer erreichbare Kunden (ländlich)", "Pferde die nicht halten",
      "Überfällige Pferde deren Besitzer nicht reagieren",
      "Offene Rechnungen bei Privatpersonen",
      "Tourenplanung bei weit verteilten Kunden",
      "Körperliche Belastung (Rücken, Knie)"
    ],
    seasonalPatterns: [
      "Winter: Frost erschwert Arbeit, Hufe trockener",
      "Frühjahr: Umstellung auf Weide → Rehegefahr",
      "Sommer: Hitze, harte Böden, Sommerekzem-Saison",
      "Herbst: Viele Kunden vor Winter versorgen"
    ],
    hufiTips: [
      "Tourenoptimierung ist bares Geld — Fahrzeit minimieren",
      "Fotos vor/nach dokumentieren — schützt rechtlich und zeigt Fortschritt",
      "Erinnerungs-WhatsApp 1 Woche vor Termin senken Stornoquote",
      "Abo-Modell (4/6/8 Wochen) sichert planbare Einnahmen",
      "Bei Regen: Kunden früh informieren statt spontan absagen"
    ],
    relevantKeywords: ["huf", "hufpflege", "bearbeitung", "barhuf", "trimm", "raspel", "hufmesser"]
  },

  {
    id: "hufschmied",
    name: "Hufschmied",
    nameAlternatives: ["Beschlagschmied", "Farrier", "Equine Farrier", "Hufbeschlag"],
    category: "huf",
    workLocation: "mobile",
    environment: "outdoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "flat_rate"],
    typicalServices: [
      "Hufbeschlag (kalt/warm)", "Beschlagkorrektur", "Orthopädischer Beschlag",
      "Eisen anfertigen", "Beschlagneuanbringung", "Barhuf-Bearbeitung",
      "Kleben von Hufeisen (Klebeisen)", "Notbeschlag", "Gleitschutz"
    ],
    typicalClients: [
      "Sportpferdebesitzer", "Rennställe", "Turnierpferde", "Arbeitspferde",
      "Pensionsställe", "Landwirtschaft (Zugpferde)"
    ],
    keyTools: [
      "Mobile Esse/Gasesse", "Amboss", "Hammer", "Zange (Huf-, Kneif-, Richtzange)",
      "Hufnägel", "Hufeisen (alle Größen, Typen)", "Raspel", "Hufmesser",
      "Lötlampe", "Schutzhandschuhe", "Lederschürze", "Lieferwagen/Transporter"
    ],
    commonProblems: [
      "Hoher Invest in Werkzeug und Fahrzeug",
      "Körperlich sehr belastend", "Terminplanung komplex",
      "Notfälle (Eisen verloren) unterbrechen Tour",
      "Wetterabhängigkeit"
    ],
    seasonalPatterns: [
      "Winter: Gleitschutznieten/-stollen gefragt",
      "Turniersaison (Frühjahr-Herbst): Mehr Eil-Aufträge",
      "Sommer: Harte Böden — mehr Beschlagverschleiß"
    ],
    hufiTips: [
      "Notfallslots freihalten für verlorene Eisen",
      "Turnierpferde-Kunden binden — regelmäßiger, planbarer Umsatz",
      "Digitale Rechnung sofort nach Termin per App"
    ],
    relevantKeywords: ["schmied", "beschlag", "hufeisen", "eisen", "farrier", "nagel", "amboss"]
  },

  {
    id: "huforthopaedie",
    name: "Huforthopäde",
    nameAlternatives: ["Equine Podologe", "Rehabilitations-Hufpfleger", "Hoof Rehabilitation Specialist"],
    category: "huf",
    workLocation: "both",
    environment: "outdoor",
    delivery: "offline",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: [
      "Hufrehabilitation bei Hufrehe", "Bockhuf-Korrektur", "Chronische Lahmheit",
      "Huforthesen-Anpassung", "Zusammenarbeit mit Tierarzt",
      "Langzeit-Rehab-Begleitung", "Ganganalyse"
    ],
    typicalClients: ["Rehafall-Pferdebesitzer", "Tierarzt-Überweisung", "Chronisch kranke Pferde"],
    keyTools: ["Huforthesen", "Messequipment", "Kamera für Ganganalyse", "Spezialmesser", "Softpad-Material"],
    commonProblems: [
      "Komplexe Fälle brauchen enge Tierarzt-Koordination",
      "Kunden haben hohe Erwartungen bei kranken Pferden",
      "Lange Behandlungszeiten für Rehab"
    ],
    seasonalPatterns: ["Frühjahr: Rehepeaks bei Weideumstellung", "Ganzjährig, keine starke Saisonalität"],
    hufiTips: [
      "Immer schriftliche Vereinbarung über Reha-Ziele",
      "Fotodoku bei jedem Termin — zeigt Fortschritt",
      "Mit lokalen Tierärzten Netzwerk aufbauen"
    ],
    relevantKeywords: ["orthopädie", "reha", "rehabilitation", "orthese", "bockhuf", "chronisch"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: THERAPIE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "pferdephysiotherapeut",
    name: "Pferdephysiotherapeut",
    nameAlternatives: ["Equine Physiotherapist", "Tierphysiotherapeut Pferd", "Pferdephysio"],
    category: "therapie",
    workLocation: "both",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "per_hour", "package"],
    typicalServices: [
      "Manuelle Therapie", "Massage", "Myofasziale Behandlung",
      "Dehnübungen", "Thermotherapie (Wärme/Kälte)",
      "TENS/EMS-Therapie", "Lasertherapie",
      "Ganganalyse", "Rückenbehandlung", "Kissing-Spines-Begleitung",
      "Post-OP-Rehabilitation", "Sportpferdevorbereitung"
    ],
    typicalClients: [
      "Sportpferdebesitzer", "Freizeitreiter", "Tierarzt-Überweisungen",
      "Rennstallbesitzer", "Turnierstallbetreiber"
    ],
    keyTools: [
      "Ultraschallgerät", "TENS/EMS-Gerät", "Lasertherapiegerät",
      "Massageöle", "Wärmepads", "Bandagen", "Dehnbänder",
      "Balancepads", "Messequipment (Goniometer)", "Tablet für Doku"
    ],
    commonProblems: [
      "Versicherungsabrechnung komplex",
      "Tierärztliche Überweisung oft Voraussetzung",
      "Kunden erwarten zu schnelle Ergebnisse",
      "Körperlich belastend"
    ],
    seasonalPatterns: ["Turniersaison: Mehr Nachfrage", "Winter: Eher Rehapatienten"],
    hufiTips: [
      "Behandlungsberichte immer an den Tierarzt",
      "Besitzer-Coaching (Dehnübungen für zu Hause) steigert Behandlungserfolg",
      "Zertifizierungen sichtbar machen — Vertrauen bei Neukunden"
    ],
    relevantKeywords: ["physio", "physiotherapie", "massage", "manuelle", "rücken", "muskel", "therapie"]
  },

  {
    id: "pferdeosteopath",
    name: "Pferdeosteopath",
    nameAlternatives: ["Equine Osteopath", "Animal Osteopath", "Ganzheitlicher Tierosteopath"],
    category: "therapie",
    workLocation: "both",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: [
      "Osteopathische Behandlung", "Faszienarbeit", "Viszerale Osteopathie",
      "Craniosacraler Rhythmus", "Strukturelle Behandlung",
      "Integrative Ganzkörperbehandlung"
    ],
    typicalClients: ["Sportpferdebesitzer", "Freizeitreiter", "Chronisch kranke Pferde"],
    keyTools: ["Behandlungsliege (selten nötig)", "Schienen", "Dokumentationsapp"],
    commonProblems: ["Anerkennung gegenüber konventioneller Medizin", "Lange Ausbildung"],
    seasonalPatterns: ["Ganzjährig ähnlich"],
    hufiTips: ["Fallberichte dokumentieren für eigene Fortbildung", "Netzwerk mit Tierärzten und Physios"],
    relevantKeywords: ["osteo", "osteopathie", "faszie", "cranio", "ganzheitlich"]
  },

  {
    id: "pferdechiropraktiker",
    name: "Chiropraktiker Pferd",
    nameAlternatives: ["Equine Chiropractor", "Animal Chiropractor", "Veterinary Chiropractor"],
    category: "therapie",
    workLocation: "both",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo"],
    scope: ["regional"],
    pricingModels: ["per_session"],
    typicalServices: ["Manuelle Wirbelsäulenkorrektur", "Gelenkmobilisation", "Weichteilbehandlung"],
    typicalClients: ["Sportpferdebesitzer", "Dressur- und Springpferde"],
    keyTools: ["Aktivator", "Perkussionsgerät"],
    commonProblems: ["Rechtliche Grauzone (oft nur für Tierärzte)", "Kurze Behandlungszeit"],
    seasonalPatterns: ["Turniersaison: Mehr Nachfrage"],
    hufiTips: ["Klärung rechtlicher Situation im Bundesland", "Enge Kooperation mit Tierarzt"],
    relevantKeywords: ["chiro", "chiropraktik", "wirbel", "gelenk", "justier"]
  },

  {
    id: "pferdezahnpfleger",
    name: "Pferdezahnpfleger",
    nameAlternatives: ["Equine Dentist", "Equine Dental Technician", "Zahnbearbeiter Pferd"],
    category: "medizin",
    workLocation: "mobile",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session"],
    typicalServices: [
      "Gebissuntersuchung", "Zahn-Raspeln (manuell/elektrisch)",
      "Wolfszahn-Entfernung", "Haken abrunden", "Wangengeschwür-Behandlung",
      "Sedierungsbegleitung (mit Tierarzt)"
    ],
    typicalClients: ["Pferdebesitzer", "Pensionsställe", "Rennställe"],
    keyTools: ["Mundsperre", "Zahnspiegel", "elektrische Raspel", "manuelle Feilen", "Beleuchtungsgerät", "Sedierungsset (mit TÄ)"],
    commonProblems: ["Pferde die sich widersetzen", "Sedierungsbedarf → Tierarzt nötig", "Saisonale Häufung"],
    seasonalPatterns: ["Frühjahr/Herbst: Häufigste Zahnpflege-Termine"],
    hufiTips: ["Jahres-Erinnerungen pro Pferd automatisieren", "Mit Tierarzt für Sedierungen Kooperieren"],
    relevantKeywords: ["zahn", "zähne", "gebiss", "dental", "kiefer", "wolfszahn"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: TRAINING
  // ═══════════════════════════════════════════════════════════════
  {
    id: "reitlehrer",
    name: "Reitlehrer",
    nameAlternatives: ["Reiterinstruktor", "Riding Instructor", "Reittrainerin", "FN-Trainer"],
    category: "training",
    workLocation: "stationary",
    environment: "indoor",
    delivery: "both",
    teamSize: ["solo", "small_team", "company"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "package", "subscription"],
    typicalServices: [
      "Einzel-Reitstunde", "Gruppen-Reitstunde", "Longierstunde",
      "Dressur-Training", "Spring-Training", "Anfänger-Kurse",
      "Aufbaukurse", "Prüfungsvorbereitung (LA, MA, Abzeichen)",
      "Online-Coaching (Video-Analyse)", "Reitkurse / Kliniken"
    ],
    typicalClients: ["Einsteiger", "Fortgeschrittene", "Kinder/Jugendliche", "Erwachsene", "Turniersportler"],
    keyTools: ["Longe", "Gerte", "Mikrofon-Headset", "Video-Analyse-App", "Cavaletti", "Stangen", "Hindernisse"],
    commonProblems: [
      "Wetterabhängigkeit (bei Außenbahn)", "Kurzfristige Absagen", "Pferdekrankheiten die Stunden stören",
      "Schüler-Fluktuation", "Haftungsfragen", "Hallenzeiten-Konflikte"
    ],
    seasonalPatterns: ["Sommer: Außenbahn-Saison, Kliniken", "Winter: Hallenbetrieb, Innenkurse", "Turniersaison: Prüfungsvorbereitung"],
    hufiTips: [
      "Pakete (10er-Block) senken Ausfallquote",
      "WhatsApp-Gruppe für Schüler spart Koordinationsaufwand",
      "Warteliste führen — zeigt Nachfrage und füllt Ausfälle"
    ],
    relevantKeywords: ["reitstunde", "reiten", "trainer", "dressur", "springen", "longe", "unterricht", "lektion"]
  },

  {
    id: "horsemanship_trainer",
    name: "Horsemanship-Trainer",
    nameAlternatives: ["Natural Horsemanship", "NH-Trainer", "Bodenarbeit-Trainer", "Liberty-Trainer"],
    category: "training",
    workLocation: "both",
    environment: "outdoor",
    delivery: "both",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package", "subscription"],
    typicalServices: [
      "Bodenarbeit", "Liberty-Training", "Desensibilisierung",
      "Aufbautraining Jungpferd", "Vertrauensarbeit", "Trailern-Training",
      "Problemlösungs-Sessions", "Onlinekurse", "Clinics & Workshops"
    ],
    typicalClients: ["Problempferdebesitzer", "Jungpferdehalter", "Freizeitreiter die tiefer einsteigen wollen"],
    keyTools: ["Stick & String", "Carrot Stick", "Bodenarbeitsgeschirr", "Roundpen", "Kamera für Online-Content"],
    commonProblems: ["Erklärungsbedarf bei konventionellen Reitern", "Reisen für Clinics kostenintensiv"],
    seasonalPatterns: ["Sommer: Outdoor-Clinics", "Winter: Online-Kurse"],
    hufiTips: ["YouTube/Social Media als Marketing", "Clinics vorbuchen lassen → Sicherheit"],
    relevantKeywords: ["horsemanship", "bodenarbeit", "liberty", "natural", "NH", "roundpen", "desensibilisier"]
  },

  {
    id: "western_trainer",
    name: "Western-Trainer",
    nameAlternatives: ["Western Riding Instructor", "Reining Trainer", "Cutting Trainer", "Barrel Trainer"],
    category: "training",
    workLocation: "stationary",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: [
      "Western-Grundausbildung", "Reining-Training", "Cutting",
      "Trail-Training", "Barrel Racing", "Showvorbereitung",
      "Jungpferde-Anreiten Western"
    ],
    typicalClients: ["Western-Enthusiasten", "Turniersportler Western", "Quarter Horse Besitzer"],
    keyTools: ["Western-Sattel", "Bosal", "Snaffle", "Shank-Bit", "Sporen (Western)", "Roundpen"],
    commonProblems: ["Kleinere Szene in DE", "Import-Pferde koordinieren"],
    seasonalPatterns: ["Turniersaison Frühjahr-Herbst"],
    hufiTips: ["Community-Events/Clinics aufbauen", "Social Media für Szene-Sichtbarkeit"],
    relevantKeywords: ["western", "reining", "cutting", "barrel", "quarter horse", "rodeo"]
  },

  {
    id: "voltigiertrainer",
    name: "Voltigiertrainer",
    nameAlternatives: ["Voltigiererin", "Vaulting Coach"],
    category: "training",
    workLocation: "stationary",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["small_team", "company"],
    scope: ["local", "regional"],
    pricingModels: ["subscription", "per_session"],
    typicalServices: ["Voltigiertraining", "Gruppenvoltigieren", "Einzelvoltigieren", "Wettkampfvorbereitung"],
    typicalClients: ["Kinder/Jugendliche", "Erwachsene", "Wettkampfvoltigierer"],
    keyTools: ["Longe", "Voltigiergurt", "Kissen", "Longiertraining-Ausrüstung"],
    commonProblems: ["Pferde-Pflege/Longeur-Koordination komplex", "Hallen-Zeiten begrenzt"],
    seasonalPatterns: ["Wettkampfsaison: Frühjahr-Herbst", "Winter: Training in der Halle"],
    hufiTips: ["Vereinsstruktur oft sinnvoll", "Wettbewerbe als Motivation für Kinder"],
    relevantKeywords: ["voltigier", "voltigieren", "vaulting", "longe"]
  },

  {
    id: "distanz_trainer",
    name: "Distanzreiter-Trainer",
    nameAlternatives: ["Endurance Coach", "Distanzreiten", "Endurance Rider"],
    category: "training",
    workLocation: "both",
    environment: "outdoor",
    delivery: "both",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: ["Konditionsaufbau", "Rennvorbereitung", "Puls-/Herzfrequenz-Training", "Hufpflege-Beratung für Distanz"],
    typicalClients: ["Distanzreiter", "Ausdauerreiter", "Araberzüchter"],
    keyTools: ["Herzfrequenzmesser", "GPS-Tracker", "Spezial-Hufschuhe", "Elektrolyte"],
    commonProblems: ["Konditionsplanung komplex", "Wetterunabhängige Planung schwer"],
    seasonalPatterns: ["Rennsaison: Frühjahr-Herbst"],
    hufiTips: ["Trainingsplan digital dokumentieren", "Puls-Daten tracken für Fortschritt"],
    relevantKeywords: ["distanz", "endurance", "ausdauer", "kondition", "herzfrequenz"]
  },

  {
    id: "jungpferde_trainer",
    name: "Jungpferdetrainer",
    nameAlternatives: ["Anreiter", "Youngster Trainer", "Jungpferde-Ausbilder"],
    category: "training",
    workLocation: "both",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package", "flat_rate"],
    typicalServices: ["Anreiten", "Grundausbildung", "Desensibilisierung", "Jungpferdeauktion-Vorbereitung"],
    typicalClients: ["Züchter", "Jungpferdehalter"],
    keyTools: ["Kappzaum", "Longe", "Westerngeschirr (für Anfang)", "Kamera"],
    commonProblems: ["Pferde kommen mit verschiedenem Vorwissen", "Zeitintensiv"],
    seasonalPatterns: ["Frühjahr: Viele Jungpferdeankäufe → Nachfrage"],
    hufiTips: ["Genaues Protokoll was das Pferd kann", "Besitzer einbeziehen → Kontinuität"],
    relevantKeywords: ["jungpferd", "anreiten", "youngster", "ausbilden", "grundausbildung"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: MEDIZIN
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tierarzt_pferd",
    name: "Tierarzt (Pferd)",
    nameAlternatives: ["Equine Vet", "Pferdetierarzt", "Equine Veterinarian", "Veterinärmediziner"],
    category: "medizin",
    workLocation: "both",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team", "company"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "per_hour"],
    typicalServices: [
      "Impfungen", "Entwurmung", "Kolikuntersuchung", "Lahmheitsdiagnostik",
      "Geburtshilfe", "Zahnbehandlung (unter Sedierung)", "Blutuntersuchung",
      "Röntgen/Ultraschall", "OP", "Notfallversorgung"
    ],
    typicalClients: ["Alle Pferdehalter"],
    keyTools: ["Stethoskop", "Blutabnahmeequipment", "Röntgengerät", "Ultraschall", "Medikamente", "Notfallkoffer"],
    commonProblems: ["Erreichbarkeit rund um die Uhr", "Notfalleinsätze nachts", "Abrechnungskomplexität"],
    seasonalPatterns: ["Frühjahr: Impfungen, Entwurmung", "Sommer: Koliken häufiger", "Herbst: Entwurmung"],
    hufiTips: ["Notfallnummern kommunizieren", "Kooperationsnetzwerk mit anderen Fachrichtungen"],
    relevantKeywords: ["tierarzt", "vet", "veterinär", "impf", "entwurm", "kolik", "diagnos"]
  },

  {
    id: "pferde_heilpraktiker",
    name: "Tierheilpraktiker Pferd",
    nameAlternatives: ["Naturheilkunde Pferd", "Homöopath Pferd", "Ganzheitlicher Pferdetherapeut"],
    category: "medizin",
    workLocation: "both",
    environment: "both",
    delivery: "both",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: [
      "Homöopathie", "Akupunktur", "Phytotherapie (Kräuter)", "Bach-Blüten",
      "Bioresonanz", "TCM für Pferde", "Ernährungsberatung"
    ],
    typicalClients: ["Ganzheitlich orientierte Pferdebesitzer"],
    keyTools: ["Homöopathika", "Akupunkturnadeln", "Kräuterpräparate", "Bioresonanzgerät"],
    commonProblems: ["Rechtliche Einschränkungen (keine Diagnose)", "Skepsis seitens konventioneller Medizin"],
    seasonalPatterns: ["Ganzjährig, kein stark saisonales Muster"],
    hufiTips: ["Immer klar: keine Diagnose, keine Heilsversprechen", "Kooperation mit Tierarzt empfehlen"],
    relevantKeywords: ["heilpraktiker", "homöopathie", "akupunktur", "naturheil", "TCM", "kräuter", "ganzheitlich"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: STALL
  // ═══════════════════════════════════════════════════════════════
  {
    id: "stallbesitzer",
    name: "Stallbesitzer / Reitanlage",
    nameAlternatives: ["Pensionsinhaber", "Reitbetrieb", "Equestrian Center", "Pferdehotel"],
    category: "stall",
    workLocation: "stationary",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team", "company"],
    scope: ["local", "regional"],
    pricingModels: ["subscription", "flat_rate", "mixed"],
    typicalServices: [
      "Pferdeeinstellung (Box, Offenstall, Paddock-Trail)",
      "Fütterung & Pflege", "Weidegang", "Reithallen-/Außenbahnvermietung",
      "Voltigierplatz", "Reitunterricht (wenn mit Trainer)",
      "Ferienprogramme", "Reitstunden-Vermietung an freie Trainer"
    ],
    typicalClients: ["Pensionspferdehalter", "Vereine", "Freizeitreiter", "Turniersportler"],
    keyTools: ["Stallmanagement-Software", "Futterplan", "Putzzeug", "Medizinschrank", "Schlüsselsystem"],
    commonProblems: [
      "Personalprobleme", "Pferdeseuchen (Quarantäne)", "Wetterextreme",
      "Zahlungsausfälle bei Einstellern", "Behördenauflagen"
    ],
    seasonalPatterns: ["Sommer: Weidegang, mehr Arbeit draußen", "Winter: Mehr Hallennutzung"],
    hufiTips: [
      "Wartungslisten für Anlage digital führen",
      "Einstellerverträge schriftlich mit SEPA-Lastschrift",
      "Notfallplan für Seuchen immer parat"
    ],
    relevantKeywords: ["stall", "pension", "reitanlage", "einsteller", "box", "offenstall", "weide"]
  },

  {
    id: "pferdepfleger",
    name: "Pferdepfleger",
    nameAlternatives: ["Pferdewirt", "Stable Hand", "Equine Groom", "Stallknecht"],
    category: "stall",
    workLocation: "stationary",
    environment: "both",
    delivery: "offline",
    teamSize: ["small_team", "company"],
    scope: ["local"],
    pricingModels: ["flat_rate"],
    typicalServices: ["Fütterung", "Einstreuen", "Ausmisten", "Pflegen", "Bewegung", "Tierarzt-Begleitung"],
    typicalClients: ["Stallbetriebe", "Rennställe", "Gestüte"],
    keyTools: ["Putzzeug", "Mistgabel", "Schubkarre", "Sattelzeug"],
    commonProblems: ["Frühschicht-Arbeit", "Wochenenddienste", "Körperlich anspruchsvoll"],
    seasonalPatterns: ["Ganzjährig, gleichmäßig"],
    hufiTips: ["Schichtplan digital koordinieren", "Pferdezustand täglich notieren"],
    relevantKeywords: ["pfleger", "pflegerin", "ausmisten", "füttern", "groom", "pflege"]
  },

  {
    id: "pferdebestand_manager",
    name: "Gestütsleiter / Betriebsleiter",
    nameAlternatives: ["Stud Manager", "Yard Manager", "Betriebsleitung Reitanlage"],
    category: "stall",
    workLocation: "stationary",
    environment: "both",
    delivery: "both",
    teamSize: ["company"],
    scope: ["regional", "national"],
    pricingModels: ["flat_rate"],
    typicalServices: ["Betriebsorganisation", "Personalführung", "Zuchtplanung", "Kundenkommunikation", "Behörden"],
    typicalClients: ["Grosse Betriebe, Gestüte"],
    keyTools: ["ERP-Software", "Buchhaltungssoftware", "Stallmanagement-App"],
    commonProblems: ["Personalkoordination", "Behördenauflagen", "Futtereinkauf"],
    seasonalPatterns: ["Fohlengeburt: Frühjahr"],
    hufiTips: ["Digitales Pferde-Inventar führen", "Impf-/Entwurmungskalender automatisieren"],
    relevantKeywords: ["gestüt", "betriebsleiter", "manager", "yard", "stud"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: ERNÄHRUNG
  // ═══════════════════════════════════════════════════════════════
  {
    id: "pferdeernährungsberater",
    name: "Pferdeernährungsberater",
    nameAlternatives: ["Equine Nutritionist", "Fütterungsberater Pferd", "Pferdefutter-Coach"],
    category: "ernaehrung",
    workLocation: "both",
    environment: "both",
    delivery: "both",
    teamSize: ["solo"],
    scope: ["regional", "national", "international"],
    pricingModels: ["per_session", "package", "subscription"],
    typicalServices: [
      "Futteranalyse", "Futterplan-Erstellung", "Mineralstoff-Optimierung",
      "Rehe-Diät", "EMS/PPID-Ernährungsplan", "Gewichtsmanagement",
      "Online-Beratung", "Produkt-Empfehlungen"
    ],
    typicalClients: ["Pferdebesitzer", "Stallbetriebe", "Tierärzte (Überweisung)"],
    keyTools: ["Heu-Analyse", "Blutbild-Interpretation", "Berechnungssoftware", "Online-Meeting-Tool"],
    commonProblems: ["Kunden ignorieren Empfehlungen", "Produkt-Lobbying erschwert neutrale Beratung"],
    seasonalPatterns: ["Weideumstellung Frühjahr/Herbst: Mehr Nachfrage"],
    hufiTips: ["Online-Beratung skaliert besser als vor-Ort", "Heu-Analyse als Einstiegsprodukt"],
    relevantKeywords: ["futter", "ernährung", "nutrition", "mineralstoff", "heu", "diät", "rehe ernährung"]
  },

  {
    id: "futtermittelberater",
    name: "Futtermittelberater",
    nameAlternatives: ["Tiernahrungsberater", "Feed Consultant", "Sales Agronomist Pferd"],
    category: "ernaehrung",
    workLocation: "both",
    environment: "both",
    delivery: "both",
    teamSize: ["solo", "company"],
    scope: ["regional", "national"],
    pricingModels: ["flat_rate", "per_session"],
    typicalServices: ["Produktberatung", "Fütterungsoptimierung", "Stallbesuche", "Schulungen"],
    typicalClients: ["Stallbetriebe", "Großkunden", "Einzelpferdehalter"],
    keyTools: ["Muster", "Produktkatalog", "Fahrzeug"],
    commonProblems: ["Abhängigkeit vom Arbeitgeber/Hersteller", "Neutralität vs. Verkaufsdruck"],
    seasonalPatterns: ["Ganzjährig, leicht saisonal"],
    hufiTips: ["Kundendatenbank sauber führen", "Follow-up nach Erstkauf"],
    relevantKeywords: ["futtermittel", "pellets", "müsli", "kraftfutter", "ergänzungsfutter"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: BEGLEITUNG (Therapeutisches Reiten etc.)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "hippotherapeut",
    name: "Hippotherapeut",
    nameAlternatives: ["Hippotherapy Practitioner", "Therapeutisches Reiten", "Pferde-assistierte Therapie"],
    category: "begleitung",
    workLocation: "stationary",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "package"],
    typicalServices: ["Motorische Förderung", "Neurologische Rehabilitation", "Sensorische Integration"],
    typicalClients: ["Menschen mit Behinderungen", "Neurologische Patienten", "Kinder mit Entwicklungsverzögerung"],
    keyTools: ["Spezialsattel", "Longierausrüstung", "Therapieequipment"],
    commonProblems: ["Krankenversicherungs-Abrechnung komplex", "Pferd muss sehr ausgeglichen sein"],
    seasonalPatterns: ["Ganzjährig, wetterunabhängig (Halle)"],
    hufiTips: ["Kassenabrechnung frühzeitig klären", "Pferd regelmäßig auf Eignung prüfen"],
    relevantKeywords: ["hippotherapie", "therapeutisches reiten", "pferde therapie", "rehabilitation mensch"]
  },

  {
    id: "reitpaedagoge",
    name: "Reitpädagoge / Heilpädagoge mit Pferd",
    nameAlternatives: ["Equine Assisted Learning", "Pferde-gestützte Pädagogik", "EAL Coach"],
    category: "begleitung",
    workLocation: "stationary",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["local", "regional"],
    pricingModels: ["per_session", "package"],
    typicalServices: ["Persönlichkeitsentwicklung", "Teambuilding mit Pferden", "Coaching", "Traumaarbeit"],
    typicalClients: ["Schulen", "Jugendeinrichtungen", "Erwachsene im Coaching", "Unternehmen"],
    keyTools: ["Bodenarbeitsgeschirr", "Roundpen", "Dokumentationsmaterial"],
    commonProblems: ["Schwierige Abgrenzung zu Therapie", "Marketing komplex"],
    seasonalPatterns: ["Schuljahr: Mehr Nachfrage", "Sommer: Ferienangebote"],
    hufiTips: ["Kooperation mit Schulen/Einrichtungen", "Klar kommunizieren was EAL ist und was nicht"],
    relevantKeywords: ["pädagoge", "EAL", "coaching pferd", "teambuilding", "heilpädagoge"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: HANDWERK
  // ═══════════════════════════════════════════════════════════════
  {
    id: "sattler",
    name: "Sattler",
    nameAlternatives: ["Sattelmacher", "Saddler", "Saddle Fitter", "Sattelanpasser"],
    category: "handwerk",
    workLocation: "both",
    environment: "indoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "flat_rate"],
    typicalServices: [
      "Sattelanpassung", "Sattelreparatur", "Sattelneubau", "Gurte/Zaumzeug-Reparatur",
      "Sattelkauf-Beratung", "Trense anpassen"
    ],
    typicalClients: ["Pferdebesitzer", "Reitschulen", "Turnierstallbetreiber"],
    keyTools: ["Nähmaschine (Leder)", "Ahle", "Schaber", "Leder", "Sattelwerkzeug", "Messgerät"],
    commonProblems: ["Auftragsplanung schwankend", "Teures Material vorstrecken", "Kunden mit unrealistischen Erwartungen"],
    seasonalPatterns: ["Frühjahr: Saisoneinstieg → Sattel-Check", "Herbst: Reparatur vor Winter"],
    hufiTips: ["Sattel-Check-Termine als Abo-Modell anbieten", "Warteliste für Neubau"],
    relevantKeywords: ["sattel", "sattler", "anpassung", "sattelanpassung", "zaumzeug", "trense reparatur", "saddle"]
  },

  {
    id: "pferdezuechter",
    name: "Pferdezüchter",
    nameAlternatives: ["Horse Breeder", "Gestütsinhaber", "Stutbuchzüchter"],
    category: "stall",
    workLocation: "stationary",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo", "small_team", "company"],
    scope: ["regional", "national", "international"],
    pricingModels: ["flat_rate"],
    typicalServices: ["Zucht", "Deckstation", "Fohlenaufzucht", "Jungpferde-Verkauf", "Turnier-Platzierung"],
    typicalClients: ["Käufer von Jungpferden", "Reiter im Sport"],
    keyTools: ["Hengst", "Zuchtdokumentation", "Embryotransfer-Ausrüstung"],
    commonProblems: ["Lange Kapitalbindung", "Abhängigkeit von Hengst-Gesundheit", "Marktpreisschwankungen"],
    seasonalPatterns: ["Deckzeit: Frühjahr", "Fohlensaison: März-Juni"],
    hufiTips: ["Hengstbuch und Stutbuch digital pflegen", "Fohlendaten von Geburt an dokumentieren"],
    relevantKeywords: ["zucht", "züchter", "fohlen", "hengst", "stute", "deckung", "stutbuch"]
  },

  {
    id: "pferdehandel",
    name: "Pferdehändler",
    nameAlternatives: ["Pferdevermittler", "Horse Dealer", "Pferdeverkauf"],
    category: "handel",
    workLocation: "both",
    environment: "both",
    delivery: "both",
    teamSize: ["solo", "small_team"],
    scope: ["national", "international"],
    pricingModels: ["flat_rate", "mixed"],
    typicalServices: ["An- und Verkauf", "Vermittlung", "Ankaufsuntersuchung", "Probereiten", "Import/Export"],
    typicalClients: ["Käufer und Verkäufer"],
    keyTools: ["Inserate-Plattformen", "Video-Equipment", "Transportkontakte"],
    commonProblems: ["Rechtliche Haftungsfragen", "Vertrauen aufbauen", "Zustandsbeschreibung ehrlich vs. kommerziell"],
    seasonalPatterns: ["Frühjahr: Kaufsaison"],
    hufiTips: ["Ankaufsuntersuchung immer empfehlen", "AGB schriftlich bei jedem Verkauf"],
    relevantKeywords: ["handel", "händler", "verkaufen", "kaufen", "vermittlung", "inserieren", "export"]
  },

  {
    id: "pferdetransport",
    name: "Pferdetransportunternehmer",
    nameAlternatives: ["Horse Transport", "Pferdetaxi", "Equine Transport"],
    category: "handel",
    workLocation: "mobile",
    environment: "outdoor",
    delivery: "offline",
    teamSize: ["solo", "small_team"],
    scope: ["regional", "national", "international"],
    pricingModels: ["per_session", "flat_rate"],
    typicalServices: ["Einzeltransport", "Routentransport", "Kliniktransport", "Turniertransport", "International"],
    typicalClients: ["Pferdebesitzer", "Rennställe", "Händler", "Tierärzte"],
    keyTools: ["Pferdetransporter (1er/2er/3er)", "LKW", "Laderaumkameras", "GPS"],
    commonProblems: ["Stress für Pferde im Transport", "Termintreue bei langen Routen", "Papiere international"],
    seasonalPatterns: ["Turniersaison: Mehr Aufträge"],
    hufiTips: ["Transportstress-Protokoll für Pferde dokumentieren", "Versicherung klar kommunizieren"],
    relevantKeywords: ["transport", "transporter", "hänger", "trailer", "fahren", "abholen", "bringen"]
  },

  // ═══════════════════════════════════════════════════════════════
  // KATEGORIE: BERATUNG
  // ═══════════════════════════════════════════════════════════════
  {
    id: "pferdeversicherung",
    name: "Pferdeversicherungsberater",
    nameAlternatives: ["Equine Insurance Broker", "Tierversicherung"],
    category: "beratung",
    workLocation: "both",
    environment: "both",
    delivery: "both",
    teamSize: ["solo", "company"],
    scope: ["national"],
    pricingModels: ["flat_rate", "mixed"],
    typicalServices: ["Op-Kostenversicherung", "Lebensversicherung Pferd", "Haftpflicht Reiter", "Stallgebäude"],
    typicalClients: ["Pferdebesitzer", "Stallbetreiber"],
    keyTools: ["Vergleichsportale", "CRM", "Vertragsmanagement"],
    commonProblems: ["Komplexe Produktlandschaft", "Schäden-Abwicklung langwierig"],
    seasonalPatterns: ["Ganzjährig"],
    hufiTips: ["Schadensfälle für Kunden begleiten", "Jährlicher Versicherungs-Check anbieten"],
    relevantKeywords: ["versicherung", "versicherung pferd", "OP-Kosten", "haftpflicht reiter"]
  },

  {
    id: "pferde_fotograf",
    name: "Pferdefotograf",
    nameAlternatives: ["Equine Photographer", "Horse Photographer"],
    category: "beratung",
    workLocation: "mobile",
    environment: "both",
    delivery: "offline",
    teamSize: ["solo"],
    scope: ["regional", "national"],
    pricingModels: ["per_session", "package"],
    typicalServices: ["Turnierfotografie", "Portrait-Shooting", "Hufbearbeitungs-Doku", "Marketingfotos"],
    typicalClients: ["Pferdebesitzer", "Reitschulen", "Züchter", "Hufbearbeiter"],
    keyTools: ["Kamera", "Objektive", "Drohne", "Bildbearbeitung"],
    commonProblems: ["Wetterabhängigkeit", "Pferde bewegen sich schnell"],
    seasonalPatterns: ["Sommer: Außenshootings", "Turniersaison: Turnierfotos"],
    hufiTips: ["Galerie nach dem Termin schnell liefern", "Namensrechte klären"],
    relevantKeywords: ["fotograf", "fotografie", "shooting", "fotos", "foto"]
  },
];

// ── Lookup-Funktionen ─────────────────────────────────────────────────────────

export function getBerufById(id: string): HufiBeruf | undefined {
  return HUFI_BERUFE.find((b) => b.id === id);
}

export function getBerufByRole(userType: string): HufiBeruf | undefined {
  // Mapping von DB-Rolle zu Beruf
  const roleMap: Record<string, string> = {
    provider: "hufbearbeiter",  // Standard-Mapping: provider = Hufbearbeiter
  };
  const berufId = roleMap[userType];
  return berufId ? getBerufById(berufId) : undefined;
}

export function getBerufeByCategory(category: BerufCategory): HufiBeruf[] {
  return HUFI_BERUFE.filter((b) => b.category === category);
}

export function buildBerufContextBlock(beruf: HufiBeruf): string {
  return `BERUFSKONTEXT:
Beruf: ${beruf.name} (${beruf.nameAlternatives[0] ?? ""})
Arbeitsweise: ${beruf.workLocation === "mobile" ? "Mobil — fährt zu Kunden" : beruf.workLocation === "stationary" ? "Stationär — Kunden kommen zu ihr/ihm" : "Mobil & Stationär"}
Umgebung: ${beruf.environment}
Preismodelle: ${beruf.pricingModels.join(", ")}
Typische Dienste: ${beruf.typicalServices.slice(0, 5).join(", ")}
Häufige Alltagsprobleme: ${beruf.commonProblems.slice(0, 3).join("; ")}
Hufi-Tipps für diesen Beruf: ${beruf.hufiTips.slice(0, 3).join("; ")}`;
}

export function getAllBerufKeywords(): Map<string, string> {
  const map = new Map<string, string>();
  for (const beruf of HUFI_BERUFE) {
    for (const kw of beruf.relevantKeywords) {
      map.set(kw.toLowerCase(), beruf.id);
    }
  }
  return map;
}
