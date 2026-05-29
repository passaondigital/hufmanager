import React from "react";
import { MapPin } from "lucide-react";
import { buildGoogleMapsRouteLink } from "@/lib/hufi-route";

interface RouteStop {
  name: string;
  address?: string;
  time?: string;
  clientName?: string;
}

interface DayRouteCardProps {
  stops: RouteStop[];
  estimatedKm?: number;
  onDismiss: () => void;
}

export function DayRouteCard({ stops, estimatedKm, onDismiss }: DayRouteCardProps) {
  const handleOpenMaps = () => {
    const addresses = stops.map((s) => s.address).filter((a): a is string => Boolean(a));
    const url = buildGoogleMapsRouteLink(addresses);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        padding: "16px",
        marginBottom: "12px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <MapPin size={18} color="#F97316" />
        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1A1A1A" }}>
          Deine Route heute
        </span>
        {estimatedKm !== undefined && (
          <span style={{ fontSize: "12px", color: "#9CA3AF", marginLeft: "auto" }}>
            ca. {estimatedKm} km
          </span>
        )}
      </div>

      {/* Stops list */}
      <ol style={{ margin: "0 0 14px 0", padding: "0", listStyle: "none" }}>
        {stops.map((stop, index) => (
          <li
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "8px 0",
              borderBottom: index < stops.length - 1 ? "1px solid #F3F4F6" : "none",
            }}
          >
            {/* Number badge */}
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#FFF7ED",
                border: "1.5px solid #F97316",
                color: "#F97316",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              {index + 1}
            </span>

            {/* Stop details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1A1A1A" }}>
                  {stop.name}
                </span>
                {stop.time && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#FFFFFF",
                      background: "#F97316",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      fontWeight: "600",
                    }}
                  >
                    {stop.time}
                  </span>
                )}
              </div>
              {stop.clientName && (
                <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0 0" }}>
                  {stop.clientName}
                </p>
              )}
              {stop.address && (
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "1px 0 0 0" }}>
                  {stop.address}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={handleOpenMaps}
          style={{
            background: "#F97316",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          In Google Maps öffnen
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            color: "#6B7280",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

export default DayRouteCard;
