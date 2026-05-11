import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useHufiTTS } from "@/hooks/useHufiTTS";

type VoiceState = "idle" | "speaking" | "done" | "unsupported";

const GREETING =
  "Hallo. Ich bin Hufi. Ich helfe Menschen dabei, Pferde besser zu verstehen.";

const WORDS = GREETING.split(" ");
const WORD_MS = 360;
const LS_KEY = "hufi_landing_voice_muted";

function readMuted(): boolean {
  try { return localStorage.getItem(LS_KEY) === "true"; } catch { return false; }
}
function saveMuted(val: boolean): void {
  try { if (val) localStorage.setItem(LS_KEY, "true"); else localStorage.removeItem(LS_KEY); }
  catch { /* private-mode or storage blocked */ }
}

const reducedMotion =
  typeof window !== "undefined"
    ? (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
    : false;

/* ── Unsupported fallback ─────────────────────────────── */
function UnsupportedShell() {
  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
      role="region"
      aria-label="Hufi Vorstellung"
    >
      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.22em] mb-10"
          style={{ color: "rgba(249,115,22,0.45)" }}
        >
          Hufi kennenlernen
        </span>

        <div className="relative mb-8" style={{ width: 112, height: 112 }}>
          <button
            disabled
            aria-label="Sprachausgabe in diesem Browser nicht verfügbar"
            className="w-full h-full rounded-full flex items-center justify-center cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.1)",
            }}
          >
            <VolumeX className="w-7 h-7" style={{ color: "rgba(255,255,255,0.18)" }} />
          </button>
        </div>

        <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.18)" }}>
          Sprachausgabe wird in diesem Browser nicht unterstützt
        </p>

        <div
          className="max-w-xs sm:max-w-sm w-full rounded-2xl px-5 py-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
            &ldquo;{GREETING}&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Main section ─────────────────────────────────────── */
