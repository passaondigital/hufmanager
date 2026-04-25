import type { HufiSearchResult } from "@/lib/hufi-search";

interface Props {
  result: HufiSearchResult;
}

const BADGE: Record<HufiSearchResult["type"], { bg: string; color: string; label: string }> = {
  internal:   { bg: "rgba(16,185,129,0.1)",  color: "#10B981", label: "Hufi-Community" },
  web:        { bg: "rgba(59,130,246,0.1)",   color: "#3B82F6", label: "Web" },
  shop:       { bg: "rgba(249,115,22,0.1)",   color: "#F97316", label: "Online kaufen" },
  hersteller: { bg: "rgba(139,92,246,0.1)",   color: "#8B5CF6", label: "Hersteller" },
};

export function HufiSearchCard({ result }: Props) {
  const badge = BADGE[result.type];

  function handleContact() {
    if (!result.contact) return;
    if (result.contact.includes("http") || result.contact.includes(".")) {
      window.open(result.url ?? `https://${result.contact}`, "_blank", "noopener");
    } else if (result.contact.match(/^[\d\s+\-()]+$/)) {
      window.location.href = `tel:${result.contact.replace(/\s/g, "")}`;
    }
  }

  function handleRoute() {
    if (result.location) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(result.location)}`, "_blank", "noopener");
    }
  }

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 12,
      padding: "11px 13px",
      border: "1px solid #F0F0F0",
      marginTop: 6,
    }}>
      {/* Type badge */}
      <span style={{
        display: "inline-block",
        background: badge.bg,
        color: badge.color,
        borderRadius: 6,
        padding: "2px 7px",
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 5,
      }}>
        {badge.label}
      </span>

      {/* Name + rating */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{result.name}</span>
        {result.rating !== undefined && (
          <span style={{ fontSize: 11, color: "#F97316" }}>★ {result.rating.toFixed(1)}</span>
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 5, lineHeight: 1.4 }}>
        {result.description}
      </div>

      {/* Location + distance */}
      {(result.location || result.distance !== undefined) && (
        <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 7 }}>
          📍 {[result.location, result.distance !== undefined ? `${result.distance} km` : null]
            .filter(Boolean).join(" · ")}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {result.contact && (
          <button
            onClick={handleContact}
            style={{
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 8, padding: "5px 10px",
              color: "#F97316", fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Kontaktieren
          </button>
        )}
        {result.distance !== undefined && (
          <button
            onClick={handleRoute}
            style={{
              background: "#F3F4F6", border: "none", borderRadius: 8,
              padding: "5px 10px", color: "#6B7280", fontSize: 11,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🗺️ Route
          </button>
        )}
        {result.url && (
          <button
            onClick={() => window.open(result.url, "_blank", "noopener")}
            style={{
              background: "#F3F4F6", border: "none", borderRadius: 8,
              padding: "5px 10px", color: "#6B7280", fontSize: 11,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🔗 Info
          </button>
        )}
      </div>
    </div>
  );
}
