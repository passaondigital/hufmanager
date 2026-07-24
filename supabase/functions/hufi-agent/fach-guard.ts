// A1 — Serverseitiger Fach-Guard (Medizin + Recht/Steuer)
// Hintergrund: Die bisherigen Keyword-Filter (hufi-intent.ts KNOWLEDGE_KW,
// checkHorseWelfare in hufi-brain.ts) laufen NUR im Frontend und greifen nicht
// bei jeder Formulierung ("welches Medikament?" rutscht durch). Dieser Guard
// sitzt in der Edge Function VOR dem Claude-Call und kann vom Client nicht
// umgangen werden.
//
// Abgrenzung: Dokumentation ("dokumentiere Wandhebelung") und Datenabfragen
// ("wann war Luna dran") sind normale Arbeit und dürfen NICHT blockiert
// werden — nur Diagnose-/Beratungs-Anfragen (Fragen) werden abgefangen.

export type FachGuardCategory = "medical" | "legal";

// Imperative Dokumentations-/Notiz-Verben am Satzanfang → Guard greift nicht,
// unabhängig von enthaltenen Fachbegriffen (das ist Arbeit, keine Frage).
const DOC_OVERRIDE = /^\s*(dokumentiere|dokumentier|notiere|notier|speichere|speicher|vermerke|vermerk|trag(e)?\s+ein|halte?\s+fest|erstelle?\s+(eine\s+)?notiz)\b/i;

// Fragen, die für sich genommen bereits eindeutig auf Diagnose/Behandlung
// abzielen — brauchen keinen zusätzlichen Symptom-Kontext.
const MEDICAL_STRONG_PATTERNS: RegExp[] = [
  /\bwas (hat|fehlt)\s+(mein|das|dem|unser)?\s*(pferd|pony|tier)\b/i,
  /\bwelche[s]?\s*(medikament|medizin|mittel|dosis|dosierung|tablette|spritze|wirkstoff)\b/i,
  /\bwie\s*(viel|hoch)\b[^.?!]{0,25}\b(dosierung|dosis)\b/i,
  /\bdiagnos/i,
  /\bwas (soll|kann|darf) ich (ihm|ihr|dem pferd)?\s*(geben|verabreichen|spritzen)\b/i,
];

// Symptom-Wörter — lösen NUR zusammen mit einer Beratungsfrage aus (siehe unten),
// damit reine Dokumentation ("Wandhebelung", "leichte Lahmheit notiert") nicht blockiert wird.
const SYMPTOM_WORDS = [
  "lahmt", "hinkt", "humpelt", "geschwollen", "schwellung", "fieber",
  "wunde", "blutet", "hustet", "husten", "frisst nicht", "appetitlosigkeit",
  "atmet schwer", "zittert", "koliksymptom",
];

const MEDICAL_QUESTION_CONTEXT = /\b(was (soll ich )?tun|was mach ich|wie behandel|muss ich (zum )?tierarzt|ist das schlimm|was würdest du (tun|empfehlen|raten))\b/i;

// Recht/Steuer: Fachbegriff + Beratungsfrage (oder "?") → Guard greift.
// "steuer" allein triggert auch über umsatzsteuer/einkommensteuer/gewerbesteuer (Teilstring).
const LEGAL_KEYWORDS = /\b(umsatzsteuer|einkommensteuer|gewerbesteuer|kleinunternehmerregelung|steuererklärung|steuer\w*|vertrag\w*|haftung\w*|kündig\w*|fristlos\w*|abmahnung\w*|gewährleistung\w*|mängel\w*|dsgvo\w*|bußgeld\w*|abrechnungspflicht\w*)\b/i;
const LEGAL_QUESTION_CONTEXT = /\b(muss ich|darf ich|kann ich|ist das (rechtens|legal|erlaubt)|wie versteuere|wie melde ich)\b/i;

export function checkFachGuard(rawText: string): FachGuardCategory | null {
  const t = rawText.trim();
  if (!t) return null;
  if (DOC_OVERRIDE.test(t)) return null;

  if (MEDICAL_STRONG_PATTERNS.some((re) => re.test(t))) return "medical";

  const lower = t.toLowerCase();
  const hasSymptom = SYMPTOM_WORDS.some((w) => lower.includes(w));
  if (hasSymptom && MEDICAL_QUESTION_CONTEXT.test(t)) return "medical";

  if (LEGAL_KEYWORDS.test(t) && (LEGAL_QUESTION_CONTEXT.test(t) || t.endsWith("?"))) {
    return "legal";
  }

  return null;
}

// A3: Breitere, nicht-blockierende Fachthema-Erkennung — für den Hinweis-Badge
// in der Chat-Bubble ("Allgemeine Information …"), auch wenn der Guard NICHT
// gegriffen hat (z.B. allgemeine Wissensfrage "Was ist EGUS?").
const FACH_MEDICAL_TOPIC_WORDS = [
  "kolik", "hufrehe", "tetanus", "ehv-1", "ehv1", "hyperlipämie", "strahlfäule",
  "ems", "ppid", "cushing", "mauke", "sommerekzem", "egus", "magengeschwür",
  "cob", "rao", "lahmheit", "medikament", "dosierung", "dosis", "omeprazol",
  "pergolid", "wirkstoff", "diagnose", "symptom", "krankheit", "entzündung",
  "tierarzt",
];
const FACH_LEGAL_TOPIC_WORDS = [
  "steuer", "umsatzsteuer", "einkommensteuer", "gewerbesteuer", "kleinunternehmer",
  "vertrag", "haftung", "kündig", "dsgvo", "bußgeld", "mängel", "gewährleistung",
  "abmahnung",
];

export function detectFachTopic(rawText: string): FachGuardCategory | null {
  const lower = rawText.trim().toLowerCase();
  if (!lower) return null;
  if (FACH_MEDICAL_TOPIC_WORDS.some((w) => lower.includes(w))) return "medical";

  const legalHit = FACH_LEGAL_TOPIC_WORDS.find((w) => lower.includes(w));
  if (legalHit) {
    // "kündig" ist auch normales Vokabular für Termin-Absagen ("Termin kündigen/absagen") —
    // dort kein Fachthema-Hinweis, nur bei Kunden-/Vertragskündigung.
    if (legalHit === "kündig" && lower.includes("termin")) return null;
    return "legal";
  }
  return null;
}

export const FACH_GUARD_RESPONSES: Record<FachGuardCategory, string> = {
  medical:
    "Das ist eine wichtige Frage — aber die kann ich dir ehrlicherweise nicht seriös beantworten. Ich bin kein Tierarzt, und Hufi ersetzt keine tierärztliche Untersuchung. Bitte sprecht bei gesundheitlichen Themen direkt mit eurem Tierarzt — nur der kann sich das Pferd wirklich ansehen und einschätzen, was los ist. Ich helfe dir gern, den Vorfall zu dokumentieren oder einen Termin zu organisieren.",
  legal:
    "Das würde ich dir nicht aus dem Ärmel beantworten wollen — bei rechtlichen oder steuerlichen Fragen bin ich raus, das ist Sache eures Steuerberaters oder einer Rechtsberatung. Ich kann dir aber gern helfen, sobald ihr wisst, wie es laufen soll — z.B. die Rechnung vorbereiten oder den Vorgang dokumentieren.",
};