export default function HufiVoiceSection() {
  const { speak, cancel, isSupported } = useHufiTTS();
  const [state, setState] = useState<VoiceState>(isSupported ? "idle" : "unsupported");
  const [muted, setMuted] = useState(readMuted);
  const [revealCount, setRevealCount] = useState(0);
  const wordIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const stopTimers = useCallback(() => {
    if (wordIntervalRef.current != null) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }
    if (doneTimeoutRef.current != null) {
      clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
  }, []);

  const handleDone = useCallback(() => {
    stopTimers();
    setRevealCount(WORDS.length);
    setState("done");
  }, [stopTimers]);

  const launchSpeech = useCallback(
    (playAudio: boolean) => {
      cancel();
      stopTimers();
      setState("speaking");

      if (reducedMotion) {
        setRevealCount(WORDS.length);
      } else {
        setRevealCount(0);
        let count = 0;
        wordIntervalRef.current = window.setInterval(() => {
          count++;
          setRevealCount(count);
          if (count >= WORDS.length) {
            clearInterval(wordIntervalRef.current!);
            wordIntervalRef.current = null;
          }
        }, WORD_MS);
      }

      if (playAudio) {
        speak(GREETING, handleDone);
      } else {
        const delay = reducedMotion ? 800 : WORDS.length * WORD_MS + 500;
        doneTimeoutRef.current = window.setTimeout(handleDone, delay);
      }
    },
    [cancel, stopTimers, speak, handleDone],
  );

  const handleStart = useCallback(() => launchSpeech(!muted), [launchSpeech, muted]);
  const handleReplay = useCallback(() => launchSpeech(!muted), [launchSpeech, muted]);

  const handleMuteToggle = useCallback(() => {
    const willMute = !muted;
    setMuted(willMute);
    saveMuted(willMute);
    if (willMute && state === "speaking") {
      cancel();
      stopTimers();
      setRevealCount(WORDS.length);
      setState("done");
    }
  }, [muted, state, cancel, stopTimers]);

  useEffect(() => () => { cancel(); stopTimers(); }, [cancel, stopTimers]);

  if (state === "unsupported") return <UnsupportedShell />;

  const isActive = state === "speaking";
  const isDone = state === "done";

  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
      role="region"
      aria-label="Hufi Sprachvorstellung"
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none transition-opacity duration-1000"
        style={{
          background: "radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 70%)",
          opacity: isActive ? 1 : 0.45,
        }}
      />

      {/* Screen-reader status (not word-by-word spam) */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isActive
          ? "Hufi spricht gerade"
          : isDone
          ? "Hufi hat die Vorstellung abgeschlossen"
          : ""}
      </p>

      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6">
        {/* Eyebrow */}
        <span
          className="text-[11px] font-bold uppercase tracking-[0.22em] mb-10"
          style={{ color: "rgba(249,115,22,0.55)" }}
        >
          Hufi kennenlernen
        </span>

        {/* ── ORB ── */}
        <div className="relative mb-10" style={{ width: 112, height: 112 }}>
          {/* Ripple rings */}
          {isActive &&
            !reducedMotion &&
            [0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute inset-0 rounded-full hufi-ripple"
                style={{
                  border: "1.5px solid rgba(249,115,22,0.4)",
                  animation: `hufiOrbRipple 2.2s ease-out ${i * 0.72}s infinite`,
                }}
              />
            ))}

          {/* Idle breathing glow */}
          {!isActive && !isDone && !reducedMotion && (
            <span
              className="absolute rounded-full pointer-events-none hufi-breathe"
              style={{
                inset: "-20px",
                background:
                  "radial-gradient(circle, rgba(249,115,22,0.13) 0%, transparent 70%)",
                animation: "hufiOrbBreathe 3.5s ease-in-out infinite",
              }}
            />
          )}

          {/* Orb button */}
          <button
            onClick={
              state === "idle" ? handleStart : isDone ? handleReplay : undefined
            }
            disabled={isActive}
            aria-label={
              state === "idle"
                ? "Hufi anhören"
                : isDone
                ? "Nochmal anhören"
                : "Hufi spricht…"
            }
            className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/30 disabled:cursor-default"
            style={{
              background: isActive
                ? "radial-gradient(circle at 38% 30%, #ffab60 0%, #f97316 55%, #e06010 100%)"
                : "radial-gradient(circle at 40% 35%, rgba(249,115,22,0.30) 0%, rgba(249,115,22,0.10) 100%)",
              boxShadow: isActive
                ? "0 0 0 6px rgba(249,115,22,0.14), 0 0 0 16px rgba(249,115,22,0.07), 0 18px 52px rgba(249,115,22,0.5)"
                : "0 0 0 3px rgba(249,115,22,0.10), 0 8px 28px rgba(249,115,22,0.18)",
              border: `1.5px solid ${
                isActive ? "rgba(249,115,22,0.65)" : "rgba(249,115,22,0.28)"
              }`,
            }}
          >
            {isActive ? (
              <Volume2 className="w-8 h-8 text-white" strokeWidth={1.5} />
            ) : isDone ? (
              <RotateCcw
                className="w-7 h-7"
                style={{ color: "#f97316" }}
                strokeWidth={1.5}
              />
            ) : (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="#f97316"
                aria-hidden="true"
                style={{ transform: "translateX(2px)" }}
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* CTA label */}
        <p
          className="text-sm font-medium mb-8 transition-all duration-500"
          style={{ color: isActive ? "#f97316" : "rgba(255,255,255,0.25)" }}
        >
          {state === "idle" && "Hufi anhören"}
          {isActive && "Hufi spricht …"}
          {isDone && "Nochmal anhören"}
        </p>

        {/* Word-by-word reveal — aria-hidden, screen reader uses sr-only status above */}
        {isActive && (
          <div
            className="max-w-[280px] sm:max-w-xs"
            aria-hidden="true"
            style={{ minHeight: "3rem" }}
          >
            <p
              className="text-base leading-relaxed font-medium"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {WORDS.map((word, i) => (
                <span
                  key={i}
                  style={{
                    opacity: i < revealCount ? 1 : 0.12,
                    transition: reducedMotion ? "none" : "opacity 0.3s ease",
                    marginRight: "0.28em",
                  }}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>
        )}

        {/* Done — transcript */}
        {isDone && (
          <div
            className="max-w-xs sm:max-w-sm w-full rounded-2xl px-5 py-4 mb-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
              &ldquo;{GREETING}&rdquo;
            </p>
          </div>
        )}

        {/* Idle blur-teaser */}
        {state === "idle" && !reducedMotion && (
          <p
            className="mt-3 text-sm italic max-w-[260px] leading-relaxed select-none pointer-events-none"
            style={{ color: "rgba(255,255,255,0.18)", filter: "blur(1.8px)" }}
            aria-hidden="true"
          >
            &ldquo;Hallo. Ich bin Hufi …&rdquo;
          </p>
        )}

        {/* Mute toggle */}
        <button
          onClick={handleMuteToggle}
          aria-label={muted ? "Ton einschalten" : "Stummschalten"}
          className="mt-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/25"
          style={{ color: "rgba(255,255,255,0.16)" }}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {muted ? "Ton an" : "Stumm"}
        </button>
      </div>

      <style>{`
        @keyframes hufiOrbRipple {
          0%   { transform: scale(1);   opacity: 0.65; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes hufiOrbBreathe {
          0%, 100% { transform: scale(0.88); opacity: 0.65; }
          50%       { transform: scale(1.12); opacity: 1;    }
        }
        @media (prefers-reduced-motion: reduce) {
          .hufi-ripple,
          .hufi-breathe { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
