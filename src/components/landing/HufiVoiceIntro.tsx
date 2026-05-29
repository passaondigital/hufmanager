import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw, Play } from "lucide-react";
import { useHufiTTS } from "@/hooks/useHufiTTS";

type VoiceState = "idle" | "speaking" | "done" | "unsupported";

const GREETING =
  "Hallo. Ich bin Hufi. Ich helfe dir, dein Pferd besser zu verstehen — weniger Chaos, mehr Zeit fürs Pferd.";

/* Wave bars — heights define the visual rhythm */
const BAR_HEIGHTS = [4, 9, 14, 20, 26, 20, 14, 9, 4, 9, 16, 24, 16, 9, 4];

function WaveBars({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-center gap-[3px]"
      aria-hidden="true"
      style={{ height: 32 }}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: 3,
            height: active ? h : 3,
            borderRadius: 99,
            backgroundColor: "#f97316",
            opacity: active ? 0.7 + (i % 5) * 0.06 : 0.3,
            transition: active
              ? `height 0.15s ease ${i * 40}ms, opacity 0.3s ease`
              : "height 0.4s ease, opacity 0.3s ease",
            animation: active
              ? `hufiWave ${0.55 + (i % 5) * 0.12}s ease-in-out ${i * 35}ms infinite alternate`
              : "none",
          }}
        />
      ))}

      <style>{`
        @keyframes hufiWave {
          from { transform: scaleY(0.55); }
          to   { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}

export default function HufiVoiceIntro() {
  const { speak, cancel, isSupported } = useHufiTTS();
  const [state, setState] = useState<VoiceState>(isSupported ? "idle" : "unsupported");
  const [muted, setMuted] = useState(false);
  const hasSpokenRef = useRef(false);

  const startGreeting = useCallback(() => {
    if (!isSupported || muted) return;
    cancel();
    setState("speaking");
    hasSpokenRef.current = true;
    // onEnd callback is the authoritative source — no race condition
    speak(GREETING, () => setState("done"));
  }, [isSupported, muted, cancel, speak]);

  const handleMuteToggle = useCallback(() => {
    if (!muted) {
      cancel();
      setState(hasSpokenRef.current ? "done" : "idle");
    }
    setMuted((m) => !m);
  }, [muted, cancel]);

  const handleReplay = useCallback(() => {
    if (muted) {
      // even muted: show speaking UI briefly as visual feedback
      setState("speaking");
      setTimeout(() => setState("done"), 400);
      return;
    }
    cancel();
    setState("speaking");
    speak(GREETING, () => setState("done"));
  }, [muted, cancel, speak]);

  /* Cleanup on unmount */
  useEffect(() => () => cancel(), [cancel]);

  if (state === "unsupported") return null;

  const isActive = state === "speaking";

  return (
    <div
      className="inline-flex flex-col gap-3"
      role="region"
      aria-label="Hufi Sprachvorstellung"
      aria-live="polite"
    >
      {/* Main pill — idle or speaking */}
      {(state === "idle" || state === "speaking") && (
        <button
          onClick={state === "idle" ? startGreeting : undefined}
          disabled={state === "speaking"}
          aria-label={state === "idle" ? "Hufi vorstellen — Anhören" : "Hufi spricht…"}
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
          style={{
            backgroundColor: isActive
              ? "rgba(249,115,22,0.10)"
              : "rgba(255,255,255,0.04)",
            borderColor: isActive
              ? "rgba(249,115,22,0.35)"
              : "rgba(255,255,255,0.10)",
          }}
        >
          {/* Orb */}
          <span
            className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: isActive
                ? "#f97316"
                : "rgba(249,115,22,0.15)",
              boxShadow: isActive
                ? "0 0 0 6px rgba(249,115,22,0.12), 0 0 0 12px rgba(249,115,22,0.05)"
                : "none",
            }}
          >
            {isActive ? (
              <Volume2 className="w-4 h-4 text-white" strokeWidth={2} />
            ) : (
              <Play className="w-4 h-4 translate-x-0.5" style={{ color: "#f97316" }} strokeWidth={2.5} />
            )}
          </span>

          {/* Text + wave */}
          <span className="flex flex-col items-start gap-1 min-w-0">
            <span
              className="text-xs font-semibold leading-none tracking-wide"
              style={{ color: isActive ? "#f97316" : "rgba(255,255,255,0.5)" }}
            >
              {isActive ? "Hufi spricht …" : "Hufi vorstellen"}
            </span>
            {isActive ? (
              <WaveBars active={true} />
            ) : (
              <WaveBars active={false} />
            )}
          </span>

          {/* Mute toggle */}
          <span
            role="button"
            tabIndex={0}
            aria-label={muted ? "Ton einschalten" : "Stummschalten"}
            onClick={(e) => { e.stopPropagation(); handleMuteToggle(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMuteToggle(); } }}
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </span>
        </button>
      )}

      {/* Done state — compact with replay */}
      {state === "done" && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* Mini orb */}
          <span
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(249,115,22,0.12)" }}
          >
            <Volume2 className="w-3.5 h-3.5" style={{ color: "#f97316" }} />
          </span>

          <span className="flex-1 min-w-0">
            <span
              className="block text-xs font-medium leading-snug"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              &ldquo;{GREETING.slice(0, 42)}&hellip;&rdquo;
            </span>
          </span>

          {/* Replay */}
          <button
            onClick={handleReplay}
            aria-label="Vorstellung wiederholen"
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all hover:border-orange-500/40 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
            style={{
              color: "rgba(255,255,255,0.3)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <RotateCcw className="w-3 h-3" />
            Nochmal
          </button>

          {/* Mute toggle */}
          <button
            onClick={handleMuteToggle}
            aria-label={muted ? "Ton einschalten" : "Stummschalten"}
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
