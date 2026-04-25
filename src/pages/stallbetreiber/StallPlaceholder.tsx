import { Navigate } from "react-router-dom";

/** Simple placeholder page that shows a coming-soon card */
export default function StallPlaceholder() {
  const title = document.title || "Stallbetreiber";
  const path = window.location.pathname.split("/").pop() || "";
  
  const labels: Record<string, string> = {
    anfragen: "Anfragen & Leads",
    buchungsportal: "Buchungsportal",
    angebote: "Verträge & Angebote",
    leistungen: "Leistungskatalog",
    boarders: "Einsteller-Verwaltung",
    pferde: "Pferde-Übersicht",
    overview: "Stallübersicht",
    cockpit: "Tages-Cockpit",
    kalender: "Stallkalender",
    staff: "Mitarbeiter",
    lager: "Lager & Futter",
    rechnungen: "Rechnungen",
    betrieb: "Betriebsübersicht",
    reports: "Berichte & Behörden",
    experts: "Stall-Experten",
    connect: "Hufi Connect",
    chat: "Nachrichten",
    marketplace: "Pferdemarkt",
    settings: "Stall-Einstellungen",
    profil: "Mein Profil",
    support: "Hilfe & Support",
  };

  const label = labels[path] || path;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🏇</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{label}</h1>
        <p className="text-sm text-muted-foreground">
          Dieses Modul wird gerade für die Stallbetreiber-Suite aufgebaut.
          Bald verfügbar!
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
          🔧 In Entwicklung
        </div>
      </div>
    </div>
  );
}
