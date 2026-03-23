import { FileText, Plus, Package } from "lucide-react";
import { SectionHeader } from "@/components/dashboard-zones";

const STALL_PACKAGES = [
  { name: "Basis-Box", desc: "Innenbox, Heu/Stroh, Weidegang", price: "350 €/Monat", active: true },
  { name: "Komfort-Box", desc: "Paddockbox, Kraftfutter, Solarium", price: "480 €/Monat", active: true },
  { name: "Offenstall", desc: "Gruppenhaltung, Rundlauf, Heu ad lib.", price: "280 €/Monat", active: true },
  { name: "Reitschul-Paket", desc: "Box + 2x Reitstunde/Woche", price: "550 €/Monat", active: false },
];

export default function StallAngebote() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Verträge & Angebote</h1>
      </div>
      <p className="text-sm text-muted-foreground">Deine Leistungspakete und Vertragstemplates.</p>

      <SectionHeader title="Leistungspakete" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STALL_PACKAGES.map(pkg => (
          <div key={pkg.name} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{pkg.name}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${pkg.active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                {pkg.active ? "Aktiv" : "Entwurf"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{pkg.desc}</p>
            <p className="text-sm font-semibold text-primary">{pkg.price}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground mb-1">Vertragsverwaltung kommt bald</p>
        <p className="text-xs text-muted-foreground">Einsteller-Verträge erstellen, versenden und digital signieren.</p>
      </div>
    </div>
  );
}
