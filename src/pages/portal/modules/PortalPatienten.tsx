import { useOutletContext } from "react-router-dom";
import { Users, Plus, Search, Heart, Activity, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid, SectionHeader } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_PATIENTEN = [
  { id: "1", name: "Sunny", rasse: "Haflinger", besitzer: "Anna Müller", status: "in_behandlung", letzterBesuch: "2025-03-18" },
  { id: "2", name: "Storm", rasse: "Holsteiner", besitzer: "Peter Schmidt", status: "gesund", letzterBesuch: "2025-03-10" },
  { id: "3", name: "Luna", rasse: "Araber", besitzer: "Maria Weber", status: "in_behandlung", letzterBesuch: "2025-03-20" },
  { id: "4", name: "Max", rasse: "Warmblut", besitzer: "Klaus Fischer", status: "nachkontrolle", letzterBesuch: "2025-02-28" },
];

export default function PortalPatienten() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_PATIENTEN.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.besitzer.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: Users, label: "Patienten", value: 4, sub: "registriert", highlight: true },
    { icon: Heart, label: "In Behandlung", value: 2, sub: "aktiv" },
    { icon: Activity, label: "Gesund", value: 1, sub: "abgeschlossen" },
    { icon: Calendar, label: "Heute", value: 1, sub: "Termin" },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    in_behandlung: { label: "In Behandlung", className: "bg-yellow-500/10 text-yellow-600" },
    gesund: { label: "Gesund", className: "bg-green-500/10 text-green-600" },
    nachkontrolle: { label: "Nachkontrolle", className: "bg-blue-500/10 text-blue-600" },
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <SectionHeader icon="🐴" title="Patienten" subtitle="Patientenverwaltung und Behandlungsübersicht" />
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Patient</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Patienten suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(p => {
          const cfg = statusConfig[p.status] || statusConfig.gesund;
          return (
            <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">🐴</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.rasse} · Besitzer: {p.besitzer}</p>
              </div>
              <div className="text-right">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.className)}>{cfg.label}</span>
                <p className="text-[10px] text-muted-foreground mt-1">Letzter Besuch: {p.letzterBesuch}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
