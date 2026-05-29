import type { HufiMemory } from "./hufi-brain";
import type { NavTarget } from "./hufi-nav-actions";

export type HufiIntent =
  | "knowledge"
  | "agent_lookup"
  | "agent_action"
  | "agent_proactive"
  | "emergency"
  | "navigation"
  | "correction";

export interface IntentEntities {
  horseName?: string;
  clientName?: string;
  action?: string;
  topic?: string;
  navTarget?: NavTarget;
}

export interface IntentResult {
  intent: HufiIntent;
  confidence: number;
  entities: IntentEntities;
  requiresAuth: boolean;
  requiresContext: boolean;
}

const EMERGENCY_KW = [
  "kolik", "notfall", "blutet", "liegt nicht auf", "atmet schwer",
  "lahmt stark", "sturz", "aufgebläht", "wälzt sich", "schweißgebadet",
  "bewusstlos", "krampf", "kollaps", "schockzustand", "liegt nicht mehr auf",
];

const WEATHER_KW = [
  "wetter", "temperatur", "regen", "regnet", "regnen", "sonne", "sonnig",
  "wind", "windig", "wolken", "bewölkt", "schnee", "frost", "gewitter",
  "wetterbericht", "wettervorhersage", "wie ist das wetter", "wetter heute",
  "wetter morgen", "wird es regnen", "regnet es", "wie kalt", "wie warm",
  "grad", "celsius", "niederschlag",
];

const KNOWLEDGE_KW = [
  "was ist", "wie funktioniert", "erkläre", "warum", "was bedeutet",
  "wie oft", "ist es normal", "was sind", "wie behandelt", "welche symptome",
  "was verursacht", "wie entsteht", "was hilft", "woran erkenne",
  "wie lange dauert", "definition", "erklär mir", "erkläre mir",
];

const ACTION_KW = [
  "erstelle", "erstell", "mach mir", "schreib", "sende", "buche",
  "lösche", "storniere", "update", "erinnere mich", "plane", "anlegen",
  "eintragen", "hinzufügen", "ändere", "neue rechnung", "neuer termin",
  "notiere", "speichere",
];

const LOOKUP_KW = [
  "wie geht", "wann war", "letzter", "letzte", "zuletzt", "zeig mir",
  "zeig", "befund", "history", "was steht", "status von", "info über",
  "infos zu", "details zu", "offene rechnungen", "nächster termin",
  "wann kommt", "wann war",
];

function extractHorseName(message: string, memory: HufiMemory[]): string | undefined {
  const lower = message.toLowerCase();
  const horseNames = memory
    .filter((m) => m.category === "horse_pattern" && typeof (m.value as Record<string,unknown>)?.name === "string")
    .map((m) => ((m.value as Record<string,unknown>).name as string).toLowerCase());

  for (const name of horseNames) {
    if (lower.includes(name)) return name;
  }

  // Detect capitalised mid-sentence word as likely horse name
  const HORSE_STOP = new Set([
    "hey", "okay", "ok", "hufi", "wufi", "bitte", "kannst", "hast",
    "brauchst", "nicht", "speichern", "vergiss", "lösch", "schreib",
    "mach", "zeig", "öffne", "geh", "erstell", "sende", "plan",
    "termin", "rechnung", "kalender", "kunden", "pferde", "befund",
    "ich", "du", "er", "sie", "es", "wir", "ihr", "sie",
    "das", "die", "der", "ein", "eine", "einen", "dem", "den",
    "und", "oder", "aber", "doch", "auch", "noch", "schon",
    "ah", "ach", "ja", "nein", "okay", "gut", "danke",
  ]);
  const words = message.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[^a-zA-ZäöüÄÖÜß]/g, "");
    if (
      w.length >= 4 &&
      w[0] === w[0].toUpperCase() &&
      /[a-z]/.test(w) &&
      !HORSE_STOP.has(w.toLowerCase())
    ) {
      return w;
    }
  }
  return undefined;
}

