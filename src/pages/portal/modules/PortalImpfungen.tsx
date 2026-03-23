import { useOutletContext } from "react-router-dom";
import { ClipboardList, Plus, Search, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_IMPFUNGEN = [
  { id: "1", patient: "Sunny", impfung: "Tetanus", datum: "2025-03-01", naechste: "2026-03-01", status: "aktuell" },
  { id: "2", patient: "Storm", impfung: "Influenza", datum: "2024-09-15", naechste: "2025-03-15", status: "faellig" },
  { id: "3", patient: "Luna", impfung: "Herpes (EHV)", datum: "2025-01-10", naechste: "2025-07-10", status: "aktuell" },
  { id: "4", patient: "Max", impfung: "Tetanus", datum: "2024-06-20", naechste: "2025-06-20", status: "aktuell" },
  { id: "5", patient: "Storm", impfung: "Tetanus", datum: "2024-04-10", naechste: "2025-04-10", status: "faellig" },
];

export default function PortalImpfungen() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_IMPFUNGEN.filter(i =>
    i.patient.toLowerCase().includes(search.toLowerCase()) ||
    i.impfung.toLowerCase().includes(search.toLowerCase())
  );

  const faellig = DEMO_IMPFUNGEN.filter(i => i.status === "faellig").length;
  const aktuell = DEMO_IMPFUNGEN.filter(i => i.status === "aktuell").length;

  const stats = [
    { icon: ClipboardList, label: "Impfungen", value: DEMO_IMPFUNGEN.length, sub: "erfasst", highlight: true },
    { icon: CheckCircle, label: "Aktuell", value: aktuell, sub: "gültig" },
    { icon: AlertTriangle, label: "Fällig", value: faellig, sub: "auffrischen!", highlight: faellig > 0 },
    { icon: Calendar, label: "Nächste", value: "15.03.", sub: "Influenza" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Impfungen</h1><p className="text-sm text-muted-foreground">Impfstatus und Auffrischungstermine</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Impfung eintragen</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Impfungen durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(i => (
          <div key={i.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              i.status === "faellig" ? "bg-yellow-500/10" : "bg-green-500/10"
            )}>
              {i.status === "faellig" ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i.patient} — {i.impfung}</p>
              <p className="text-xs text-muted-foreground">Geimpft: {i.datum} · Nächste: {i.naechste}</p>
            </div>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              i.status === "faellig" ? "bg-yellow-500/10 text-yellow-600" : "bg-green-500/10 text-green-600"
            )}>
              {i.status === "faellig" ? "Fällig!" : "Aktuell"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
