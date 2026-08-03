import type { HufiPhase, SurfaceMode, ScenarioId, MockHorseOption } from "./HufiAssistantState";
import { MOCK_TRANSCRIPTS, MOCK_SUCCESS_TEXT } from "./HufiAssistantState";

// Beschreibt NUR, welcher Antwortbaustein gerade zu sehen ist — die
// eigentlichen Karten/Buttons (inkl. onClick-Handler) werden in
// HufiPremiumLab.tsx anhand von `kind` gerendert, da dort der Zugriff auf
// den Player für den fertigstellenden Klick liegt.
export type ContentView =
  | null
  | { kind: "transcript"; text: string; active: boolean }
  | { kind: "intent"; scenario: ScenarioId }
  | { kind: "observation-confirm" }
  | { kind: "appointment-confirm" }
  | { kind: "horse-choice" }
  | { kind: "invoice-confirm" }
  | { kind: "success"; text: string; horseRecord?: MockHorseOption };

export interface HufiScenarioStep {
  phase: HufiPhase;
  mode: SurfaceMode;
  content: ContentView;
  /** Abstand zum vorherigen Schritt beim automatischen Abspielen. */
  delayMs: number;
}

// Index des Entscheidungspunkts im Vorspann jedes Szenarios (questioning/
// confirming) — hier wartet der Ablauf auf eine Nutzerentscheidung, bevor
// die Ausführung (Tail) angehängt wird.
export const SCENARIO_PAUSE_INDEX = 4;

const FINAL_STEP: Record<ScenarioId, { phase: "questioning" | "confirming"; content: ContentView }> = {
  observation: { phase: "confirming", content: { kind: "observation-confirm" } },
  appointment: { phase: "confirming", content: { kind: "appointment-confirm" } },
  ambiguous: { phase: "questioning", content: { kind: "horse-choice" } },
  invoice: { phase: "confirming", content: { kind: "invoice-confirm" } },
};

// Der Vorspann ist für alle Szenarien strukturell identisch: wacht auf →
// hört zu (Transkript erscheint, dann verstummt der Cursor) → versteht
// (Intent + Entitäten sichtbar) → zeigt das szenariospezifische Ergebnis.
// Als reines Datenarray statt Funktionskette, damit automatisches Abspielen
// UND Einzelschritt-Navigation (Schritt vor/zurück) dieselbe Quelle nutzen —
// und damit ein Schritt später leicht durch ein echtes Ereignis (Voice-
// Erkennung, Backend-Antwort) statt durch einen Timer ausgelöst werden kann.
export function buildScenarioSteps(scenario: ScenarioId): HufiScenarioStep[] {
  const transcript = MOCK_TRANSCRIPTS[scenario];
  const final = FINAL_STEP[scenario];
  return [
    { phase: "wake", mode: "conversation", content: null, delayMs: 0 },
    { phase: "listening", mode: "immersive", content: { kind: "transcript", text: transcript, active: true }, delayMs: 750 },
    { phase: "listening", mode: "immersive", content: { kind: "transcript", text: transcript, active: false }, delayMs: 1700 },
    { phase: "understanding", mode: "immersive", content: { kind: "intent", scenario }, delayMs: 550 },
    { phase: final.phase, mode: "conversation", content: final.content, delayMs: 900 },
  ];
}

export interface HufiScenarioOutcome {
  text: string;
  horseRecord?: MockHorseOption;
}

export function horseOutcome(horse: MockHorseOption): HufiScenarioOutcome {
  return { text: `${horse.name} (${horse.place}) geöffnet.`, horseRecord: horse };
}

// Ergebnis, das "Schritt vor" an einem Entscheidungspunkt simuliert, wenn
// niemand selbst klickt (Beobachtung speichern / Terminvorbereitung öffnen /
// Entwurf vorbereiten / erstes Pferd auswählen).
export function defaultOutcome(scenario: ScenarioId, horseOptions: MockHorseOption[]): HufiScenarioOutcome {
  if (scenario === "ambiguous") return horseOutcome(horseOptions[0]);
  return { text: MOCK_SUCCESS_TEXT[scenario] };
}

// Ausführung + Erfolg + Rückkehr in den Ambient Mode — für jedes Szenario
// gleich aufgebaut, unabhängig vom vorher gewählten Ergebnis.
export function buildTailSteps(outcome: HufiScenarioOutcome): HufiScenarioStep[] {
  return [
    { phase: "executing", mode: "conversation", content: null, delayMs: 650 },
    { phase: "success", mode: "conversation", content: { kind: "success", text: outcome.text, horseRecord: outcome.horseRecord }, delayMs: 1300 },
    { phase: "return", mode: "ambient", content: null, delayMs: 700 },
    { phase: "dormant", mode: "ambient", content: null, delayMs: 400 },
  ];
}
