/**
 * Fachrichtungs-spezifische Behandlungsnotiz-Templates
 * Auswählbar beim Erstellen einer neuen Notiz
 */

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "bodymap";
  options?: string[];
  placeholder?: string;
}

export interface TreatmentTemplate {
  key: string;
  label: string;
  category: string;
  icon: string;
  fields: TemplateField[];
  defaultFindings?: string;
}

// ── Body Map Zones (Pferd-Silhouette) ──
export const BODY_MAP_ZONES = [
  { id: "poll", label: "Genick", x: 85, y: 10 },
  { id: "neck_left", label: "Hals links", x: 70, y: 25 },
  { id: "neck_right", label: "Hals rechts", x: 100, y: 25 },
  { id: "withers", label: "Widerrist", x: 55, y: 20 },
  { id: "back", label: "Rücken", x: 45, y: 18 },
  { id: "loin", label: "Lendenbereich", x: 30, y: 20 },
  { id: "croup", label: "Kruppe", x: 15, y: 22 },
  { id: "shoulder_left", label: "Schulter links", x: 65, y: 40 },
  { id: "shoulder_right", label: "Schulter rechts", x: 65, y: 40 },
  { id: "chest", label: "Brust", x: 72, y: 50 },
  { id: "barrel", label: "Rumpf", x: 45, y: 45 },
  { id: "hip_left", label: "Hüfte links", x: 18, y: 35 },
  { id: "hip_right", label: "Hüfte rechts", x: 18, y: 35 },
  { id: "front_left_leg", label: "Vorderbein links", x: 68, y: 70 },
  { id: "front_right_leg", label: "Vorderbein rechts", x: 58, y: 70 },
  { id: "hind_left_leg", label: "Hinterbein links", x: 18, y: 70 },
  { id: "hind_right_leg", label: "Hinterbein rechts", x: 10, y: 70 },
  { id: "sacrum", label: "Kreuzbein", x: 20, y: 25 },
  { id: "jaw", label: "Kiefer/TMJ", x: 90, y: 18 },
] as const;

export type BodyMapZoneId = typeof BODY_MAP_ZONES[number]["id"];

