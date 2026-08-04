import type { HufiPhase, SurfaceMode } from "@/components/assistant-lab/HufiAssistantState";
import { momentHintLabel, type HufiMomentType } from "@/lib/hufi-moment";

// Fehlerkategorie, damit Hufi nicht jeden Fehler pauschal als "Keine
// Verbindung" darstellt (P0-Vorgabe). "mic"/"transcription" kommen aus
// useVoiceCapture, "agent"/"action" aus askHufiAgent bzw. der
// Task-Bestätigung, "tts" aus der Sprachausgabe.
export type HufiErrorCategory = "mic" | "transcription" | "network" | "agent" | "action" | "tts" | "unknown";

export interface HufiUiError {
  text: string;
  category: HufiErrorCategory;
}

// Reale Content-Varianten für HufiAssistantExperience -- Pendant zu
// ContentView aus HufiScenarios.ts, aber ohne MOCK_*-Daten. Jede Variante
// wird ausschließlich aus echtem Live-State (MobileShell.tsx) befüllt.
export type RealContentView =
  | null
  | { kind: "transcript"; text: string; active: boolean }
  | { kind: "answer"; text: string }
  | { kind: "hint"; text: string }
  | { kind: "questioning"; text: string }
  | {
      kind: "confirming";
      icon: string;
      label: string;
      description: string;
      onConfirm: () => void;
      onReject: () => void;
    }
  | { kind: "executing" }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string; category: HufiErrorCategory };

export interface HufiExperienceUi {
  phase: HufiPhase;
  mode: SurfaceMode;
  content: RealContentView;
}

export interface HufiExperienceInputs {
  orbState: "idle" | "recording" | "transcribing" | "thinking" | "speaking";
  justWoke: boolean;
  liveTranscript: string;
  pendingClarification: string | undefined;
  answerVisible: boolean;
  lastAnswerText: string | null;
  isTtsSpeaking: boolean;
  activeConfirmation: { taskId: string; stepId: string; taskType: string; description: string } | null;
  confirming: boolean;
  confirmationOutcome: { success: boolean; message: string } | null;
  micError: HufiUiError | null;
  agentError: HufiUiError | null;
  // Rein lokaler, sicherer UI-Hinweis für die kurze Wartezeit auf die echte
  // Antwort -- siehe hufi-moment.ts. Entscheidet nichts, wird von jeder
  // echten Antwort/Rückfrage/Bestätigung sofort verdrängt (Prioritäten oben).
  momentHint: HufiMomentType | null;
  // Echter, zeitbasierter Warte-Hinweis ("Ich schaue nach." / "Ich brauche
  // gerade einen Moment länger.") -- kein erfundener Fortschritt, nur ein
  // Signal, dass Hufi noch lebt, solange die echte Antwort auf sich warten
  // lässt. Niedrigere Priorität als momentHint (fachlich konkreter).
  waitHint: string | null;
  taskIcon: (taskType: string) => string;
  taskLabel: (taskType: string) => string;
  onConfirm: () => void;
  onReject: () => void;
}

// Reine Ableitung: kein eigener State, keine neue Business-Logik -- bildet
// nur bereits vorhandene echte Zwischenzustände aus MobileShell.tsx auf das
// Phasenmodell (HufiPhase + "speaking") ab. Priorität von oben nach unten,
// da mehrere Signale gleichzeitig wahr sein können.
export function deriveHufiExperience(input: HufiExperienceInputs): HufiExperienceUi {
  const {
    orbState, justWoke, liveTranscript, pendingClarification, answerVisible, lastAnswerText,
    isTtsSpeaking, activeConfirmation, confirming, confirmationOutcome, micError, agentError,
    momentHint, waitHint, taskIcon, taskLabel, onConfirm, onReject,
  } = input;

  // Höchste Priorität: sichtbare, echte Fehler -- Hufi darf nie stillschweigend
  // "Erfolg" zeigen, wenn etwas real fehlgeschlagen ist.
  if (agentError) {
    return { phase: "error", mode: "conversation", content: { kind: "error", text: agentError.text, category: agentError.category } };
  }

  if (confirmationOutcome) {
    return confirmationOutcome.success
      ? { phase: "success", mode: "conversation", content: { kind: "success", text: confirmationOutcome.message } }
      : { phase: "error", mode: "conversation", content: { kind: "error", text: confirmationOutcome.message, category: "action" } };
  }

  if (confirming) {
    return { phase: "executing", mode: "conversation", content: { kind: "executing" } };
  }

  if (activeConfirmation) {
    return {
      phase: "confirming",
      mode: "conversation",
      content: {
        kind: "confirming",
        icon: taskIcon(activeConfirmation.taskType),
        label: taskLabel(activeConfirmation.taskType),
        description: activeConfirmation.description,
        onConfirm,
        onReject,
      },
    };
  }

  if (pendingClarification) {
    return { phase: "questioning", mode: "conversation", content: { kind: "questioning", text: pendingClarification } };
  }

  if (orbState === "recording") {
    if (justWoke) return { phase: "wake", mode: "conversation", content: null };
    return {
      phase: "listening",
      mode: "immersive",
      content: { kind: "transcript", text: liveTranscript || "…", active: true },
    };
  }

  if (micError) {
    return { phase: "error", mode: "conversation", content: { kind: "error", text: micError.text, category: micError.category } };
  }

  // Echte Antwort ist da (unabhängig davon, ob TTS gerade tatsächlich läuft
  // oder fehlgeschlagen ist) -- der Text bleibt sichtbar, "speaking" nur als
  // Zusatzhinweis, solange die Wiedergabe wirklich läuft.
  if (answerVisible && lastAnswerText) {
    return {
      phase: isTtsSpeaking ? "speaking" : "understanding",
      mode: "conversation",
      content: { kind: "answer", text: lastAnswerText },
    };
  }

  // Aufnahme ist zu Ende, das Audio wird noch transkribiert -- eigene Phase,
  // damit "Hufi hat verstanden" nicht erscheint, bevor überhaupt ein
  // Transkript existiert (P0-Ursache).
  if (orbState === "transcribing") {
    return {
      phase: "transcribing",
      mode: "immersive",
      content: liveTranscript ? { kind: "transcript", text: liveTranscript, active: false } : null,
    };
  }

  if (orbState === "thinking") {
    return {
      phase: "understanding",
      mode: "conversation",
      content: momentHint
        ? { kind: "hint", text: momentHintLabel(momentHint) }
        : waitHint
          ? { kind: "hint", text: waitHint }
          : null,
    };
  }

  if (justWoke) {
    return { phase: "wake", mode: "conversation", content: null };
  }

  return { phase: "dormant", mode: "ambient", content: null };
}
