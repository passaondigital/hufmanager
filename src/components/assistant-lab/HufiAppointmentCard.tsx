import { useState } from "react";
import { CalendarClock, MapPin, StickyNote, ListTodo, Navigation, AlertTriangle, Clock3 } from "lucide-react";
import type { MockAppointmentDetail } from "./HufiAssistantState";
import { requiresConfirmation, type HufiActionId } from "./HufiActionPolicy";

interface HufiAppointmentCardProps {
  data: MockAppointmentDetail;
}

const SECONDARY_ACTIONS: { id: HufiActionId; label: string; feedback: string }[] = [
  { id: "appointment.showRoute", label: "Route anzeigen", feedback: "Route berechnet (Vorschau)." },
  { id: "appointment.contactCustomer", label: "Kundin kontaktieren", feedback: "Kontaktoptionen für Familie Brandt geöffnet (Vorschau)." },
  { id: "appointment.openHorseRecord", label: "Pferdeakte öffnen", feedback: "Pferdeakte von Ginebra geöffnet (Vorschau)." },
];

export function HufiAppointmentCard({ data }: HufiAppointmentCardProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleSecondaryAction = (id: HufiActionId) => {
    // requiresConfirmation() dokumentiert hier bewusst, dass diese drei
    // Aktionen reine Informationsanzeigen sind — Klick zeigt direkt eine
    // kurze Mock-Rückmeldung statt einer Bestätigungsfrage.
    void requiresConfirmation(id);
    setActiveAction(id);
    window.setTimeout(() => setActiveAction((current) => (current === id ? null : current)), 2200);
  };

  return (
    <div className="hlab-card" style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#F5EFE6" }}>{data.horse}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--hufi-orange)" }}>
          <CalendarClock size={13} aria-hidden="true" />
          {data.time}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,239,230,0.55)" }}>{data.customer}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <MapPin size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>{data.address}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <StickyNote size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>{data.lastNote}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <ListTodo size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>{data.openTask}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Navigation size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,239,230,0.75)" }}>
            {data.routeNote} · Abfahrt spätestens {data.departureTime}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Clock3 size={13} style={{ marginTop: 2, color: "rgba(245,239,230,0.4)", flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "rgba(245,239,230,0.45)" }}>Zuletzt bearbeitet: {data.lastEditedAt}</span>
        </div>
        {data.specialNote && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={13} style={{ marginTop: 2, color: "var(--hufi-orange)", flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#F5EFE6", fontWeight: 600 }}>{data.specialNote}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 9 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SECONDARY_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleSecondaryAction(action.id)}
              className="hufi-btn-ghost hlab-focusable"
              style={{ minHeight: 40, padding: "8px 14px", fontSize: 12 }}
            >
              {action.label}
            </button>
          ))}
        </div>
        {activeAction && (
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,239,230,0.55)" }} aria-live="polite">
            {SECONDARY_ACTIONS.find((a) => a.id === activeAction)?.feedback}
          </p>
        )}
      </div>
    </div>
  );
}
