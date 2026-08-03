import { useCallback, useRef, useState } from "react";
import type { HufiPhase, SurfaceMode, ScenarioId } from "./HufiAssistantState";
import { MOCK_HORSE_OPTIONS } from "./HufiAssistantState";
import {
  buildScenarioSteps,
  buildTailSteps,
  defaultOutcome,
  SCENARIO_PAUSE_INDEX,
  type ContentView,
  type HufiScenarioOutcome,
  type HufiScenarioStep,
} from "./HufiScenarios";

interface UiState {
  phase: HufiPhase;
  mode: SurfaceMode;
  content: ContentView;
}

const IDLE_UI: UiState = { phase: "dormant", mode: "ambient", content: null };

// Zentrale Ablaufsteuerung des Labs. Ein Szenario ist ein Array aus
// Schritten (siehe HufiScenarios.ts); dieses Array wächst genau einmal, wenn
// an einem Entscheidungspunkt (questioning/confirming) ein Ergebnis
// feststeht — danach ist der komplette bisher gelaufene Ablauf als
// adressierbare Liste vorhanden. "Schritt zurück" muss dadurch keine
// Business-Logik erneut ausführen, sondern stellt einfach einen bereits
// bekannten Schritt wieder her.
export function useHufiScenarioPlayer() {
  const [ui, setUi] = useState<UiState>(IDLE_UI);
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [index, setIndex] = useState(-1);
  const stepsRef = useRef<HufiScenarioStep[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const applyIndex = useCallback((i: number) => {
    const step = stepsRef.current[i];
    if (!step) return;
    setUi({ phase: step.phase, mode: step.mode, content: step.content });
    setIndex(i);
  }, []);

  // Spielt die Schritte ab `from` mit ihren jeweiligen Verzögerungen
  // automatisch ab (Auto-Play-Verhalten von "Hey Hufi simulieren",
  // "Vollständige Demo" und normalen Bestätigungsklicks).
  const playFrom = useCallback(
    (from: number) => {
      clearTimers();
      let elapsed = 0;
      for (let i = from; i < stepsRef.current.length; i++) {
        elapsed += stepsRef.current[i].delayMs;
        const target = i;
        timers.current.push(setTimeout(() => applyIndex(target), elapsed));
      }
    },
    [applyIndex, clearTimers],
  );

  const start = useCallback(
    (id: ScenarioId) => {
      setScenario(id);
      stepsRef.current = buildScenarioSteps(id);
      playFrom(0);
    },
    [playFrom],
  );

  // Wird von den Bestätigungs-/Auswahl-Buttons in HufiPremiumLab.tsx
  // aufgerufen, sobald der Nutzer eine echte Entscheidung getroffen hat.
  const resolveAndPlay = useCallback(
    (outcome: HufiScenarioOutcome) => {
      const from = stepsRef.current.length;
      stepsRef.current = [...stepsRef.current, ...buildTailSteps(outcome)];
      playFrom(from);
    },
    [playFrom],
  );

  const goIdle = useCallback(() => {
    clearTimers();
    stepsRef.current = [];
    setIndex(-1);
    setUi(IDLE_UI);
  }, [clearTimers]);

  const stepForward = useCallback(() => {
    clearTimers();
    if (index === -1) {
      if (!scenario) return;
      stepsRef.current = buildScenarioSteps(scenario);
      applyIndex(0);
      return;
    }
    if (index + 1 < stepsRef.current.length) {
      applyIndex(index + 1);
      return;
    }
    if (index === SCENARIO_PAUSE_INDEX && scenario) {
      const outcome = defaultOutcome(scenario, MOCK_HORSE_OPTIONS);
      stepsRef.current = [...stepsRef.current, ...buildTailSteps(outcome)];
      applyIndex(index + 1);
    }
    // sonst: Ende der Sequenz (nach "dormant") — nichts weiter zu tun.
  }, [applyIndex, clearTimers, index, scenario]);

  const stepBack = useCallback(() => {
    clearTimers();
    if (index <= 0) {
      goIdle();
      return;
    }
    applyIndex(index - 1);
  }, [applyIndex, clearTimers, goIdle, index]);

  // Direktsprung der Testleiste ("Testzustände") — unabhängig vom
  // Schritt-Array, daher wird dieses zurückgesetzt (Schritt vor/zurück
  // starten danach wieder sauber beim gewählten Szenario neu).
  const hardSet = useCallback(
    (phase: HufiPhase, mode: SurfaceMode, content: ContentView) => {
      clearTimers();
      stepsRef.current = [];
      setIndex(-1);
      setUi({ phase, mode, content });
    },
    [clearTimers],
  );

  return {
    phase: ui.phase,
    mode: ui.mode,
    content: ui.content,
    scenario,
    isAtPause: index === SCENARIO_PAUSE_INDEX,
    start,
    resolveAndPlay,
    stepForward,
    stepBack,
    reset: goIdle,
    cancel: goIdle,
    hardSet,
  };
}
