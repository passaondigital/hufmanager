import { useOutletContext } from "react-router-dom";
import { Award, Plus, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid, SectionHeader } from "@/components/dashboard-zones";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_PRUEFUNGEN = [
  { id: "1", titel: "Zwischenprüfung Hufpflege", datum: "2025-04-15", teilnehmer: 8, bestanden: null, status: "geplant" },
  { id: "2", titel: "Abschlussprüfung Schmiedetechnik", datum: "2025-06-20", teilnehmer: 5, bestanden: null, status: "geplant" },
  { id: "3", titel: "Grundlagen-Test Q1", datum: "2025-02-28", teilnehmer: 10, bestanden: 9, status: "abgeschlossen" },
];

export default function PortalPruefungen() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const stats = [
    { icon: Award, label: "Prüfungen", value: 3, sub: "gesamt", highlight: true },
    { icon: Calendar, label: "Nächste", value: "15.04.", sub: "Zwischenprüfung" },
    { icon: CheckCircle, label: "Bestehensquote", value: "90%", sub: "letzter Test" },
    { icon: Clock, label: "Geplant", value: 2, sub: "ausstehend" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <SectionHeader icon="🏆" title="Prüfungen" subtitle="Prüfungen planen und auswerten" />
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neue Prüfung</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="space-y-3">
        {DEMO_PRUEFUNGEN.map(p => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> {p.titel}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{p.datum} · {p.teilnehmer} Teilnehmer</p>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                p.status === "abgeschlossen" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
              )}>
                {p.status === "abgeschlossen" ? `${p.bestanden}/${p.teilnehmer} bestanden` : "Geplant"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
