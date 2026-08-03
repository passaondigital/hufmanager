import { CalendarClock, ChevronRight, Receipt, Users2, Sparkles } from "lucide-react";

export type CockpitState = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

export interface CockpitNextAppointment {
  horseName: string | null;
  clientName?: string | null;
  dateLabel: string | null;
  time?: string | null;
  isToday: boolean;
  minutesAway?: number | null;
}

interface HufiAssistantCockpitProps {
  state: CockpitState;
  userName?: string | null;
  nextAppointment?: CockpitNextAppointment | null;
  todayAppointments: number;
  unpaidInvoices: number;
  openLeads: number;
  canPrepareDay: boolean;
  onPrepareDay: () => void;
  onNavigate: (route: string) => void;
}

const STATE_LABEL: Record<Exclude<CockpitState, "idle">, string> = {
  recording: "Hufi hört zu",
  transcribing: "Hufi verarbeitet",
  thinking: "Hufi denkt nach",
  speaking: "Hufi antwortet",
};

function timeSalutation(): string {
  const h = new Date().getHours();
  return h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

export function HufiAssistantCockpit({
  state,
  userName,
  nextAppointment,
  todayAppointments,
  unpaidInvoices,
  openLeads,
  canPrepareDay,
  onPrepareDay,
  onNavigate,
}: HufiAssistantCockpitProps) {
  const firstName = userName?.trim() ? userName.trim().split(" ")[0] : null;
  const greeting = firstName ? `${timeSalutation()}, ${firstName}.` : `${timeSalutation()}.`;
  const prefersReducedMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Einzige, wichtigste Beobachtung -- Priorität: baldiger Termin > offene
  // Rechnungen > neue Anfragen > ruhiger Tag. Bewusst nur EIN Satz, kein
  // Aufzählen von allem gleichzeitig. insightSource merkt sich, welche Zahl
  // schon im Satz steckt, damit dieselbe Zahl nicht zusätzlich als Chip
  // unten wiederholt wird (keine Informationsdopplung).
  const insightSource: "appointment" | "invoices" | "leads" | "today" | "none" = (() => {
    const mins = nextAppointment?.minutesAway;
    if (nextAppointment?.isToday && typeof mins === "number" && mins >= 0 && mins <= 180) return "appointment";
    if (unpaidInvoices > 0) return "invoices";
    if (openLeads > 0) return "leads";
    if (todayAppointments > 0) return "today";
    return "none";
  })();

  const insight = (() => {
    switch (insightSource) {
      case "appointment": {
        const mins = nextAppointment!.minutesAway!;
        const when = mins < 1 ? "gleich" : mins < 60 ? `in ${mins} Min.` : `in ${Math.round(mins / 60)} Std.`;
        return `Dein nächster Termin beginnt ${when}.`;
      }
      case "invoices":
        return `${unpaidInvoices} ${unpaidInvoices === 1 ? "Rechnung braucht" : "Rechnungen brauchen"} Aufmerksamkeit.`;
      case "leads":
        return `${openLeads} neue ${openLeads === 1 ? "Anfrage wartet" : "Anfragen warten"} auf dich.`;
      case "today":
        return `${todayAppointments} ${todayAppointments === 1 ? "Termin" : "Termine"} heute.`;
      default:
        return "Ruhiger Tag — nichts Dringendes offen.";
    }
  })();

  const steps = (
    [
      canPrepareDay && { label: "Tag vorbereiten", Icon: Sparkles, onClick: onPrepareDay },
      unpaidInvoices > 0 && insightSource !== "invoices" && {
        label: `${unpaidInvoices} Rechnung${unpaidInvoices === 1 ? "" : "en"}`,
        Icon: Receipt,
        onClick: () => onNavigate("/rechnungen"),
      },
      openLeads > 0 && insightSource !== "leads" && {
        label: `${openLeads} Anfrage${openLeads === 1 ? "" : "n"}`,
        Icon: Users2,
        onClick: () => onNavigate("/anfragen"),
      },
    ] as const
  ).filter((s): s is Exclude<typeof s, false> => !!s).slice(0, 3);

  return (
    <section style={{ padding: "16px 16px 10px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Kopf: Begrüßung + eine Beobachtung im Ruhezustand, sonst die aktive Presence-Zeile */}
      <div>
        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "#F97316", textTransform: "uppercase" }}>
          Hufi
        </p>
        {state === "idle" ? (
          <>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.03em", color: "#171717", fontWeight: 800 }}>
              {greeting}
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "#6B7280" }}>
              {insight}
            </p>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F97316", animation: prefersReducedMotion ? "none" : "pulse-rec 1s ease-out infinite", flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#171717", fontWeight: 800 }}>
              {STATE_LABEL[state]}
            </h1>
          </div>
        )}
      </div>

      {/* Nächster Termin -- die wichtigste Information als einzelner Block */}
      <button
        onClick={() => onNavigate("/kalender")}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          padding: 16, borderRadius: 18,
          border: "1px solid rgba(23,23,23,0.08)",
          background: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(23,23,23,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", textTransform: "uppercase" }}>
              <CalendarClock size={12} />
              Nächster Termin
            </div>
            {nextAppointment?.horseName ? (
              <>
                <div style={{ marginTop: 8, fontSize: 19, fontWeight: 750, color: "#171717", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nextAppointment.horseName}
                </div>
                <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
                  {nextAppointment.dateLabel}
                  {nextAppointment.time ? `, ${nextAppointment.time.slice(0, 5)} Uhr` : ""}
                  {nextAppointment.clientName ? ` · ${nextAppointment.clientName}` : ""}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "#9CA3AF" }}>
                Noch kein Termin geplant
              </div>
            )}
          </div>
          {nextAppointment?.isToday && (
            <span style={{
              background: "#F97316", color: "#FFFFFF", borderRadius: 20,
              padding: "3px 9px", fontSize: 10, fontWeight: 700,
              letterSpacing: ".05em", textTransform: "uppercase" as const, flexShrink: 0,
            }}>
              Heute
            </span>
          )}
        </div>
      </button>

      {/* Tageskontext -- ein kompakter, rein informativer Streifen statt drei gleich großer Kacheln */}
      <div style={{
        display: "flex", alignItems: "stretch",
        borderRadius: 16, border: "1px solid rgba(23,23,23,0.06)", background: "#FAFAFA",
        overflow: "hidden",
      }}>
        {[
          { label: "Termine heute", value: todayAppointments },
          { label: "Offene Rechnungen", value: unpaidInvoices },
          { label: "Anfragen", value: openLeads },
        ].map((item, i) => (
          <div
            key={item.label}
            style={{
              flex: 1, padding: "12px 10px", textAlign: "center",
              borderLeft: i > 0 ? "1px solid rgba(23,23,23,0.06)" : "none",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 750, color: "#171717" }}>{item.value}</div>
            <div style={{ marginTop: 2, fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Nächste Schritte -- höchstens drei kompakte Chips, keine langen Standardbuttons */}
      {steps.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {steps.map(({ label, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 13px", borderRadius: 20,
                border: "1px solid rgba(249,115,22,0.22)",
                background: "rgba(249,115,22,0.06)",
                color: "#C2410C", fontSize: 12.5, fontWeight: 650,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Icon size={13} />
              {label}
              <ChevronRight size={12} style={{ opacity: 0.6 }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
