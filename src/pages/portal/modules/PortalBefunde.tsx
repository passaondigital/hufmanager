import { useOutletContext } from "react-router-dom";
import { FileText, Plus, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_BEFUNDE = [
  { id: "1", patient: "Sunny", typ: "Huf-Röntgen", status: "abgeschlossen", datum: "2025-03-18", arzt: "Dr. Weber" },
  { id: "2", patient: "Storm", typ: "Lahmheitsuntersuchung", status: "offen", datum: "2025-03-20", arzt: "Dr. Müller" },
  { id: "3", patient: "Luna", typ: "Blutbild", status: "in_bearbeitung", datum: "2025-03-19", arzt: "Dr. Weber" },
  { id: "4", patient: "Max", typ: "Kontrollbefund Huf VL", status: "abgeschlossen", datum: "2025-02-28", arzt: "Dr. Fischer" },
];

export default function PortalBefunde() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_BEFUNDE.filter(b =>
    b.patient.toLowerCase().includes(search.toLowerCase()) ||
    b.typ.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: FileText, label: "Befunde", value: 4, sub: "gesamt", highlight: true },
    { icon: AlertTriangle, label: "Offen", value: 1, sub: "ausstehend" },
    { icon: Clock, label: "In Bearbeitung", value: 1, sub: "Labor" },
    { icon: CheckCircle, label: "Abgeschlossen", value: 2, sub: "archiviert" },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    offen: { label: "Offen", className: "bg-yellow-500/10 text-yellow-600" },
    in_bearbeitung: { label: "In Bearbeitung", className: "bg-blue-500/10 text-blue-600" },
    abgeschlossen: { label: "Abgeschlossen", className: "bg-green-500/10 text-green-600" },
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Befunde</h1><p className="text-sm text-muted-foreground">Medizinische Befunde und Untersuchungen</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Befund</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Befunde durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(b => {
          const cfg = statusConfig[b.status] || statusConfig.offen;
          return (
            <div key={b.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{b.patient} — {b.typ}</p>
                <p className="text-xs text-muted-foreground">{b.datum} · {b.arzt}</p>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.className)}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
