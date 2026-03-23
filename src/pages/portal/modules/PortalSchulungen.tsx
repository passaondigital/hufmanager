import { useOutletContext } from "react-router-dom";
import { GraduationCap, Plus, Users, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/dashboard-zones";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_SCHULUNGEN = [
  { id: "1", titel: "Grundkurs Hufbeschlag", teilnehmer: 12, maxTn: 15, datum: "2025-04-10", status: "offen", ort: "Akademie München" },
  { id: "2", titel: "Orthopädischer Beschlag I", teilnehmer: 8, maxTn: 10, datum: "2025-05-02", status: "offen", ort: "Online" },
  { id: "3", titel: "Werkzeugkunde Advanced", teilnehmer: 10, maxTn: 10, datum: "2025-03-01", status: "abgeschlossen", ort: "Akademie Hamburg" },
];

export default function PortalSchulungen() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();

  const stats = [
    { icon: GraduationCap, label: "Schulungen", value: 3, sub: "gesamt", highlight: true },
    { icon: Users, label: "Teilnehmer", value: 30, sub: "registriert" },
    { icon: Calendar, label: "Nächste", value: "10.04.", sub: "Grundkurs" },
    { icon: Award, label: "Zertifikate", value: 10, sub: "ausgestellt" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 class="text-xl font-bold">Schulungen</h1><p class="text-sm text-muted-foreground">Kurse und Weiterbildungen verwalten</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neue Schulung</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="grid sm:grid-cols-2 gap-3">
        {DEMO_SCHULUNGEN.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                s.status === "offen" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
              )}>
                {s.status === "offen" ? "Anmeldung offen" : "Abgeschlossen"}
              </span>
            </div>
            <h3 className="text-sm font-semibold">{s.titel}</h3>
            <p className="text-xs text-muted-foreground mt-1">{s.datum} · {s.ort}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(s.teilnehmer / s.maxTn) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{s.teilnehmer}/{s.maxTn}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
