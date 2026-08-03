import { User, MapPin, CalendarClock } from "lucide-react";
import type { MockHorseOption } from "./HufiAssistantState";

interface HufiHorseRecordPreviewProps {
  horse: MockHorseOption;
}

// Mock-Pferdeakte, die nach einer eindeutigen Auswahl im
// Mehrdeutigkeits-Szenario erscheint — bestätigt sichtbar, welches Pferd
// gewählt wurde, bevor der Erfolgstext kommt.
export function HufiHorseRecordPreview({ horse }: HufiHorseRecordPreviewProps) {
  return (
    <div className="hlab-card" style={{ gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#F5EFE6", letterSpacing: "-0.01em" }}>{horse.name}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <User size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>{horse.owner}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <MapPin size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>{horse.place}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <CalendarClock size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>Letzter Termin {horse.lastAppointment}</span>
        </div>
      </div>
    </div>
  );
}
