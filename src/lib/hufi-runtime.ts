/**
 * Hufi Runtime Core
 *
 * Central state machine and context types for the Hufi assistant.
 * All UI components read state from here instead of scattering state flags.
 */

// ── State Machine ─────────────────────────────────────────────────────────────

export type HufiRuntimeState =
  | "idle"          // waiting, orb at rest
  | "listening"     // microphone active, capturing audio
  | "transcribing"  // STT processing
  | "thinking"      // LLM/intent processing
  | "executing"     // running an action (nav, mutation)
  | "speaking";     // TTS playback in progress

export type HufiPresenceLabel =
  | "bereit"
  | "hört zu"
  | "transkribiert"
  | "denkt"
  | "führt aus"
  | "spricht"
  | "offline";

export function stateToPresence(state: HufiRuntimeState): HufiPresenceLabel {
  switch (state) {
    case "idle":         return "bereit";
    case "listening":    return "hört zu";
    case "transcribing": return "transkribiert";
    case "thinking":     return "denkt";
    case "executing":    return "führt aus";
    case "speaking":     return "spricht";
  }
}

export function presenceToState(label: HufiPresenceLabel): HufiRuntimeState {
  switch (label) {
    case "hört zu":      return "listening";
    case "transkribiert":return "transcribing";
    case "denkt":        return "thinking";
    case "führt aus":    return "executing";
    case "spricht":      return "speaking";
    default:             return "idle";
  }
}

// ── Context Snapshot ──────────────────────────────────────────────────────────

export interface HufiContextSnapshot {
  userId: string;
  userName: string | null;
  role: string | null;
  nextAppointment: {
    date: string;
    time: string | null;
    horseName: string | null;
    clientName: string | null;
    isToday: boolean;
    minutesAway: number | null;
  } | null;
  todayCount: number;
  openLeads: number;
  unpaidInvoices: number;
}

// ── Short Spoken Greeting (max ~15 words, Jarvis-style) ───────────────────────

export function buildShortSpokenGreeting(ctx: HufiContextSnapshot): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const name = ctx.userName?.split(" ")[0] ?? null;
  const intro = name ? `${salutation}, ${name}.` : `${salutation}.`;

  if (!ctx.nextAppointment) {
    return `${intro} Keine Termine heute.`;
  }

  const appt = ctx.nextAppointment;
  const timeStr = appt.time ? ` um ${appt.time.slice(0, 5)} Uhr` : "";
  const horseStr = appt.horseName ? ` bei ${appt.horseName}` : "";

  if (appt.isToday) {
    const count = ctx.todayCount;
    const countStr = count > 1 ? `${count} Termine heute.` : "Ein Termin heute.";
    return `${intro} ${countStr} Erster${horseStr}${timeStr}.`;
  }

  const dateStr = new Date(appt.date + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
  });
  return `${intro} Nächster Termin${horseStr} am ${dateStr}${timeStr}.`;
}

// ── Action IDs ────────────────────────────────────────────────────────────────

export const HUFI_ACTION_IDS = [
  "open_horse",
  "open_horses",
  "open_appointments",
  "open_calendar",
  "open_route_day",
  "open_invoices",
  "open_customers",
  "open_leads",
  "open_settings",
  "open_cockpit",
  "open_management",
  "open_team",
  "open_lager",
  "open_hufanalyse",
  "open_analyse",
  "open_chat",
] as const;

export type HufiActionId = (typeof HUFI_ACTION_IDS)[number];
