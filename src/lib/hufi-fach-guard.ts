// Client-seitiger Zwilling von supabase/functions/hufi-agent/fach-guard.ts
// Muss inhaltlich IDENTISCH bleiben. Duplikation statt Import, weil die Edge
// Function in Deno läuft und nicht im selben Vite-Bundle wie src/lib liegt
// (gleiches Muster wie taskTypeToActionType in hufi-agent/index.ts).
//
// Warum es hier ZUSÄTZLICH zum Server-Guard existiert: Mehrere clientseitige
// Vorprüfungen in MobileShell.processChatMessage (matchSkills, TASK_TEMPLATES
// über detectAndCreateTask, detectIntent → agent_action) laufen VOR jedem
// Aufruf von askHufiAgent und damit VOR dem serverseitigen Guard. Eine
// Formulierung wie "Muss ich mit Umsatzsteuer abrechnen?" matchte bisher den
// TASK_TEMPLATES-Trigger /abrechnen/i und startete eine echte Aktion, ohne
// dass der Server-Guard sie je zu sehen bekam. Dieser Client-Guard muss daher
// als ALLERERSTE Prüfung in processChatMessage laufen, vor allen anderen.

export type FachGuardCategory = "medical" | "legal";

const DOC_OVERRIDE = /^\s*(dokumentiere|dokumentier|notiere|notier|speichere|speicher|vermerke|vermerk|trag(e)?\s+ein|halte?\s+fest|erstelle?\s+(eine\s+)?notiz)\b/i;

const MEDICAL_STRONG_PATTERNS: RegExp[] = [
  /\bwas (hat|fehlt)\s+(mein|das|dem|unser)?\s*(pferd|pony|tier)\b/i,
  /\bwelche[s]?\s*(medikament|medizin|mittel|dosis|dosierung|tablette|spritze|wirkstoff)\b/i,
  /\bwie\s*(viel|hoch)\b[^.?!]{0,25}\b(dosierung|dosis)\b/i,
  /\bdiagnos/i,
  /\bwas (soll|kann|darf) ich (ihm|ihr|dem pferd)?\s*(geben|verabreichen|spritzen)\b/i,
];

const SYMPTOM_WORDS = [
  "lahmt", "hinkt", "humpelt", "geschwollen", "schwellung", "fieber",
  "wunde", "blutet", "hustet", "husten", "frisst nicht", "appetitlosigkeit",
  "atmet schwer", "zittert", "koliksymptom", "schmerzen", "schmerzt",
  "durchfall", "kotwasser", "apathisch", "teilnahmslos",
];

const MEDICAL_QUESTION_CONTEXT = /\b(was (soll ich |kann ich |mach(e)? ich )?(jetzt )?tun|was mach ich|wie behandel|muss ich (zum |einen )?tierarzt|brauche ich (einen )?tierarzt|ist das (schlimm|gefährlich)|wie schlimm ist das|was würdest du (tun|empfehlen|raten)|soll ich (mir )?sorgen machen|wie geht es (jetzt |dann )?weiter)\b/i;

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

export const FACH_GUARD_RESPONSES: Record<FachGuardCategory, string> = {
  medical:
    "Das ist eine wichtige Frage — aber die kann ich dir ehrlicherweise nicht seriös beantworten. Ich bin kein Tierarzt, und Hufi ersetzt keine tierärztliche Untersuchung. Bitte sprecht bei gesundheitlichen Themen direkt mit eurem Tierarzt — nur der kann sich das Pferd wirklich ansehen und einschätzen, was los ist. Ich helfe dir gern, den Vorfall zu dokumentieren oder einen Termin zu organisieren.",
  legal:
    "Das würde ich dir nicht aus dem Ärmel beantworten wollen — bei rechtlichen oder steuerlichen Fragen bin ich raus, das ist Sache eures Steuerberaters oder einer Rechtsberatung. Ich kann dir aber gern helfen, sobald ihr wisst, wie es laufen soll — z.B. die Rechnung vorbereiten oder den Vorgang dokumentieren.",
};