function extractClientName(message: string, memory: HufiMemory[]): string | undefined {
  const lower = message.toLowerCase();
  const clientNames = memory
    .filter((m) => m.category === "client_note" && typeof (m.value as Record<string,unknown>)?.name === "string")
    .map((m) => ((m.value as Record<string,unknown>).name as string).toLowerCase());

  for (const name of clientNames) {
    if (lower.includes(name)) return name;
  }
  return undefined;
}

function extractAction(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rechnung")) return "create_invoice";
  if (lower.includes("termin")) return "create_appointment";
  if (lower.includes("erinnerung") || lower.includes("erinnere")) return "set_reminder";
  if (lower.includes("sende") || lower.includes("nachricht")) return "send_message";
  if (lower.includes("lösche") || lower.includes("storniere")) return "delete";
  return "generic_action";
}

// ─── Navigation intent ───────────────────────────────────────────────────────
// Phase C: detect simple "öffne X" / "zeig X" / "geh zu X" commands and map
// them to a NavTarget descriptor for hufi-nav-actions.runNavAction.
//
// Returns null if the message is not a navigation command. Keep this function
// CONSERVATIVE — false positives steal the user's prompt from the chat AI.

const NAV_VERBS = [
  "öffne", "öffnen", "oeffne", "oeffnen",
  "zeig", "zeige", "zeigen", "zeig mir", "zeige mir",
  "geh zu", "gehe zu", "gehen zu",
  "navigiere zu", "navigiere",
  "wechsle zu", "wechseln zu",
  "spring zu", "springe zu",
  "ruf auf", "rufe auf", "aufrufen",
];

interface TargetMatcher {
  build: (rest: string) => NavTarget | null;
  patterns: RegExp[];
}

// Each matcher has a list of word-boundary patterns. The last group, when
// present, captures the remainder for entity-bearing targets (e.g. horse name).
const TARGET_MATCHERS: TargetMatcher[] = [
  // Phase E: next/today's appointment (must come BEFORE generic calendar)
  {
    build: () => ({ kind: "next_appointment" }),
    patterns: [
      /\b(nächste[rn]?|kommende[rn]?|heutige[rn]?|nächste[ns]?)\s+termin\b/,
      /\btermin\s+(heute|als\s+nächstes|jetzt)\b/,
      /\bwann\s+(ist|hab)\s+(ich\s+)?(der\s+)?nächste[rn]?\s+termin\b/,
    ],
  },
  // Calendar / appointments
  {
    build: () => ({ kind: "calendar" }),
    patterns: [/\bkalender\b/, /\btermine?\b/, /\bterminkalender\b/, /\bappointments?\b/],
  },
  // Daily route / today
  {
    build: () => ({ kind: "route_day" }),
    patterns: [/\btour\b/, /\btages?tour\b/, /\bheutiger?\b/, /\btageskockpit\b/, /\btagestour\b/],
  },
  // Invoices
  {
    build: () => ({ kind: "invoices" }),
    patterns: [/\brechnungen?\b/, /\bbelege?\b(?!.*upload)/, /\bumsa?tze?\b/, /\binvoices?\b/],
  },
  // Customers
  {
    build: () => ({ kind: "customers" }),
    patterns: [/\bkunden\b/, /\bkundenliste\b/, /\bclients?\b/, /\bkundenübersicht\b/],
  },
  // Leads / inquiries (generic — must come BEFORE lead_by_name)
  {
    build: () => ({ kind: "leads" }),
    patterns: [/\banfragen?\b/, /\bleads?\b/, /\binteressenten\b/, /\bneuanfragen?\b/],
  },
  // Settings
  {
    build: () => ({ kind: "settings" }),
    patterns: [/\beinstellungen?\b/, /\bsettings?\b/, /\bkonfiguration\b/],
  },
  // Tages-Cockpit
  {
    build: () => ({ kind: "cockpit" }),
    patterns: [/\bcockpit\b/, /\btages.?cockpit\b/, /\barbeits.?tag\b/],
  },
  // Management Hub
  {
    build: () => ({ kind: "management" }),
    patterns: [/\bmanagement\b/, /\bprofil\b/, /\bmein\s+(profil|account|konto)\b/],
  },
  // Team
  {
    build: () => ({ kind: "team" }),
    patterns: [/\bteam\b/, /\bmitarbeiter\b/, /\bangestellte?\b/],
  },
  // Lager
  {
    build: () => ({ kind: "lager" }),
    patterns: [/\blager\b/, /\bmaterial\b/, /\bwerkzeug\b/, /\bvorrat\b/],
  },
  // Hufanalyse
  {
    build: () => ({ kind: "hufanalyse" }),
    patterns: [/\bhufanalyse\b/, /\bhuf.?analyse\b/, /\bhuf.?bild\b/, /\bhuf.?foto\b/],
  },
  // Analyse / Statistiken
  {
    build: () => ({ kind: "analyse" }),
    patterns: [/\banalyse\b/, /\bstatistik\b/, /\bauswertung\b/, /\bzahlen\b/],
  },
  // Chat / Nachrichten
  {
    build: () => ({ kind: "chat" }),
    patterns: [/\bchat\b/, /\bnachrichten\b/, /\bnachricht\b/],
  },
  // Horses list (must come BEFORE the wildcard horse matcher)
  {
    build: () => ({ kind: "horses" }),
    patterns: [
      /\b(meine|alle)\s+pferde\b/,
      /\bpferdeliste\b/,
      /\bpferde[-\s]?übersicht\b/,
      /\bpferde\b\s*(?:liste|übersicht)?\s*$/,
    ],
  },
];

