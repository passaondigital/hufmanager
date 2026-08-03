import { User, MapPin, CalendarClock } from "lucide-react";

interface HufiHorseCardProps {
  name: string;
  owner: string;
  place: string;
  lastAppointment: string;
  onSelect: () => void;
}

export function HufiHorseCard({ name, owner, place, lastAppointment, onSelect }: HufiHorseCardProps) {
  return (
    <button type="button" onClick={onSelect} className="hlab-card hlab-focusable" style={{ textAlign: "left", cursor: "pointer", flexDirection: "row", alignItems: "center", gap: 12 }}>
      {/* Neutrales Platzhalterbild statt Foto — Prototyp zeigt keine echten Pferdebilder. */}
      <span aria-hidden="true" className="hlab-horse-avatar">
        {name.charAt(0)}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#F5EFE6", letterSpacing: "-0.01em" }}>{name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "rgba(245,239,230,0.5)" }}>
          <User size={11} aria-hidden="true" />
          {owner}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "rgba(245,239,230,0.5)" }}>
          <MapPin size={11} aria-hidden="true" />
          {place}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "rgba(245,239,230,0.5)" }}>
          <CalendarClock size={11} aria-hidden="true" />
          Letzter Termin {lastAppointment}
        </span>
      </span>
    </button>
  );
}
