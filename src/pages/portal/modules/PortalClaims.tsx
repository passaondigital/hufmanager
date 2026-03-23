import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Clock, CheckCircle, XCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid, SectionHeader } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_CLAIMS = [
  { id: "1", nr: "SF-2025-012", pferd: "Sunny", art: "Hufverletzung", status: "offen", datum: "2025-03-15", betrag: 1250 },
  { id: "2", nr: "SF-2025-008", pferd: "Storm", art: "Kollik-OP", status: "in_bearbeitung", datum: "2025-02-20", betrag: 4800 },
  { id: "3", nr: "SF-2024-045", pferd: "Luna", art: "Sehnenriss", status: "reguliert", datum: "2024-11-05", betrag: 2200 },
  { id: "4", nr: "SF-2024-032", pferd: "Max", art: "Zahnbehandlung", status: "abgelehnt", datum: "2024-09-12", betrag: 650 },
];

export default function PortalClaims() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_CLAIMS.filter(c =>
    c.pferd.toLowerCase().includes(search.toLowerCase()) ||
    c.nr.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: AlertTriangle, label: "Offene Fälle", value: 1, sub: "neu", highlight: true },
    { icon: Clock, label: "In Bearbeitung", value: 1, sub: "laufend" },
    { icon: CheckCircle, label: "Reguliert", value: 1, sub: "abgeschlossen" },
    { icon: XCircle, label: "Abgelehnt", value: 1, sub: "gesamt" },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    offen: { label: "Offen", className: "bg-yellow-500/10 text-yellow-600" },
    in_bearbeitung: { label: "In Bearbeitung", className: "bg-blue-500/10 text-blue-600" },
    reguliert: { label: "Reguliert", className: "bg-green-500/10 text-green-600" },
    abgelehnt: { label: "Abgelehnt", className: "bg-red-500/10 text-red-600" },
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <SectionHeader icon="⚠️" title="Schadensfälle" subtitle="Schadensmeldungen und Regulierungen" />
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Schaden</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Schadensfälle durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(c => {
          const cfg = statusConfig[c.status] || statusConfig.offen;
          return (
            <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.pferd} — {c.art}</p>
                <p className="text-xs text-muted-foreground">{c.nr} · {c.datum}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{c.betrag.toLocaleString("de-DE")} €</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.className)}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
