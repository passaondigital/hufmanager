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
  lastAnswerText: string | null;
  activeConfirmation: { taskId: string; stepId: string; taskType: string; description: string } | null;
  confirming: boolean;
  confirmationOutcome: { success: boolean; message: string } | null;
  taskIcon: (taskType: string) => string;
  taskLabel: (taskType: string) => string;
  onConfirm: () => void;
  onReject: () => void;
}

// Reine Ableitung: kein eigener State, keine neue Business-Logik -- bildet
// nur bereits vorhandene echte Zwischenzustände aus MobileShell.tsx auf das
// zehnstufige Phasenmodell aus HufiPremiumLab ab. Priorität von oben nach
// unten, da mehrere Signale gleichzeitig wahr sein können (z.B. orbState
// bleibt "thinking" während schon ein Ergebnis vorliegt).
export function deriveHufiExperience(input: HufiExperienceInputs): HufiExperienceUi {
  const {
    orbState, justWoke, liveTranscript, pendingClarification, lastAnswerText,
    activeConfirmation, confirming, confirmationOutcome, taskIcon, taskLabel,
    onConfirm, onReject,
  } = input;

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

  if (orbState === "speaking") {
    return {
      phase: "understanding",
      mode: "conversation",
      content: lastAnswerText ? { kind: "answer", text: lastAnswerText } : null,
    };
  }

  if (justWoke) {
    return { phase: "wake", mode: "conversation", content: null };
  }

  return { phase: "dormant", mode: "ambient", content: null };
}
