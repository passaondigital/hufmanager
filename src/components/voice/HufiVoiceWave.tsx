import type { CSSProperties } from "react";

interface HufiVoiceWaveProps {
  color?: string;
  barCount?: number;
  height?: number;
  style?: CSSProperties;
  variant?: "wave" | "pulse" | "dots";
  paused?: boolean; // Idle-Modus: sehr langsame, stille Animation
}

const BASE_HEIGHTS = [0.3, 0.7, 1, 0.85, 0.5, 0.9, 0.4];
const BASE_DELAYS  = [0, 0.08, 0.16, 0.08, 0.04, 0.12, 0.06];

export function HufiVoiceWave({
  color = "#F97316",
  barCount = 5,
  height = 16,
  style,
  variant = "wave",
  paused = false,
}: HufiVoiceWaveProps) {
  if (variant === "dots") {
    return (
      <>
        <style>{`
          @keyframes hfw-dot { 0%, 100% { opacity: 0.3; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
          .hfw-dot-1 { animation: hfw-dot 1s 0s ease-in-out infinite; }
          .hfw-dot-2 { animation: hfw-dot 1s 0.25s ease-in-out infinite; }
          .hfw-dot-3 { animation: hfw-dot 1s 0.5s ease-in-out infinite; }
        `}</style>
        <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: Math.round(height * 0.35), ...style }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`hfw-dot-${i}`}
              style={{ width: Math.round(height * 0.45), height: Math.round(height * 0.45), borderRadius: "50%", background: color, flexShrink: 0 }}
            />
          ))}
        </div>
      </>
    );
  }

  if (variant === "pulse") {
    return (
      <>
        <style>{`
          @keyframes hfw-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 1; } }
          .hfw-pulse { animation: hfw-pulse 1.2s ease-in-out infinite; }
        `}</style>
        <div aria-hidden="true" className="hfw-pulse" style={{ width: height, height, borderRadius: "50%", background: color, flexShrink: 0, ...style }} />
      </>
    );
  }

  // Default: wave bars (premium version)
  return (
    <>
      <style>{`
        @keyframes hfw-bar {
          0%   { transform: scaleY(0.18); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.18); }
        }
        .hfw-bar { animation: hfw-bar 0.9s ease-in-out infinite alternate; transform-origin: center; }
      `}</style>
      <div
        aria-hidden="true"
        style={{ display: "flex", alignItems: "center", gap: Math.round(height * 0.18), height, flexShrink: 0, ...style }}
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="hfw-bar"
            style={{
              width: Math.max(2, Math.round(height * 0.22)),
              height: `${Math.round(BASE_HEIGHTS[i % BASE_HEIGHTS.length] * 100)}%`,
              borderRadius: 99,
              background: color,
              opacity: paused ? 0.25 : 1,
              transformOrigin: "center",
              animationDelay: `${BASE_DELAYS[i % BASE_DELAYS.length]}s`,
              animationDuration: paused
                ? `${3.5 + (i % 3) * 0.8}s`
                : `${0.75 + (i % 3) * 0.15}s`,
              transition: "opacity 0.4s, animation-duration 0.4s",
            }}
          />
        ))}
      </div>
    </>
  );
}
