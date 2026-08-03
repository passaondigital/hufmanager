// Gemeinsames Modell für erkannte "Hufi-Momente" -- Nutzer beschreiben eine
// Situation statt eine Funktion zu nennen ("ich sitze an der Buchhaltung",
// "ich glaube da war noch eine Rechnung"). Die inhaltliche Erkennung und
// Beantwortung läuft über den echten Agenten (askHufiAgent/Claude, siehe
// den erweiterten Systemprompt in supabase/functions/hufi-agent/index.ts).
//
// detectMomentHint() unten ist AUSDRÜCKLICH kein Ersatz dafür -- nur ein
// sicherer, rein lokaler UI-Hinweis für die kurze Wartezeit, bis die echte
// Antwort da ist (z.B. "Ich schau mir das an…" statt der generischen
// Phasen-Beschriftung). Er entscheidet nichts, führt nichts aus, und wird
// von der echten Antwort immer überschrieben, sobald sie eintrifft.

export type HufiMomentType =
  | "bookkeeping"
  | "receipts"
  | "invoice"
  | "offer"
  | "appointment"
  | "customer"
  | "horse"
  | "observation"
  | "conversation"
  | "agreement"
  | "search_memory"
  | "uncertainty"
  | "planning"
  | "risk_question"
  | "general_overwhelm";

export interface HufiMoment {
  momentType: HufiMomentType;
  currentActivity?: string;
  mentionedPerson?: string;
  mentionedHorse?: string;
  mentionedBusinessObject?: string;
  uncertaintyType?: string;
  possibleTimeReference?: string;
  requestedOutcome?: string;
  missingInformation?: string;
  suggestedNextSteps?: string[];
}

// Reihenfolge relevant: erster Treffer gewinnt. Bewusst schmale, harmlose
// Muster -- keine vollständige Sprachverarbeitung, nur ein UI-Hinweis.
const HINT_PATTERNS: Array<{ type: HufiMomentType; re: RegExp }> = [
  { type: "bookkeeping",   re: /\b(buchhaltung|beleg|belege|quittung)\b/i },
  { type: "invoice",       re: /\brechnung/i },
  { type: "offer",         re: /\bangebot/i },
  { type: "appointment",   re: /\btermin/i },
  { type: "horse",         re: /\b(ich (bin|steh|stehe)\s+(bei|an))\b/i },
  { type: "customer",      re: /\b(kunde|kundin|frau \w+|herr \w+|gesprochen mit)\b/i },
  // Vor "agreement" geprüft: "was hatten wir vereinbart"/"wo war das" sind
  // explizite Rückfragen an die Erinnerung (search_memory-Tool), nicht nur
  // die allgemeinere Kategorie "eine Vereinbarung wurde erwähnt".
  { type: "search_memory", re: /\b(wo war|wie war|was hatten wir|haben wir)\b/i },
  { type: "agreement",     re: /\b(vereinbart|abgemacht|besprochen)\b/i },
  { type: "uncertainty",   re: /\b(ich glaube|ich dachte|müsste eigentlich)\b/i },
  { type: "risk_question", re: /\bwas (ist,? )?wenn\b/i },
  { type: "general_overwhelm", re: /\b(weiß (gerade )?nicht,? wo|alles so kompliziert|hätte ich nur)\b/i },
  { type: "planning",      re: /\b(wo (fang|fange) ich an|priorität|zuerst)\b/i },
];

export function detectMomentHint(text: string): HufiMomentType | null {
  const t = text.trim();
  if (!t) return null;
  for (const { type, re } of HINT_PATTERNS) {
    if (re.test(t)) return type;
  }
  return null;
}

// Nur für die kurze Wartezeit gedacht -- kurze, ruhige Zwischenmeldung,
// keine Behauptung über gefundene Daten (das kommt ausschließlich von der
// echten Antwort).
const HINT_LABELS: Record<HufiMomentType, string> = {
  bookkeeping: "Ich schaue in die Buchhaltung…",
  receipts: "Ich schaue nach Belegen…",
  invoice: "Ich schaue nach der Rechnung…",
  offer: "Ich schaue nach dem Angebot…",
  appointment: "Ich schaue in den Kalender…",
  customer: "Ich schaue nach den Kundendaten…",
  horse: "Ich schaue in die Pferdeakte…",
  observation: "Ich schaue mir die Beobachtung an…",
  conversation: "Ich schaue mir das Gespräch an…",
  agreement: "Ich schaue nach der Vereinbarung…",
  search_memory: "Ich schaue im Verlauf nach…",
  uncertainty: "Ich prüfe das kurz…",
  planning: "Ich schaue, was gerade wichtig ist…",
  risk_question: "Ich denke kurz mit…",
  general_overwhelm: "Ich sortiere das kurz für dich…",
};

export function momentHintLabel(type: HufiMomentType): string {
  return HINT_LABELS[type];
}
