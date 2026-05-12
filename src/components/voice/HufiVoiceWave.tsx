import type { CSSProperties } from "react";

interface HufiVoiceWaveProps {
  color?: string;
  barCount?: number;
  height?: number;
  style?: CSSProperties;
}

const DELAYS = [0, 0.1, 0.2, 0.1, 0.05, 0.15, 0.08];

export function HufiVoiceWave({
  color = "#F97316",
  barCount = 5,
  height = 16,
  style,
}: HufiVoiceWaveProps) {
  return (
    <>
      <style>{`
        @keyframes hufi-wavebar {
          0%   { transform: scaleY(0.2); }
          100% { transform: scaleY(1);   }
        }
        .hufi-wave-bar {
          animation: hufi-wavebar 0.6s ease-in-out infinite alternate;
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          height,
          flexShrink: 0,
          ...style,
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="hufi-wave-bar"
            style={{
              width: 3,
              height: "100%",
              borderRadius: 2,
              background: color,
              transformOrigin: "bottom",
              animationDelay: `${DELAYS[i % DELAYS.length]}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
