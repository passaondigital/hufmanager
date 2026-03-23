import { useOutletContext } from "react-router-dom";
import { GraduationCap, Plus, Search, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_SCHUELER = [
  { id: "1", name: "Max Müller", kurs: "Hufpflege Grundlagen", status: "aktiv", fortschritt: 72, note: "1.8" },
  { id: "2", name: "Lisa Weber", kurs: "Schmiedetechnik I", status: "aktiv", fortschritt: 45, note: "2.1" },
  { id: "3", name: "Tom Schmidt", kurs: "Hufpflege Grundlagen", status: "aktiv", fortschritt: 88, note: "1.3" },
  { id: "4", name: "Anna Fischer", kurs: "Hufpflege Grundlagen", status: "pausiert", fortschritt: 30, note: "–" },
];

export default function PortalSchueler() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_SCHUELER.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 class="text-xl font-bold">Schüler</h1><p class="text-sm text-muted-foreground">Auszubildende verwalten</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neuer Schüler</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Schüler suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {s.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.kurs}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Fortschritt</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${s.fortschritt}%` }} />
                  </div>
                  <span className="text-xs font-medium">{s.fortschritt}%</span>
                </div>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                s.status === "aktiv" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
              )}>
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
