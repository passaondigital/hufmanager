import { useOutletContext } from "react-router-dom";
import { ClipboardList, Plus, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid, SectionHeader } from "@/components/dashboard-zones";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_STANDARDS = [
  { id: "1", titel: "Hufpflege-Qualitätsstandard 2025", version: "v3.1", status: "aktiv", kategorie: "Qualität", aktualisiert: "2025-01-15" },
  { id: "2", titel: "Arbeitsschutz-Richtlinie", version: "v2.0", status: "aktiv", kategorie: "Sicherheit", aktualisiert: "2024-11-01" },
  { id: "3", titel: "Ausbildungsordnung", version: "v1.5", status: "in_ueberarbeitung", kategorie: "Ausbildung", aktualisiert: "2025-03-01" },
  { id: "4", titel: "Ethik-Kodex Hufbearbeitung", version: "v1.0", status: "aktiv", kategorie: "Ethik", aktualisiert: "2024-06-01" },
];

export default function PortalStandards() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const stats = [
    { icon: ClipboardList, label: "Standards", value: 4, sub: "definiert", highlight: true },
    { icon: CheckCircle, label: "Aktiv", value: 3, sub: "gültig" },
    { icon: AlertTriangle, label: "In Überarbeitung", value: 1, sub: "Entwurf" },
    { icon: FileText, label: "Dokumente", value: 12, sub: "verknüpft" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <SectionHeader icon="📏" title="Standards & Richtlinien" subtitle="Qualitäts- und Branchenstandards" />
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Standard</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="space-y-3">
        {DEMO_STANDARDS.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{s.titel}</h3>
                  <p className="text-xs text-muted-foreground">{s.version} · {s.kategorie} · Aktualisiert {s.aktualisiert}</p>
                </div>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                s.status === "aktiv" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
              )}>
                {s.status === "aktiv" ? "Aktiv" : "In Überarbeitung"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
