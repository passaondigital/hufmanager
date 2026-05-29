import { Building2 } from "lucide-react";

export default function PortalPlaceholder() {
  const path = window.location.pathname.split("/").pop() || "";

  const labels: Record<string, string> = {
    policen: "Policen-Verwaltung", claims: "Schadensfälle",
    analytics: "Analytics", team: "Team-Verwaltung",
    connect: "HM Connect", import: "Import Center",
    produkte: "Produkt-Katalog", schulungen: "Schulungen",
    orders: "Bestellungen", kurse: "Kurse",
    schueler: "Schüler", pruefungen: "Prüfungen",
    standards: "Standards", mitglieder: "Mitglieder",
    statistiken: "Statistiken", patienten: "Patienten",
    befunde: "Befunde", impfungen: "Impfungen",
  };

  const label = labels[path] || (path ? path.charAt(0).toUpperCase() + path.slice(1) : "Modul");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.18)",
          }}
        >
          <Building2 className="h-6 w-6" style={{ color: "#F97316" }} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[17px] font-semibold text-gray-900">{label}</h1>
          <p className="text-[13px] text-gray-400 leading-relaxed">
            Dieser Bereich ist für dein Konto noch nicht aktiviert.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium"
          style={{
            background: "rgba(249,115,22,0.08)",
            color: "#F97316",
            border: "1px solid rgba(249,115,22,0.18)",
          }}
        >
          Noch nicht aktiviert
        </span>
      </div>
    </div>
  );
}
