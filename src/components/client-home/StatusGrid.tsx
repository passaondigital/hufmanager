interface StatusGridProps {
  horsesCount: number;
  horsesWithIssues: number;
  openOrders: number;
  totalAppointments: number;
  healthOk: boolean;
  healthIssues: number;
}

export function StatusGrid({
  horsesCount,
  horsesWithIssues,
  openOrders,
  totalAppointments,
  healthOk,
  healthIssues,
}: StatusGridProps) {
  const cards = [
    {
      icon: "🐴",
      label: "Meine Pferde",
      value: String(horsesCount),
      subtitle: horsesWithIssues > 0 ? `${horsesWithIssues} mit Befund` : "Alle gesund",
      highlight: true,
    },
    {
      icon: "📋",
      label: "Offene Aufträge",
      value: String(openOrders),
      subtitle: openOrders === 0 ? "Keine offenen" : `${openOrders} offen`,
      highlight: false,
    },
    {
      icon: "✅",
      label: "Bearbeitungen",
      value: String(totalAppointments),
      subtitle: `Gesamt seit ${new Date().getFullYear()}`,
      highlight: false,
    },
    {
      icon: "❤️",
      label: "Gesundheit",
      value: "●",
      valueColor: healthOk ? "var(--hm-green)" : healthIssues > 0 ? "var(--hm-yellow)" : "var(--hm-green)",
      subtitle: healthOk ? "Alles stabil" : `${healthIssues} Befunde`,
      highlight: false,
    },
  ];

  return (
    <div className="px-4 md:px-0">
      <div className="hm-section-header">
        <span className="hm-section-title">📊 Überblick</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg p-3.5 md:p-4 transition-all hover:-translate-y-px"
            style={{
              background: card.highlight
                ? "linear-gradient(135deg, rgba(245,151,10,0.08), rgba(245,151,10,0.02))"
                : "var(--hm-bg3)",
              border: card.highlight
                ? "0.5px solid rgba(245,151,10,0.2)"
                : "0.5px solid var(--hm-border)",
            }}
          >
            <span className="text-[20px] md:text-[24px] block mb-1">{card.icon}</span>
            <p className="text-[11px] md:text-[12px]" style={{ color: "var(--hm-text3)" }}>{card.label}</p>
            <p
              className="text-[18px] md:text-[22px] font-semibold mt-0.5"
              style={{ color: card.valueColor || "var(--hm-text)" }}
            >
              {card.value}
            </p>
            <p className="text-[11px] md:text-[12px] mt-1" style={{ color: "var(--hm-text3)" }}>
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}