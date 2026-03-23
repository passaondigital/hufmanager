import { useOutletContext } from "react-router-dom";
import { Package, Plus, Search, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiGrid } from "@/components/dashboard-zones";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/hooks/useOrganization";

const DEMO_PRODUKTE = [
  { id: "1", name: "Hufbeschlag Classic", sku: "HBC-100", preis: 45, bestand: 120, kategorie: "Beschlag" },
  { id: "2", name: "Hufnagel E-Slim", sku: "HN-E200", preis: 12, bestand: 340, kategorie: "Nägel" },
  { id: "3", name: "Ledergamaschen Pro", sku: "LG-PRO", preis: 89, bestand: 25, kategorie: "Zubehör" },
  { id: "4", name: "Hufpflege-Öl 500ml", sku: "HPO-500", preis: 18, bestand: 0, kategorie: "Pflege" },
  { id: "5", name: "Therapeutisches Eisen Oval", sku: "TE-OV1", preis: 62, bestand: 45, kategorie: "Beschlag" },
];

export default function PortalProdukte() {
  const { org } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const [search, setSearch] = useState("");

  const filtered = DEMO_PRODUKTE.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { icon: Package, label: "Produkte", value: 5, sub: "im Katalog", highlight: true },
    { icon: TrendingUp, label: "Umsatz", value: "12.4k €", sub: "diesen Monat" },
    { icon: Star, label: "Bestseller", value: "HBC", sub: "Classic" },
    { icon: Package, label: "Ausverkauft", value: 1, sub: "nachbestellen" },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Produkt-Katalog</h1><p className="text-sm text-muted-foreground">{`${org.name}`}</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Neues Produkt</Button>
      </div>

      <KpiGrid columns={4} items={stats} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Produkte durchsuchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(p => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                p.bestand > 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
              )}>
                {p.bestand > 0 ? `${p.bestand} auf Lager` : "Ausverkauft"}
              </span>
            </div>
            <h3 className="text-sm font-semibold">{p.name}</h3>
            <p className="text-xs text-muted-foreground">{p.sku} · {p.kategorie}</p>
            <p className="text-lg font-bold mt-2">{p.preis} €</p>
          </div>
        ))}
      </div>
    </div>
  );
}
