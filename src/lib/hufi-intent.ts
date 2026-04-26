import type { HufiMemory } from "./hufi-brain";

export type HufiIntent =
  | "knowledge"
  | "agent_lookup"
  | "agent_action"
  | "agent_proactive"
  | "emergency";

export interface IntentEntities {
  horseName?: string;
  clientName?: string;
  action?: string;
  topic?: string;
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

  // Detect capitalised mid-sentence word as likely name
  const words = message.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[^a-zA-ZäöüÄÖÜß]/g, "");
    if (w.length > 2 && w[0] === w[0].toUpperCase() && /[a-z]/.test(w)) {
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

export function detectIntent(
  message: string,
  isLoggedIn: boolean,
  userMemory: HufiMemory[],
): IntentResult {
  const lower = message.toLowerCase().trim();

  // 1. Emergency — highest priority
  for (const kw of EMERGENCY_KW) {
    if (lower.includes(kw)) {
      return { intent: "emergency", confidence: 0.95, entities: { topic: kw }, requiresAuth: false, requiresContext: false };
    }
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