// Phase E: Lead by name — "zeig Lead von Max" / "öffne Anfrage von Müller"
const LEAD_NAME_PATTERNS: RegExp[] = [
  /\b(?:anfrage|lead)\s+(?:von\s+)(.+?)\s*[.!?]?\s*$/i,
  /\b(?:zeig|öffne|öffnen)\s+(?:anfrage|lead)\s+(?:von\s+)?(.+?)\s*[.!?]?\s*$/i,
];

// Single horse with name — captures the rest of the message as a probable name.
const HORSE_OPEN_PATTERNS: RegExp[] = [
  /\b(?:öffne|öffnen|oeffne|zeig|zeige|geh zu|gehe zu|navigiere zu|spring zu|ruf auf|rufe auf)\s+(?:die\s+)?(?:pferdeakte\s+(?:von\s+)?|akte\s+(?:von\s+)?)?(.+?)\s*$/i,
  /\b(?:pferdeakte\s+(?:von\s+)?|akte\s+(?:von\s+)?)(.+?)\s*$/i,
  /^(.+?)\s+(?:öffnen|öffne|aufrufen|aufmachen|anzeigen|zeigen)\s*[.!?]?\s*$/i,
];

function startsWithNavVerb(message: string): boolean {
  const lower = message.toLowerCase().trimStart();
  return NAV_VERBS.some((v) => lower.startsWith(v + " ") || lower === v);
}

function endsWithNavVerb(message: string): boolean {
  const lower = message.toLowerCase().trim().replace(/[.!?]+$/, "");
  return /\b(öffnen|aufrufen|aufmachen|anzeigen|zeigen)$/i.test(lower);
}

export function detectNavigationTarget(message: string): NavTarget | null {
  if (!message.trim()) return null;
  if (!startsWithNavVerb(message) && !endsWithNavVerb(message)) return null;

  const lower = message.toLowerCase();

  // 1. Match deterministic targets first (calendar, invoices, …)
  for (const matcher of TARGET_MATCHERS) {
    if (matcher.patterns.some((re) => re.test(lower))) {
      return matcher.build("");
    }
  }

  // 2a. Phase E: lead by name — check before horse patterns.
  for (const re of LEAD_NAME_PATTERNS) {
    const m = message.match(re);
    if (m && m[1]) {
      const candidate = m[1].replace(/[.!?]+$/, "").trim();
      if (candidate && candidate.length <= 60) {
        return { kind: "lead_by_name", query: candidate };
      }
    }
  }

  // 2b. Single horse by name. Skip if the message contains a generic
  //     target-keyword that we already covered above.
  const STOPWORDS = /\b(kalender|termine?|rechnungen?|kunden|anfragen?|leads?|einstellungen?|tour|tageskockpit|profil|settings|pferde\b)\b/;
  if (STOPWORDS.test(lower)) return null;

  for (const re of HORSE_OPEN_PATTERNS) {
    const m = message.match(re);
    if (m && m[1]) {
      const candidate = m[1]
        .replace(/^(die|der|das|den|den|dem|deine?n?|meinen?|ihren?|euren?)\s+/i, "")
        .replace(/^(pferd|pferdes?)\s+/i, "")
        .replace(/[.!?]+$/, "")
        .trim();
      if (candidate && candidate.length <= 60) {
        return { kind: "horse", query: candidate };
      }
    }
  }

  return null;
}

