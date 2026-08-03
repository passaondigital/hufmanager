import type { HufiPhase, SurfaceMode } from "@/components/assistant-lab/HufiAssistantState";

// Reale Content-Varianten für HufiAssistantExperience -- Pendant zu
// ContentView aus HufiScenarios.ts, aber ohne MOCK_*-Daten. Jede Variante
// wird ausschließlich aus echtem Live-State (MobileShell.tsx) befüllt.
export type RealContentView =
  | null
  | { kind: "transcript"; text: string; active: boolean }
  | { kind: "answer"; text: string }
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
  | { kind: "error"; text: string };

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
  micError: string | null;
  agentError: string | null;
  taskIcon: (taskType: string) => string;
  taskLabel: (taskType: string) => string;
  onConfirm: () => void;
  onReject: () => void;
}

// Reine Ableitung: kein eigener State, keine neue Business-Logik -- bildet
// nur bereits vorhandene echte Zwischenzustände aus MobileShell.tsx auf das
// elfstufige Phasenmodell (HufiPhase + "speaking") ab. Priorität von oben
// nach unten, da mehrere Signale gleichzeitig wahr sein können.
export function deriveHufiExperience(input: HufiExperienceInputs): HufiExperienceUi {
  const {
    orbState, justWoke, liveTranscript, pendingClarification, answerVisible, lastAnswerText,
    isTtsSpeaking, activeConfirmation, confirming, confirmationOutcome, micError, agentError,
    taskIcon, taskLabel, onConfirm, onReject,
  } = input;

  // Höchste Priorität: sichtbare, echte Fehler -- Hufi darf nie stillschweigend
  // "Erfolg" zeigen, wenn etwas real fehlgeschlagen ist.
  if (agentError) {
    return { phase: "error", mode: "conversation", content: { kind: "error", text: agentError } };
  }

  if (confirmationOutcome) {
    return confirmationOutcome.success
      ? { phase: "success", mode: "conversation", content: { kind: "success", text: confirmationOutcome.message } }
      : { phase: "error", mode: "conversation", content: { kind: "error", text: confirmationOutcome.message } };
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
    return { phase: "error", mode: "conversation", content: { kind: "error", text: micError } };
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

  if (orbState === "transcribing") {
    return {
      phase: "understanding",
      mode: "immersive",
      content: liveTranscript ? { kind: "transcript", text: liveTranscript, active: false } : null,
    };
  }

  if (orbState === "thinking") {
    return { phase: "understanding", mode: "conversation", content: null };
  }

  if (justWoke) {
    return { phase: "wake", mode: "conversation", content: null };
  }

  return { phase: "dormant", mode: "ambient", content: null };
}
