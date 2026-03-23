import { SectionHeader } from "@/components/dashboard-zones";
import { Wrench, MapPin, Dumbbell, Droplets, Sun, Fence } from "lucide-react";

const SERVICES = [
  { icon: Fence, label: "Paddock", desc: "Einzelpaddock, täglich 4h", status: "verfügbar", color: "text-green-600 bg-green-500/10" },
  { icon: MapPin, label: "Reitplatz", desc: "20x40m, Sand-Boden", status: "verfügbar", color: "text-green-600 bg-green-500/10" },
  { icon: Dumbbell, label: "Führanlage", desc: "6-Pferde, verschiedene Programme", status: "verfügbar", color: "text-green-600 bg-green-500/10" },
  { icon: Droplets, label: "Waschplatz", desc: "Warm/Kaltwasser, 2 Plätze", status: "verfügbar", color: "text-green-600 bg-green-500/10" },
  { icon: Sun, label: "Solarium", desc: "Infrarot, Buchung nötig", status: "buchbar", color: "text-amber-600 bg-amber-500/10" },
  { icon: Wrench, label: "Sattelkammer", desc: "1 Fach pro Einsteller inklusive", status: "inklusive", color: "text-primary bg-primary/10" },
];

export default function StallLeistungen() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Leistungskatalog</h1>
      <p className="text-sm text-muted-foreground">Infrastruktur und Zusatzleistungen deines Stalls.</p>

      <SectionHeader title="Infrastruktur" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SERVICES.map(svc => (
          <div key={svc.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
            <div className={`w-9 h-9 rounded-lg ${svc.color} flex items-center justify-center`}>
              <svc.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{svc.label}</p>
              <p className="text-xs text-muted-foreground">{svc.desc}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{svc.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
