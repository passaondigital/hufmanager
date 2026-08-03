import { useEffect, useRef } from "react";
import type { HufiPhase, SurfaceMode } from "./HufiAssistantState";

interface HufiOrbProps {
  phase: HufiPhase;
  mode: SurfaceMode;
  onTap?: () => void;
}

// Zufallsdrift statt Loop: jede Zielposition wird per Zufall neu bestimmt und
// per CSS-transition angefahren. Das erzeugt echte Nicht-Wiederholbarkeit
// (ein @keyframes-Loop wiederholt sich immer identisch — das allein wirkt
// "mechanisch", egal wie organisch die einzelne Kurve aussieht). "wake" und
// "success" sind bewusst nahezu bewegungslos hier — ihre Charakteristik kommt
// aus einer einmaligen, nicht schleifenden CSS-Animation (siehe hufi-lab.css).
const DRIFT_BOUNDS: Record<
  HufiPhase,
  { x: number; y: number; biasX?: number; biasY?: number; minDelay: number; maxDelay: number; duration: number; tensionRot: number; tensionScale: number }
> = {
  dormant:     { x: 5, y: 4,             minDelay: 3000, maxDelay: 5500, duration: 3,   tensionRot: 1.5, tensionScale: 0.015 },
  wake:          { x: 2, y: 2,             minDelay: 60000, maxDelay: 60000, duration: 0.5, tensionRot: 4, tensionScale: 0.04 },
  listening:     { x: 5, y: 6, biasY: -4,  minDelay: 1200, maxDelay: 1900, duration: 1.4, tensionRot: 3,   tensionScale: 0.03 },
  understanding: { x: 2, y: 2,             minDelay: 900,  maxDelay: 1500, duration: 0.9, tensionRot: 1,   tensionScale: 0.012 },
  questioning:   { x: 4, y: 3,             minDelay: 3200, maxDelay: 5200, duration: 2.8, tensionRot: 1,   tensionScale: 0.012 },
  confirming:    { x: 9, y: 3,             minDelay: 2600, maxDelay: 5200, duration: 2.6, tensionRot: 1.2, tensionScale: 0.01 },
  executing:     { x: 1, y: 1,             minDelay: 60000, maxDelay: 60000, duration: 0.4, tensionRot: 0.5, tensionScale: 0.01 },
  speaking:      { x: 2, y: 2,             minDelay: 900,  maxDelay: 1500, duration: 0.9, tensionRot: 1,   tensionScale: 0.012 },
  success:       { x: 1, y: 1,             minDelay: 60000, maxDelay: 60000, duration: 0.3, tensionRot: 0, tensionScale: 0 },
  error:       { x: 0, y: 0, biasY: 8,   minDelay: 60000, maxDelay: 60000, duration: 1.2, tensionRot: 0, tensionScale: 0 },
  return:      { x: 5, y: 4,             minDelay: 3000, maxDelay: 5500, duration: 3,   tensionRot: 1.5, tensionScale: 0.015 },
};

export function HufiOrb({ phase, mode, onTap }: HufiOrbProps) {
  const interactive = phase === "dormant";
  const coreRef = useRef<HTMLDivElement>(null);
  const tensionRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      // Ein statischer, leicht außermittiger Versatz statt Dauerschleife —
      // Zustände bleiben unterscheidbar, ohne dass sich etwas fortlaufend bewegt.
      const bounds = DRIFT_BOUNDS[phase];
      if (coreRef.current) {
        coreRef.current.style.setProperty("--hlab-core-tx", `${(bounds.biasX ?? 0) + bounds.x * 0.3}%`);
        coreRef.current.style.setProperty("--hlab-core-ty", `${(bounds.biasY ?? 0) + bounds.y * 0.3}%`);
      }
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const bounds = DRIFT_BOUNDS[phase];

    const step = () => {
      if (cancelled) return;
      const dx = (Math.random() * 2 - 1) * bounds.x + (bounds.biasX ?? 0);
      const dy = (Math.random() * 2 - 1) * bounds.y + (bounds.biasY ?? 0);
      const rot = (Math.random() * 2 - 1) * bounds.tensionRot;
      const scale = 1 + (Math.random() * 2 - 1) * bounds.tensionScale;

      if (coreRef.current) {
        coreRef.current.style.transition = `transform ${bounds.duration}s var(--ease-smooth)`;
        coreRef.current.style.setProperty("--hlab-core-tx", `${dx}%`);
        coreRef.current.style.setProperty("--hlab-core-ty", `${dy}%`);
      }
      if (tensionRef.current) {
        tensionRef.current.style.transition = `transform ${bounds.duration + 0.6}s var(--ease-smooth)`;
        tensionRef.current.style.setProperty("--hlab-tension-rot", `${rot}deg`);
        tensionRef.current.style.setProperty("--hlab-tension-scale", `${scale}`);
      }

      const delay = bounds.minDelay + Math.random() * (bounds.maxDelay - bounds.minDelay);
      timeoutId = setTimeout(step, delay);
    };

    step();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [phase]);

  const orbBody = (
    <div className="hlab-orb-wrap" data-state={phase} data-mode={mode}>
      <div className="hlab-orb-aura" />

      <svg className="hlab-orb-svg" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path
            id="hlab-contour-path"
            d="M90,50 C90.2,59.5 77.2,73.3 67,79.4 C56.8,85.5 37.8,91.3 29,86.4 C20.2,81.5 14.2,62.4 14,50 C13.8,37.6 19.3,16.5 28,11.9 C36.7,7.3 55.7,16 66,22.3 C76.3,28.7 89.8,40.5 90,50 Z"
          />
          <linearGradient id="hlab-orange-grad" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#FDE1C4" />
            <stop offset="45%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>
        </defs>

        <g className="hlab-contour-state">
          <g ref={tensionRef} className="hlab-contour-tension">
            <use href="#hlab-contour-path" className="hlab-orb-contour-outer" />
            <g transform="translate(50 50) scale(0.58) rotate(38) translate(-50 -50)">
              <use href="#hlab-contour-path" className="hlab-orb-contour-inner" />
            </g>
            <use href="#hlab-contour-path" className="hlab-orb-flow-a" />
            <use href="#hlab-contour-path" className="hlab-orb-flow-b" />
            <use href="#hlab-contour-path" className="hlab-orb-glint" />
          </g>
        </g>
      </svg>

      <div className="hlab-orb-core-pos" ref={coreRef}>
        <div className="hlab-orb-core-glow" />
      </div>
    </div>
  );

  if (!interactive) {
    return (
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {orbBody}
      </div>
    );
  }

  return (
    <button type="button" className="hlab-orb-button hlab-focusable" onClick={onTap} aria-label="Hufi ansprechen">
      {orbBody}
    </button>
  );
}
