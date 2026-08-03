import type { LucideIcon } from "lucide-react";
import {
  Moon,
  Sparkles,
  Mic,
  BrainCircuit,
  Loader2,
  HelpCircle,
  ClipboardCheck,
  Check,
  WifiOff,
  Volume2,
} from "lucide-react";

// ── Oberflächenmodus & Kommunikationsphase ──────────────────────────────
// Drei Helligkeits-/Aufmerksamkeitsstufen (Ambient/Conversation/Immersive)
// und neun Orb-Reaktionsphasen. "return" ist bewusst kein eigener
// Testleisten-Eintrag — er entsteht als Teil der Szenario-Automatik beim
// Rückweg in den Ambient-Modus.
export type SurfaceMode = "ambient" | "conversation" | "immersive";

export type HufiPhase =
  | "dormant"
  | "wake"
  | "listening"
  | "understanding"
  | "questioning"
  | "confirming"
  | "executing"
  | "speaking"
  | "success"
  | "error"
  | "return";

export const HUFI_PHASE_ORDER: HufiPhase[] = [
  "dormant",
  "wake",
  "listening",
  "understanding",
  "questioning",
  "confirming",
  "executing",
  "success",
  "error",
];

interface HufiPhaseMeta {
  label: string;
  hint: string;
  devLabel: string;
  Icon: LucideIcon;
  mode: SurfaceMode;
}

export const HUFI_PHASE_META: Record<HufiPhase, HufiPhaseMeta> = {
  dormant: { label: "", hint: "", devLabel: "Ambient", Icon: Moon, mode: "ambient" },
  wake: { label: "Ja, Pascal?", hint: "", devLabel: "Wake Word", Icon: Sparkles, mode: "conversation" },
  listening: { label: "Hufi hört zu", hint: "Sprich einfach — Hufi versteht.", devLabel: "Listening", Icon: Mic, mode: "immersive" },
  understanding: { label: "Hufi hat verstanden", hint: "Das ist erkannt worden.", devLabel: "Understanding", Icon: BrainCircuit, mode: "immersive" },
  questioning: { label: "Eine Rückfrage", hint: "Bitte auswählen.", devLabel: "Question", Icon: HelpCircle, mode: "conversation" },
  confirming: { label: "Bereit zur Bestätigung", hint: "Bitte kurz prüfen.", devLabel: "Confirmation", Icon: ClipboardCheck, mode: "conversation" },
  executing: { label: "Wird ausgeführt", hint: "Einen Moment.", devLabel: "Executing", Icon: Loader2, mode: "conversation" },
  speaking: { label: "Hufi antwortet", hint: "", devLabel: "Speaking", Icon: Volume2, mode: "conversation" },
  success: { label: "Erledigt", hint: "", devLabel: "Success", Icon: Check, mode: "conversation" },
  error: { label: "Kurz keine Verbindung", hint: "Hufi meldet sich, sobald es wieder geht.", devLabel: "Offline", Icon: WifiOff, mode: "conversation" },
  return: { label: "", hint: "", devLabel: "Return", Icon: Moon, mode: "ambient" },
};

