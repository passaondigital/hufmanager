import { HufiVoiceWave } from "@/components/voice/HufiVoiceWave";
import { useTheme } from "@/components/ThemeProvider";
import type { HufiPhase, SurfaceMode } from "./HufiAssistantState";

interface HufiWaveProps {
  phase: HufiPhase;
  mode: SurfaceMode;
  onTap?: () => void;
  // Abgeleiteter Unterzustand von "listening": true, sobald der aktuelle
  // Transkript-Schritt `active: false` ist (siehe HufiScenarios.ts) —
  // keine eigene Phase, nur ein UI-Hinweis, dass Hufi gerade verarbeitet.
  settled?: boolean;
}

// Übernimmt die echte, in der App bereits produktiv genutzte Wave-
// Animation (src/components/voice/HufiVoiceWave.tsx — dieselbe Komponente
// wie in MobileShellVoiceSection und dem Voice-Modal) statt einer
// eigenen Lab-Erfindung. Farblich bewusst NICHT die volle STATE_COLOR-
// Palette aus HufiVoiceModal.tsx übernommen (dort Indigo/Grün für
// verarbeitend/erfolgreich) — die Premium-Politur-Runde verlangt explizit
// "keine neuen Farben erfinden, Orange bleibt die Hufi-Identität".
// Zustände unterscheiden sich stattdessen über Amplitude/Rhythmus/
// Geschwindigkeit (siehe hufi-lab.css, [data-state] auf .hlab-wave-wrap)
// und nur noch in Helligkeitsstufen von Orange. Einzige Ausnahme: error
// bleibt gedämpftes Rot — ohne zweite Farbe wäre "Fehler" von "aktiv"
// nicht unterscheidbar.
const PHASE_COLOR: Partial<Record<HufiPhase, string>> = {
  wake: "#F97316",
  listening: "#F97316",
  understanding: "#EA580C",
  questioning: "#FDBA74",
  confirming: "#F97316",
  executing: "#F97316",
  success: "#F97316",
  error: "#FCA5A5",
};

const PAUSED_PHASES = new Set<HufiPhase>(["dormant", "return", "error"]);
const IDLE_PHASES = new Set<HufiPhase>(["dormant", "return"]);

export function HufiWave({ phase, mode, onTap, settled }: HufiWaveProps) {
  const { theme } = useTheme();
  const interactive = phase === "dormant";
  // Ruhezustand ist bewusst nicht neutral-grau, sondern immer orange
  // getönt — in beiden Themes dieselbe volle Farbe. HufiVoiceWave dimmt
  // pausierte Balken bereits selbst auf 25% Deckkraft (siehe dort); eine
  // zusätzliche Transparenz hier würde sich damit multiplizieren und auf
  // dunklem Grund praktisch unsichtbar werden.
  const idleColor = theme === "dark" ? "#FDBA74" : "#F97316";
  // "settled" (Transkript hat sich beruhigt, siehe Prop-Kommentar) liest
  // sich farblich wie "understanding" — beides ist Hufi beim Verarbeiten.
  const color = settled ? "#EA580C" : IDLE_PHASES.has(phase) ? idleColor : (PHASE_COLOR[phase] ?? "#F97316");
  const paused = PAUSED_PHASES.has(phase);
  const barCount = mode === "ambient" ? 7 : 9;

  const waveBody = (
    <div className="hlab-wave-wrap" data-state={phase} data-mode={mode}>
      <HufiVoiceWave color={color} barCount={barCount} height={68} paused={paused} />
    </div>
  );

  if (!interactive) {
    return (
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {waveBody}
      </div>
    );
  }

  return (
    <button type="button" className="hlab-wave-button hlab-focusable" onClick={onTap} aria-label="Hufi ansprechen">
      {waveBody}
    </button>
  );
}