// ── TIERARZT ──
const TIERARZT_TEMPLATES: TreatmentTemplate[] = [
  {
    key: "vet_routine",
    label: "Routineuntersuchung",
    category: "tierarzt",
    icon: "🩺",
    fields: [
      { key: "general_condition", label: "Allgemeinzustand", type: "select", options: ["unauffällig", "leicht reduziert", "reduziert", "stark reduziert"] },
      { key: "temperature", label: "Temperatur (°C)", type: "text", placeholder: "z.B. 37.8" },
      { key: "pulse", label: "Puls", type: "text", placeholder: "z.B. 32/min" },
      { key: "respiration", label: "Atmung", type: "text", placeholder: "z.B. 12/min" },
      { key: "mucous_membranes", label: "Schleimhäute", type: "select", options: ["blass-rosa", "rosa", "gerötet", "blass", "ikterisch"] },
      { key: "lymph_nodes", label: "Lymphknoten", type: "select", options: ["unauffällig", "vergrößert", "schmerzhaft"] },
      { key: "auscultation", label: "Auskultation", type: "textarea", placeholder: "Herz-/Lungengeräusche..." },
    ],
    defaultFindings: "Routineuntersuchung durchgeführt. Allgemeinzustand: ",
  },
  {
    key: "vet_vaccination",
    label: "Impfung / Prophylaxe",
    category: "tierarzt",
    icon: "💉",
    fields: [
      { key: "vaccine_type", label: "Impfstoff", type: "text", placeholder: "z.B. Influenza / Tetanus" },
      { key: "batch_number", label: "Chargen-Nr.", type: "text" },
      { key: "injection_site", label: "Injektionsstelle", type: "select", options: ["Hals links", "Hals rechts", "Kruppe links", "Kruppe rechts"] },
      { key: "next_due", label: "Nächste Impfung fällig", type: "text", placeholder: "z.B. in 6 Monaten" },
      { key: "deworming", label: "Entwurmung", type: "text", placeholder: "Präparat + Dosierung" },
    ],
  },
  {
    key: "vet_lab",
    label: "Laboruntersuchung",
    category: "tierarzt",
    icon: "🔬",
    fields: [
      { key: "sample_type", label: "Probenart", type: "select", options: ["Blut", "Urin", "Kot", "Abstrich", "Biopsie", "Sonstige"] },
      { key: "lab_name", label: "Labor", type: "text", placeholder: "z.B. IDEXX, Laboklin" },
      { key: "parameters", label: "Untersuchte Parameter", type: "textarea", placeholder: "z.B. großes Blutbild, Leber, Niere..." },
      { key: "results_summary", label: "Ergebnis-Zusammenfassung", type: "textarea" },
    ],
  },
  {
    key: "vet_xray",
    label: "Röntgen-Befund",
    category: "tierarzt",
    icon: "📷",
    fields: [
      { key: "region", label: "Aufnahmeregion", type: "text", placeholder: "z.B. Hufgelenk VL" },
      { key: "projections", label: "Projektionen", type: "text", placeholder: "z.B. 90°, 0°, Oxspring" },
      { key: "findings", label: "Röntgenbefund", type: "textarea", placeholder: "Beschreibe radiologische Veränderungen..." },
      { key: "classification", label: "Röntgenklasse", type: "select", options: ["I (ohne Befund)", "II (geringgradig)", "III (mittelgradig)", "IV (erheblich)", "n/a"] },
    ],
  },
  {
    key: "vet_surgery",
    label: "Operationsbericht",
    category: "tierarzt",
    icon: "🔪",
    fields: [
      { key: "indication", label: "Indikation", type: "textarea" },
      { key: "anesthesia", label: "Anästhesie", type: "text", placeholder: "z.B. Sedation / Vollnarkose" },
      { key: "procedure", label: "OP-Verlauf", type: "textarea", placeholder: "Beschreibe den Eingriff..." },
      { key: "complications", label: "Komplikationen", type: "select", options: ["keine", "geringfügig", "erheblich"] },
      { key: "postop_care", label: "Nachsorge", type: "textarea", placeholder: "Medikation, Boxenruhe, Verbandswechsel..." },
    ],
  },
];

