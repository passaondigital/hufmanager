import { useOutletContext } from "react-router-dom";
import { ShoppingCart, Plus, Search, Package, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_ORDERS = [
  { id: "1", nr: "ORD-2025-087", kunde: "Schmied Huber", produkte: 3, summe: 245, status: "neu", datum: "2025-03-20" },
  { id: "2", nr: "ORD-2025-085", kunde: "Beschlagservice Meier", produkte: 7, summe: 520, status: "versendet", datum: "2025-03-18" },
  { id: "3", nr: "ORD-2025-079", kunde: "Hufpflege Schmidt", produkte: 2, summe: 134, status: "geliefert", datum: "2025-03-10" },
];

export default function PortalOrders() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_ORDERS.filter(o =>
    o.kunde.toLowerCase().includes(search.toLowerCase()) ||
    o.nr.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: ShoppingCart, label: "Neue Bestellungen", value: 1, sub: "offen", highlight: true },
    { icon: Truck, label: "Versendet", value: 1, sub: "unterwegs" },
    { icon: CheckCircle, label: "Geliefert", value: 1, sub: "abgeschlossen" },
    { icon: Package, label: "Umsatz", value: "899 €", sub: "diese Woche" },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    neu: { label: "Neu", className: "bg-yellow-500/10 text-yellow-600" },
    versendet: { label: "Versendet", className: "bg-blue-500/10 text-blue-600" },
    geliefert: { label: "Geliefert", className: "bg-green-500/10 text-green-600" },
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 class="text-xl font-bold">Bestellungen</h1><p class="text-sm text-muted-foreground">Eingehende Bestellungen verwalten</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neue Bestellung</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Bestellungen durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(o => {
          const cfg = statusConfig[o.status] || statusConfig.neu;
          return (
            <div key={o.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{o.kunde}</p>
                <p className="text-xs text-muted-foreground">{o.nr} · {o.produkte} Artikel · {o.datum}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{o.summe} €</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.className)}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
