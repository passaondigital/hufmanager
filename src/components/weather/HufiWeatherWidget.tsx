import { useState, useEffect } from "react";
import { fetchWeatherContext } from "@/lib/hufai-proactive";
import type { WeatherContext } from "@/lib/hufai-proactive";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HufiWeatherWidgetProps {
  compact?: boolean;
}

// ── WMO Code → Emoji ──────────────────────────────────────────────────────────

function wmoToIcon(code: number): string {
  if (code === 0)                       return "☀️";
  if (code >= 1 && code <= 3)           return "⛅";
  if (code >= 45 && code <= 48)         return "🌫️";
  if (code >= 51 && code <= 57)         return "🌦️";
  if (code >= 61 && code <= 67)         return "🌧️";
  if (code >= 71 && code <= 77)         return "❄️";
  if (code >= 80 && code <= 82)         return "🌦️";
  if (code >= 95 && code <= 99)         return "⛈️";
  return "🌡️";
}

// ── WMO Code → Label ──────────────────────────────────────────────────────────

function wmoToLabel(code: number): string {
  if (code === 0)                       return "Klar";
  if (code >= 1 && code <= 3)           return "Bewölkt";
  if (code >= 45 && code <= 48)         return "Nebel";
  if (code >= 51 && code <= 57)         return "Nieselregen";
  if (code >= 61 && code <= 67)         return "Regen";
  if (code >= 71 && code <= 77)         return "Schnee";
  if (code >= 80 && code <= 82)         return "Schauer";
  if (code >= 95 && code <= 99)         return "Gewitter";
  return "Unbekannt";
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <>
      <style>{`
        @keyframes hufi-spin { to { transform: rotate(360deg); } }
      `}</style>
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          border: "2px solid #e5e7eb",
          borderTop: "2px solid #f97316",
          borderRadius: "50%",
          animation: "hufi-spin 0.7s linear infinite",
          verticalAlign: "middle",
        }}
      />
    </>
  );
}

// ── Compact View ──────────────────────────────────────────────────────────────

function CompactView({ data }: { data: WeatherContext }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 14,
        fontWeight: 600,
        color: "#374151",
      }}
    >
      <span style={{ fontSize: 18 }}>{wmoToIcon(data.todayCode)}</span>
      <span>{Math.round(data.tempMax)}°C</span>
    </span>
  );
}

// ── Full Card View ────────────────────────────────────────────────────────────

function FullView({ data }: { data: WeatherContext }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
        border: "1px solid #f3f4f6",
        minWidth: 200,
      }}
    >
      {/* Heute */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Heute
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 32 }}>{wmoToIcon(data.todayCode)}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
                {Math.round(data.tempMax)}°C
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {wmoToLabel(data.todayCode)}
              </div>
            </div>
          </div>
        </div>
        {data.todayPrecipMm > 0 && (
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Niederschlag</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6" }}>
              {data.todayPrecipMm.toFixed(1)} mm
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#f3f4f6", margin: "0 -4px 12px" }} />

      {/* Morgen */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Morgen
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 20 }}>{wmoToIcon(data.tomorrowCode)}</span>
            <div style={{ fontSize: 14, color: "#374151" }}>
              {wmoToLabel(data.tomorrowCode)}
            </div>
          </div>
        </div>
        {data.tomorrowPrecipMm > 0 && (
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Niederschlag</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6" }}>
              {data.tomorrowPrecipMm.toFixed(1)} mm
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────

export function HufiWeatherWidget({ compact = false }: HufiWeatherWidgetProps) {
  const [data, setData] = useState<WeatherContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWeatherContext().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (!data) {
    return null;
  }

  if (compact) {
    return <CompactView data={data} />;
  }

  return <FullView data={data} />;
}
