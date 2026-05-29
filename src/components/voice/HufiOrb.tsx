import { Mic, Loader2 } from "lucide-react";
import { Send } from "lucide-react";

type OrbState = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

interface HufiOrbProps {
  state: OrbState;
  onPress: () => void;
  onSend?: () => void;
  hasText?: boolean;
  disabled?: boolean;
  size?: number;
}

const ORB_DELAYS = [0, 0.12, 0.24, 0.12, 0.08, 0.18, 0.06];
const ORB_HEIGHTS = [0.25, 0.6, 1, 0.75, 0.4, 0.85, 0.5];

const STATE_COLORS: Record<OrbState, { bg: string; glow: string; ring: string }> = {
  idle:         { bg: "#F97316", glow: "rgba(249,115,22,0.35)", ring: "rgba(249,115,22,0.15)" },
  recording:    { bg: "#EF4444", glow: "rgba(239,68,68,0.45)",  ring: "rgba(239,68,68,0.2)" },
  transcribing: { bg: "#6B7280", glow: "rgba(107,114,128,0.3)", ring: "rgba(107,114,128,0.1)" },
  thinking:     { bg: "#F59E0B", glow: "rgba(245,158,11,0.4)",  ring: "rgba(245,158,11,0.15)" },
  speaking:     { bg: "#8B5CF6", glow: "rgba(139,92,246,0.4)",  ring: "rgba(139,92,246,0.15)" },
};

export function HufiOrb({
  state,
  onPress,
  onSend,
  hasText = false,
  disabled = false,
  size = 64,
}: HufiOrbProps) {
  const colors = STATE_COLORS[state];
  const barCount = 7;
  const isActive = state === "recording" || state === "speaking";

  // When there's text → show send button instead
  if (hasText && onSend) {
    return (
      <button
        onClick={onSend}
        aria-label="Senden"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #F97316, #ea6c0a)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          boxShadow: "0 6px 24px rgba(249,115,22,0.4), 0 2px 8px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          fontFamily: "inherit",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
        onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <Send size={Math.round(size * 0.35)} color="#FFFFFF" />
      </button>
    );
  }

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      aria-label={
        state === "recording" ? "Aufnahme stoppen" :
        state === "transcribing" ? "Verarbeite…" :
        "Mit Hufi sprechen"
      }
      style={{ position: "relative", width: size, height: size, flexShrink: 0, background: "transparent", border: "none", cursor: disabled ? "wait" : "pointer", padding: 0 }}
    >
      <style>{`
        @keyframes hufi-orb-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2);   opacity: 0; }
        }
        @keyframes hufi-orb-ring-slow {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes hufi-rec-anim {
          0%   { box-shadow: 0 0 0 0   ${colors.glow}; }
          70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0); }
        }
        @keyframes hufi-orb-wave {
          0%   { transform: scaleY(0.18); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.18); }
        }
        @keyframes hufi-orb-think-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.7); }
          50%       { opacity: 1;   transform: scale(1); }
        }
        @keyframes hufi-orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .orb-ring-1 { animation: hufi-orb-ring 1.6s ease-out infinite; }
        .orb-ring-2 { animation: hufi-orb-ring-slow 1.6s 0.5s ease-out infinite; }
        .orb-wave-bar { animation: hufi-orb-wave 0.85s ease-in-out infinite alternate; transform-origin: center; }
        .orb-think-dot-1 { animation: hufi-orb-think-dot 1s 0s ease-in-out infinite; }
        .orb-think-dot-2 { animation: hufi-orb-think-dot 1s 0.3s ease-in-out infinite; }
        .orb-think-dot-3 { animation: hufi-orb-think-dot 1s 0.6s ease-in-out infinite; }
        .orb-spin { animation: hufi-orb-spin 1.3s linear infinite; }
      `}</style>

      {/* Ambient pulse rings — only when active */}
      {isActive && (
        <>
          <span
            className="orb-ring-1"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${colors.ring}`,
              pointerEvents: "none",
            }}
          />
          <span
            className="orb-ring-2"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1px solid ${colors.ring}`,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Idle soft ring */}
      {state === "idle" && (
        <span
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "1px solid rgba(249,115,22,0.15)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main orb body */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            state === "idle"
              ? "linear-gradient(145deg, #F97316 0%, #ea6c0a 60%, #dc5c08 100%)"
              : state === "recording"
                ? "linear-gradient(145deg, #EF4444 0%, #dc2626 100%)"
                : state === "transcribing"
                  ? "linear-gradient(145deg, #6B7280 0%, #4B5563 100%)"
                  : state === "thinking"
                    ? "linear-gradient(145deg, #F59E0B 0%, #d97706 100%)"
                    : "linear-gradient(145deg, #8B5CF6 0%, #7c3aed 100%)",
          boxShadow: [
            `0 8px 32px ${colors.glow}`,
            `0 3px 12px ${colors.ring}`,
            "inset 0 1px 0 rgba(255,255,255,0.2)",
            "inset 0 -1px 0 rgba(0,0,0,0.15)",
          ].join(", "),
          transition: "background 0.4s ease, box-shadow 0.4s ease",
          animation: state === "recording" ? "hufi-rec-anim 1.2s ease-out infinite" : "none",
        }}
      />

      {/* Center icon / state */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state === "idle" && (
          <Mic size={Math.round(size * 0.37)} color="#FFFFFF" strokeWidth={2} />
        )}

        {state === "recording" && (
          <span style={{ display: "flex", alignItems: "center", gap: 2.5, height: Math.round(size * 0.38) }}>
            {Array.from({ length: barCount }).map((_, i) => (
              <span
                key={i}
                className="orb-wave-bar"
                style={{
                  width: Math.round(size * 0.042),
                  height: `${Math.round(ORB_HEIGHTS[i % ORB_HEIGHTS.length] * 100)}%`,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.9)",
                  animationDelay: `${ORB_DELAYS[i % ORB_DELAYS.length]}s`,
                }}
              />
            ))}
          </span>
        )}

        {state === "transcribing" && (
          <span className="orb-spin" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={Math.round(size * 0.38)} color="rgba(255,255,255,0.85)" strokeWidth={2.5} />
          </span>
        )}

        {state === "thinking" && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`orb-think-dot-${i + 1}`}
                style={{
                  width: Math.round(size * 0.09),
                  height: Math.round(size * 0.09),
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                }}
              />
            ))}
          </span>
        )}

        {state === "speaking" && (
          <span style={{ display: "flex", alignItems: "center", gap: 2.5, height: Math.round(size * 0.38) }}>
            {[0.5, 0.8, 1, 0.9, 0.6, 0.85, 0.45].map((h, i) => (
              <span
                key={i}
                className="orb-wave-bar"
                style={{
                  width: Math.round(size * 0.042),
                  height: `${Math.round(h * 100)}%`,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.85)",
                  animationDelay: `${i * 0.09}s`,
                  animationDuration: `${0.7 + (i % 3) * 0.15}s`,
                }}
              />
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