// ── PHYSIOTHERAPEUT ──
const PHYSIO_TEMPLATES: TreatmentTemplate[] = [
  {
    key: "physio_initial",
    label: "Erstbefund",
    category: "physiotherapeut",
    icon: "📋",
    fields: [
      { key: "owner_complaints", label: "Besitzer-Angaben", type: "textarea", placeholder: "Was fällt dem Besitzer auf?" },
      { key: "visual_assessment", label: "Adspektion (Sicht)", type: "textarea", placeholder: "Haltung, Muskulatur, Symmetrie..." },
      { key: "palpation", label: "Palpation (Tastbefund)", type: "textarea", placeholder: "Spannungen, Schmerzreaktionen..." },
      { key: "body_map", label: "Körperkarte", type: "bodymap" },
      { key: "mobility", label: "Beweglichkeit", type: "textarea", placeholder: "ROM, Einschränkungen..." },
      { key: "gait_analysis", label: "Gangbildanalyse", type: "textarea", placeholder: "Schritt, Trab, Auffälligkeiten..." },
      { key: "therapy_goals", label: "Therapieziele", type: "textarea" },
    ],
  },
  {
    key: "physio_followup",
    label: "Verlaufskontrolle",
    category: "physiotherapeut",
    icon: "📊",
    fields: [
      { key: "since_last", label: "Veränderung seit letzter Behandlung", type: "textarea" },
      { key: "current_findings", label: "Aktueller Befund", type: "textarea" },
      { key: "body_map", label: "Körperkarte", type: "bodymap" },
      { key: "treatment_applied", label: "Durchgeführte Behandlung", type: "textarea" },
      { key: "homework", label: "Hausaufgaben / Übungen", type: "textarea" },
      { key: "next_appointment", label: "Empfehlung nächster Termin", type: "text", placeholder: "z.B. in 4 Wochen" },
    ],
  },
  {
    key: "physio_bodymap",
    label: "Körperkarte (Spannungspunkte)",
    category: "physiotherapeut",
    icon: "🗺️",
    fields: [
      { key: "body_map", label: "Markiere betroffene Bereiche", type: "bodymap" },
      { key: "severity_notes", label: "Erläuterung zu markierten Zonen", type: "textarea" },
    ],
  },
  {
    key: "physio_mobilization",
    label: "Mobilisationsbehandlung",
    category: "physiotherapeut",
    icon: "🤲",
    fields: [
      { key: "target_area", label: "Behandlungsregion", type: "text" },
      { key: "technique", label: "Angewandte Technik", type: "textarea", placeholder: "z.B. Massage, Dehnungen, Faszienarbeit..." },
      { key: "duration_minutes", label: "Dauer (Minuten)", type: "text", placeholder: "z.B. 45" },
      { key: "response", label: "Reaktion des Pferdes", type: "textarea" },
    ],
  },
  {
    key: "physio_final",
    label: "Abschlussbericht",
    category: "physiotherapeut",
    icon: "✅",
    fields: [
      { key: "initial_complaint", label: "Ursprüngliche Problematik", type: "textarea" },
      { key: "treatment_summary", label: "Behandlungsverlauf (Zusammenfassung)", type: "textarea" },
      { key: "outcome", label: "Ergebnis", type: "select", options: ["vollständig behoben", "deutlich verbessert", "leicht verbessert", "unverändert", "verschlechtert"] },
      { key: "recommendations", label: "Empfehlungen", type: "textarea" },
    ],
  },
];

// ── OSTEOPATH ──
const OSTEO_TEMPLATES: TreatmentTemplate[] = [
  {
    key: "osteo_anamnesis",
    label: "Anamnese",
    category: "osteopath",
    icon: "📝",
    fields: [
      { key: "history", label: "Vorgeschichte", type: "textarea", placeholder: "Bisherige Erkrankungen, Unfälle..." },
      { key: "current_issue", label: "Aktuelles Problem", type: "textarea" },
      { key: "feeding", label: "Fütterung & Haltung", type: "textarea" },
      { key: "equipment", label: "Ausrüstung (Sattel, Trense)", type: "textarea" },
      { key: "riding_discipline", label: "Reitweise / Nutzung", type: "text" },
    ],
  },
  {
    key: "osteo_findings",
    label: "Befund (strukturell / funktionell)",
    category: "osteopath",
    icon: "🔍",
    fields: [
      { key: "structural", label: "Struktureller Befund", type: "textarea", placeholder: "Blockaden, Verschiebungen..." },
      { key: "functional", label: "Funktioneller Befund", type: "textarea", placeholder: "Bewegungseinschränkungen, Asymmetrien..." },
      { key: "body_map", label: "Körperkarte", type: "bodymap" },
      { key: "craniosacral", label: "Kraniosakraler Rhythmus", type: "select", options: ["unauffällig", "eingeschränkt", "asymmetrisch", "nicht tastbar"] },
      { key: "visceral", label: "Viszeraler Befund", type: "textarea", placeholder: "Organbezogene Spannungen..." },
    ],
  },
  {
    key: "osteo_treatment",
    label: "Behandlung",
    category: "osteopath",
    icon: "🤲",
    fields: [
      { key: "techniques", label: "Angewandte Techniken", type: "textarea", placeholder: "z.B. HVT, Muskelenergietechnik, Faszienrelease..." },
      { key: "body_map", label: "Behandelte Bereiche", type: "bodymap" },
      { key: "response", label: "Sofortige Reaktion", type: "textarea" },
      { key: "duration_minutes", label: "Dauer (Minuten)", type: "text" },
    ],
  },
  {
    key: "osteo_recommendations",
    label: "Empfehlungen",
    category: "osteopath",
    icon: "💡",
    fields: [
      { key: "rest_period", label: "Ruhephase", type: "text", placeholder: "z.B. 2 Tage Schritt" },
      { key: "exercises", label: "Empfohlene Übungen", type: "textarea" },
      { key: "next_treatment", label: "Nächste Behandlung", type: "text", placeholder: "z.B. in 6 Wochen" },
      { key: "referral", label: "Weiterleitung an", type: "text", placeholder: "z.B. Tierarzt, Sattler..." },
    ],
  },
];