export function detectIntent(
  message: string,
  isLoggedIn: boolean,
  userMemory: HufiMemory[],
): IntentResult {
  const lower = message.toLowerCase().trim();

  // ── Korrektur-Intent (muss zuerst geprüft werden) ─────────────────────────
  const CORRECTION_PATTERNS = [
    /^(nein|nee|nö|ne)\b/i,
    /\b(das stimmt nicht|nicht das|nicht so|falsch|ich meinte|ich wollte sagen|korrigier|ändere das|das war falsch)\b/i,
    /^(stop|halt|warte)\b/i,
    /\b(vergiss das|vergiss es|cancel|abbrechen)\b/i,
  ];
  if (CORRECTION_PATTERNS.some((p) => p.test(lower))) {
    return { intent: "correction" as HufiIntent, confidence: 0.95, entities: {}, requiresAuth: false, requiresContext: false };
  }

  // 1. Emergency — highest priority (overrides everything else)
  for (const kw of EMERGENCY_KW) {
    if (lower.includes(kw)) {
      return { intent: "emergency", confidence: 0.95, entities: { topic: kw }, requiresAuth: false, requiresContext: false };
    }
  }

  // 1a. Weather — real-time lookup, handled separately
  for (const kw of WEATHER_KW) {
    if (lower.includes(kw)) {
      return { intent: "knowledge", confidence: 0.9, entities: { topic: "weather_query" }, requiresAuth: false, requiresContext: false };
    }
  }

  // 1b. Navigation — direct command, takes precedence over AI routing
  const navTarget = detectNavigationTarget(message);
  if (navTarget) {
    return {
      intent: "navigation",
      confidence: 0.9,
      entities: {
        navTarget,
        horseName: navTarget.kind === "horse" ? navTarget.query : undefined,
      },
      requiresAuth: true,
      requiresContext: false,
    };
  }

  // 2. Agent action
  for (const kw of ACTION_KW) {
    if (lower.includes(kw)) {
      return {
        intent: "agent_action",
        confidence: 0.85,
        entities: {
          horseName: extractHorseName(message, userMemory),
          clientName: extractClientName(message, userMemory),
          action: extractAction(message),
        },
        requiresAuth: true,
        requiresContext: true,
      };
    }
  }

  // 3. Knowledge question
  for (const kw of KNOWLEDGE_KW) {
    if (lower.includes(kw)) {
      return { intent: "knowledge", confidence: 0.85, entities: { topic: lower }, requiresAuth: false, requiresContext: false };
    }
  }

  // 4. Agent lookup — known names or lookup keywords
  const horseName = extractHorseName(message, userMemory);
  const clientName = extractClientName(message, userMemory);

  for (const kw of LOOKUP_KW) {
    if (lower.includes(kw)) {
      return { intent: "agent_lookup", confidence: 0.8, entities: { horseName, clientName }, requiresAuth: true, requiresContext: true };
    }
  }
  if (horseName || clientName) {
    return { intent: "agent_lookup", confidence: 0.75, entities: { horseName, clientName }, requiresAuth: true, requiresContext: true };
  }

  // 5. Short questions lean knowledge
  if (lower.endsWith("?") || lower.length < 60) {
    return { intent: "knowledge", confidence: 0.6, entities: { topic: lower }, requiresAuth: false, requiresContext: false };
  }

  return { intent: "agent_proactive", confidence: 0.5, entities: {}, requiresAuth: isLoggedIn, requiresContext: isLoggedIn };
}
