import { Warehouse } from "lucide-react";

export default function StallPlaceholder() {
  const path = window.location.pathname.split("/").pop() || "";

  const labels: Record<string, string> = {
    anfragen: "Anfragen & Leads", buchungsportal: "Buchungsportal",
    angebote: "Verträge & Angebote", leistungen: "Leistungskatalog",
    boarders: "Einsteller-Verwaltung", pferde: "Pferde-Übersicht",
    overview: "Stallübersicht", cockpit: "Tages-Cockpit",
    kalender: "Stallkalender", staff: "Mitarbeiter",
    lager: "Lager & Futter", rechnungen: "Rechnungen",
    betrieb: "Betriebsübersicht", reports: "Berichte",
    experts: "Stall-Experten", connect: "HM Connect",
    chat: "Nachrichten", marketplace: "Pferdemarkt",
    settings: "Einstellungen", profil: "Profil", support: "Hilfe",
  };

  const label = labels[path] || (path ? path.charAt(0).toUpperCase() + path.slice(1) : "Bereich");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <Warehouse className="h-6 w-6" style={{ color: "#D97706" }} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[17px] font-semibold text-gray-900">{label}</h1>
          <p className="text-[13px] text-gray-400 leading-relaxed">
            Dieser Bereich ist für deinen Betrieb noch nicht aktiviert.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium"
          style={{
            background: "rgba(245,158,11,0.08)",
            color: "#D97706",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          Noch nicht aktiviert
        </span>
      </div>
    </div>
  );
}