// ── TRAINER ──
const TRAINER_TEMPLATES: TreatmentTemplate[] = [
  {
    key: "trainer_session",
    label: "Trainingseinheit",
    category: "trainer",
    icon: "🏇",
    fields: [
      { key: "discipline", label: "Disziplin", type: "select", options: ["Dressur", "Springen", "Vielseitigkeit", "Western", "Bodenarbeit", "Longieren", "Freiarbeit", "Gelände", "Sonstige"] },
      { key: "duration_minutes", label: "Dauer (Minuten)", type: "text", placeholder: "z.B. 45" },
      { key: "exercises", label: "Übungen & Lektionen", type: "textarea", placeholder: "Was wurde trainiert?" },
      { key: "horse_behavior", label: "Verhalten des Pferdes", type: "textarea" },
      { key: "rider_feedback", label: "Reiter-Feedback", type: "textarea" },
      { key: "homework", label: "Hausaufgaben", type: "textarea" },
    ],
  },
  {
    key: "trainer_assessment",
    label: "Bestandsaufnahme",
    category: "trainer",
    icon: "📋",
    fields: [
      { key: "current_level", label: "Aktueller Ausbildungsstand", type: "textarea" },
      { key: "strengths", label: "Stärken", type: "textarea" },
      { key: "improvement_areas", label: "Verbesserungsbereiche", type: "textarea" },
      { key: "training_plan", label: "Trainingsplan (Empfehlung)", type: "textarea" },
      { key: "goals", label: "Kurzfristige Ziele", type: "textarea" },
    ],
  },
  {
    key: "trainer_behavior",
    label: "Verhaltensbeobachtung",
    category: "trainer",
    icon: "👁️",
    fields: [
      { key: "context", label: "Situation / Kontext", type: "textarea" },
      { key: "behavior_observed", label: "Beobachtetes Verhalten", type: "textarea" },
      { key: "triggers", label: "Auslöser / Trigger", type: "textarea" },
      { key: "approach", label: "Empfohlener Ansatz", type: "textarea" },
    ],
  },
];

// ── Combined export ──
export const ALL_TEMPLATES: TreatmentTemplate[] = [
  ...TIERARZT_TEMPLATES,
  ...PHYSIO_TEMPLATES,
  ...OSTEO_TEMPLATES,
  ...TRAINER_TEMPLATES,
];

export const TEMPLATES_BY_CATEGORY: Record<string, TreatmentTemplate[]> = {
  tierarzt: TIERARZT_TEMPLATES,
  physiotherapeut: PHYSIO_TEMPLATES,
  osteopath: OSTEO_TEMPLATES,
  trainer: TRAINER_TEMPLATES,
};

export function getTemplatesForSpecialty(specialty: string | null | undefined): TreatmentTemplate[] {
  if (!specialty) return ALL_TEMPLATES;
  // Map partner type keys to template categories
  const mapping: Record<string, string> = {
    tierarzt: "tierarzt",
    physiotherapeut: "physiotherapeut",
    osteopath: "osteopath",
    chiropraktiker: "osteopath", // similar workflow
    reitlehrer: "trainer",
    trainer: "trainer",
  };
  const category = mapping[specialty];
  if (category && TEMPLATES_BY_CATEGORY[category]) {
    return TEMPLATES_BY_CATEGORY[category];
  }
  return ALL_TEMPLATES;
}
