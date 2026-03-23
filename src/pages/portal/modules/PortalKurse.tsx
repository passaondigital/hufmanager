import { useOutletContext } from "react-router-dom";
import { BookOpen, Plus, Users, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/dashboard-zones";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_KURSE = [
  { id: "1", titel: "Hufpflege Grundlagen", schueler: 8, dauer: "6 Monate", status: "aktiv", fortschritt: 65 },
  { id: "2", titel: "Schmiedetechnik I", schueler: 5, dauer: "3 Monate", status: "aktiv", fortschritt: 30 },
  { id: "3", titel: "Orthopädie Aufbau", schueler: 3, dauer: "12 Monate", status: "geplant", fortschritt: 0 },
];

export default function PortalKurse() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const stats = [
    { icon: BookOpen, label: "Aktive Kurse", value: 2, sub: "laufend", highlight: true },
    { icon: Users, label: "Schüler", value: 16, sub: "eingeschrieben" },
    { icon: Clock, label: "Nächster Start", value: "Mai", sub: "Orthopädie" },
    { icon: Award, label: "Abschlüsse", value: 12, sub: "bisher" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 class="text-xl font-bold">Kurse</h1><p class="text-sm text-muted-foreground">Ausbildungskurse verwalten</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Kurs</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="space-y-3">
        {DEMO_KURSE.map(k => (
          <div key={k.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> {k.titel}
              </h3>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                k.status === "aktiv" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
              )}>
                {k.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{k.schueler} Schüler · {k.dauer}</p>
            {k.fortschritt > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${k.fortschritt}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{k.fortschritt}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
