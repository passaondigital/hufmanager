import { describe, it, expect, vi } from "vitest";
import { deriveHufiExperience, type HufiExperienceInputs } from "./hufi-experience";

function baseInput(overrides: Partial<HufiExperienceInputs> = {}): HufiExperienceInputs {
  return {
    orbState: "idle",
    justWoke: false,
    liveTranscript: "",
    pendingClarification: undefined,
    answerVisible: false,
    lastAnswerText: null,
    isTtsSpeaking: false,
    activeConfirmation: null,
    confirming: false,
    confirmationOutcome: null,
    micError: null,
    agentError: null,
    momentHint: null,
    taskIcon: () => "🧾",
    taskLabel: () => "Rechnung erstellen",
    onConfirm: vi.fn(),
    onReject: vi.fn(),
    ...overrides,
  };
}

describe("deriveHufiExperience", () => {
  it("zeigt dormant/ambient ohne jede Aktivität", () => {
    const ui = deriveHufiExperience(baseInput());
    expect(ui.phase).toBe("dormant");
    expect(ui.mode).toBe("ambient");
    expect(ui.content).toBeNull();
  });

  it("zeigt listening waehrend echter Aufnahme mit echtem Transkript", () => {
    const ui = deriveHufiExperience(baseInput({ orbState: "recording", liveTranscript: "Hallo Hufi" }));
    expect(ui.phase).toBe("listening");
    expect(ui.content).toEqual({ kind: "transcript", text: "Hallo Hufi", active: true });
  });

  it("zeigt wake statt listening direkt nach dem Mikrofonstart", () => {
    const ui = deriveHufiExperience(baseInput({ orbState: "recording", justWoke: true }));
    expect(ui.phase).toBe("wake");
  });

  it("Root-Cause-Fix: Antwort bleibt sichtbar, auch wenn TTS nicht laeuft", () => {
    const ui = deriveHufiExperience(baseInput({ answerVisible: true, lastAnswerText: "Du hast zwei offene Rechnungen.", isTtsSpeaking: false }));
    expect(ui.phase).toBe("understanding");
    expect(ui.content).toEqual({ kind: "answer", text: "Du hast zwei offene Rechnungen." });
  });

  it("zeigt speaking, wenn TTS tatsaechlich laeuft", () => {
    const ui = deriveHufiExperience(baseInput({ answerVisible: true, lastAnswerText: "Antwort", isTtsSpeaking: true }));
    expect(ui.phase).toBe("speaking");
  });

  it("echte Rueckfrage hat Vorrang vor blossem Denk-Zustand", () => {
    const ui = deriveHufiExperience(baseInput({ orbState: "thinking", pendingClarification: "Welchen Kunden meinst du?" }));
    expect(ui.phase).toBe("questioning");
    expect(ui.content).toEqual({ kind: "questioning", text: "Welchen Kunden meinst du?" });
  });

  it("echte pendingConfirmation fuehrt zu confirming mit echten Bestaetigungs-Callbacks", () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    const ui = deriveHufiExperience(baseInput({
      activeConfirmation: { taskId: "t1", stepId: "s1", taskType: "create_invoice", description: "Rechnung über 50€ anlegen?" },
      onConfirm, onReject,
    }));
    expect(ui.phase).toBe("confirming");
    expect(ui.content?.kind).toBe("confirming");
    if (ui.content?.kind === "confirming") {
      ui.content.onConfirm();
      ui.content.onReject();
    }
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("confirming (in Ausführung) hat Vorrang vor allem anderen -- keine Doppel-Bestaetigung sichtbar", () => {
    const ui = deriveHufiExperience(baseInput({
      confirming: true,
      activeConfirmation: { taskId: "t1", stepId: "s1", taskType: "create_invoice", description: "x" },
    }));
    expect(ui.phase).toBe("executing");
    expect(ui.content).toEqual({ kind: "executing" });
  });

  it("echter Erfolg nach Bestaetigung zeigt success mit echtem Resultattext", () => {
    const ui = deriveHufiExperience(baseInput({ confirmationOutcome: { success: true, message: "Rechnung erstellt." } }));
    expect(ui.phase).toBe("success");
    expect(ui.content).toEqual({ kind: "success", text: "Rechnung erstellt." });
  });

  it("echter Fehler zeigt error, kein falscher Erfolg", () => {
    const ui = deriveHufiExperience(baseInput({ confirmationOutcome: { success: false, message: "Netzwerkfehler." } }));
    expect(ui.phase).toBe("error");
    expect(ui.content).toEqual({ kind: "error", text: "Netzwerkfehler." });
  });

  it("agentError hat oberste Prioritaet -- kein falscher Erfolg trotz gleichzeitigem Success-State", () => {
    const ui = deriveHufiExperience(baseInput({
      agentError: "Verbindung fehlgeschlagen.",
      confirmationOutcome: { success: true, message: "sollte nicht erscheinen" },
    }));
    expect(ui.phase).toBe("error");
    expect(ui.content).toEqual({ kind: "error", text: "Verbindung fehlgeschlagen." });
  });

  it("Mikrofonfehler wird sichtbar, wenn kein wichtigerer Zustand aktiv ist", () => {
    const ui = deriveHufiExperience(baseInput({ micError: "Kein Mikrofonzugriff." }));
    expect(ui.phase).toBe("error");
    expect(ui.content).toEqual({ kind: "error", text: "Kein Mikrofonzugriff." });
  });

  it("momentHint erscheint nur waehrend echtem Warten (thinking), nie als erfundene Antwort", () => {
    const ui = deriveHufiExperience(baseInput({ orbState: "thinking", momentHint: "invoice" }));
    expect(ui.phase).toBe("understanding");
    expect(ui.content?.kind).toBe("hint");
  });
});
