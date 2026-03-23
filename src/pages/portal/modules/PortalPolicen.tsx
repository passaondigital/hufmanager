import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Search, Filter, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_POLICEN = [
  { id: "1", nummer: "PV-2025-001", kunde: "Reitstall Sonnenhof", typ: "Vollkasko", status: "aktiv", praemie: 245, ablauf: "2026-03-01" },
  { id: "2", nummer: "PV-2025-002", kunde: "Gestüt Waldblick", typ: "Haftpflicht", status: "aktiv", praemie: 89, ablauf: "2025-12-15" },
  { id: "3", nummer: "PV-2025-003", kunde: "Hof Meyer", typ: "OP-Versicherung", status: "ausstehend", praemie: 320, ablauf: "2025-09-30" },
  { id: "4", nummer: "PV-2024-018", kunde: "Stall am See", typ: "Haftpflicht", status: "abgelaufen", praemie: 75, ablauf: "2025-01-15" },
];

export default function PortalPolicen() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_POLICEN.filter(p =>
    p.kunde.toLowerCase().includes(search.toLowerCase()) ||
    p.nummer.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: Shield, label: "Aktive Policen", value: 2, sub: "laufend", highlight: true },
    { icon: AlertTriangle, label: "Ausstehend", value: 1, sub: "Prüfung nötig" },
    { icon: CheckCircle, label: "Schadensfrei", value: "98%", sub: "Quote" },
    { icon: FileText, label: "Gesamt", value: 4, sub: "alle Policen" },
  ];

  const statusColor: Record<string, string> = {
    aktiv: "bg-green-500/10 text-green-600",
    ausstehend: "bg-yellow-500/10 text-yellow-600",
    abgelaufen: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Policen-Verwaltung</h1><p className="text-sm text-muted-foreground">{`${org.name}</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neue Police</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Policen durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.kunde}</p>
              <p className="text-xs text-muted-foreground">{p.nummer} · {p.typ}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{p.praemie} €<span className="text-xs text-muted-foreground font-normal">/mtl</span></p>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColor[p.status])}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