export function timeSalutation(): string {
  const h = new Date().getHours();
  return h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

// Prototyp — Name nur als Beispiel-Platzhalter aus der Design-Vorgabe,
// keine geladenen Kundendaten.
export const MOCK_USER_FIRST_NAME = "Pascal";

export const MOCK_AMBIENT_HINT = "Zwei Termine brauchen Vorbereitung.";

// ── Szenarien ────────────────────────────────────────────────────────────
export type ScenarioId = "observation" | "appointment" | "ambiguous" | "invoice";

export const SCENARIO_ORDER: ScenarioId[] = ["observation", "appointment", "ambiguous", "invoice"];

export const SCENARIO_META: Record<ScenarioId, { label: string; devLabel: string }> = {
  observation: { label: "Beobachtung speichern", devLabel: "Beobachtung" },
  appointment: { label: "Termin vorbereiten", devLabel: "Termin" },
  ambiguous: { label: "Mehrdeutige Anfrage", devLabel: "Mehrdeutig" },
  invoice: { label: "Rechnung erstellen", devLabel: "Rechnung" },
};

// Fünftes, optionales Szenario aus der Vorgabe: Hufi meldet sich selbst im
// Ambient Mode. Bewusst außerhalb von ScenarioId/SCENARIO_ORDER, da es
// keinen Wake-Vorspann (kein Nutzer-Transkript, kein Intent aus einer
// Nutzeräußerung) durchläuft, sondern direkt eine Ambient-Hinweiskarte zeigt.
export const PROACTIVE_META = { label: "Proaktiver Hinweis", devLabel: "Proaktiv" };

// Prototyp-Testdaten — frei erfunden, keine echten Kunden-, Pferde- oder
// Rechnungsdaten. Dienen ausschließlich der visuellen Demonstration der
// Mock-Szenarien im isolierten Lab.

export const MOCK_TRANSCRIPTS: Record<ScenarioId, string> = {
  observation: "Hey Hufi, trag bei Ginebra ein, dass der linke Vorderhuf heute empfindlich war.",
  appointment: "Was muss ich für meinen nächsten Termin wissen?",
  ambiguous: "Öffne Ginger.",
  invoice: "Erstelle die Rechnung für den heutigen Termin.",
};

export const MOCK_SUCCESS_TEXT: Record<ScenarioId, string> = {
  observation: "Die Beobachtung wurde als Entwurf vorbereitet.",
  appointment: "Termin vorbereitet.",
  ambiguous: "", // Erfolgstext hängt von der Auswahl ab, siehe HufiScenarios.ts
  invoice: "Der Rechnungsentwurf ist vorbereitet.",
};

// ── Intent- & Entitäten-Darstellung ──────────────────────────────────────
// Menschlich lesbare Struktur statt Entwickler-JSON — wird von
// HufiIntentSummary gerendert, bevor die eigentliche Bestätigungsvorschau
// erscheint.
export interface HufiEntity {
  label: string;
  value: string;
}
export interface HufiIntent {
  label: string;
  entities: HufiEntity[];
}
export const MOCK_INTENTS: Record<ScenarioId, HufiIntent> = {
  observation: {
    label: "Beobachtung speichern",
    entities: [
      { label: "Pferd", value: "Ginebra" },
      { label: "Bereich", value: "Linker Vorderhuf" },
      { label: "Beobachtung", value: "Empfindlich" },
      { label: "Datum", value: "Heute" },
    ],
  },
  appointment: {
    label: "Nächsten Termin vorbereiten",
    entities: [{ label: "Zeitraum", value: "Nächster Termin" }],
  },
  ambiguous: {
    label: "Pferdeakte öffnen",
    entities: [{ label: "Suchbegriff", value: "Ginger" }],
  },
  invoice: {
    label: "Rechnung vorbereiten",
    entities: [{ label: "Zeitraum", value: "Heutiger Termin" }],
  },
};

export interface MockObservation {
  horse: string;
  area: string;
  observation: string;
  date: string;
}
export const MOCK_OBSERVATION: MockObservation = {
  horse: "Ginebra",
  area: "Linker Vorderhuf",
  observation: "Empfindlich",
  date: "Heute",
};

export interface MockAppointmentDetail {
  time: string;
  customer: string;
  horse: string;
  address: string;
  lastNote: string;
  openTask: string;
  lastEditedAt: string;
  departureTime: string;
  routeNote: string;
  specialNote?: string;
}
export const MOCK_APPOINTMENT: MockAppointmentDetail = {
  time: "14:00 Uhr",
  customer: "Familie Brandt",
  horse: "Ginebra",
  address: "Hofweg 12, 21073 Hamburg",
  lastNote: "Letztes Mal leichte Unruhe beim Beschlagen der Hinterhufe.",
  openTask: "Neue Hufeisen für die Hinterhufe mitbringen.",
  lastEditedAt: "Gestern, 18:42 Uhr",
  departureTime: "13:30 Uhr",
  routeNote: "ca. 25 Min. Fahrzeit",
  specialNote: "Ginebra ist beim Verladen empfindlich — ruhig angehen.",
};

export interface MockHorseOption {
  id: string;
  name: string;
  owner: string;
  place: string;
  lastAppointment: string;
}
export const MOCK_HORSE_OPTIONS: MockHorseOption[] = [
  { id: "ginger-1", name: "Ginger", owner: "Familie Novak", place: "Stall A", lastAppointment: "12.07." },
  { id: "ginger-2", name: "Gingerbread", owner: "Julia Berger", place: "Stall C", lastAppointment: "03.06." },
];

export interface MockInvoice {
  customer: string;
  horse: string;
  service: string;
  amount: string;
  date: string;
  paymentTerm: string;
  hint?: string;
}
export const MOCK_INVOICE: MockInvoice = {
  customer: "Familie Brandt",
  horse: "Ginebra",
  service: "Hufbearbeitung + Beschlag hinten",
  amount: "86,00 €",
  date: "Heute",
  paymentTerm: "14 Tage",
  hint: "Anfahrtspauschale wurde nicht erkannt und sollte vor dem Versand geprüft werden.",
};

// ── Proaktives Szenario (optional, Ambient Mode) ────────────────────────
export interface MockProactiveNoticeAction {
  id: string;
  label: string;
}
export interface MockProactiveNotice {
  message: string;
  reason: string;
  actions: MockProactiveNoticeAction[];
}
export const MOCK_PROACTIVE_NOTICE: MockProactiveNotice = {
  message: "Pascal, bei deinem Termin um 14:00 Uhr fehlt noch die Stalladresse.",
  reason: "Ohne Adresse kann Hufi die Route nicht vorbereiten.",
  actions: [
    { id: "add-address", label: "Adresse ergänzen" },
    { id: "ask-customer", label: "Kundin fragen" },
    { id: "remind-later", label: "Später erinnern" },
  ],
};
