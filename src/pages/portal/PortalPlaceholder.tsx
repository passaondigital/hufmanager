import { useParams } from "react-router-dom";

export default function PortalPlaceholder() {
  const path = window.location.pathname.split("/").pop() || "";

  const labels: Record<string, string> = {
    policen: "Policen-Verwaltung",
    claims: "Schadensfälle",
    analytics: "Analytics",
    team: "Team-Verwaltung",
    connect: "Hufi Connect",
    import: "Import Center",
    produkte: "Produkt-Katalog",
    schulungen: "Schulungen",
    orders: "Bestellungen",
    kurse: "Kurse",
    schueler: "Schüler",
    pruefungen: "Prüfungen",
    standards: "Standards",
    mitglieder: "Mitglieder",
    statistiken: "Statistiken",
    patienten: "Patienten",
    befunde: "Befunde",
    impfungen: "Impfungen",
  };

  const label = labels[path] || path;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🏢</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{label}</h1>
        <p className="text-sm text-muted-foreground">
          Dieses Modul wird gerade für das Portal aufgebaut. Bald verfügbar!
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium">
          🔧 In Entwicklung
        </div>
      </div>
    </div>
  );
}
