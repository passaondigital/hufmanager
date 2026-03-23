import { useState } from "react";
import { SectionHeader, KpiGrid } from "@/components/dashboard-zones";
import { Package, AlertTriangle, TrendingDown, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

const INVENTORY = [
  { name: "Heu (Ballen)", stock: 45, min: 20, unit: "Ballen", category: "futter" },
  { name: "Stroh (Ballen)", stock: 30, min: 15, unit: "Ballen", category: "einstreu" },
  { name: "Kraftfutter (Sack)", stock: 12, min: 5, unit: "Säcke", category: "futter" },
  { name: "Müsli Premium", stock: 3, min: 5, unit: "Säcke", category: "futter" },
  { name: "Lecksteine", stock: 8, min: 4, unit: "Stück", category: "mineral" },
  { name: "Späne", stock: 0, min: 10, unit: "Säcke", category: "einstreu" },
];

export default function StallLager() {
  const [filter, setFilter] = useState<"all" | "low">("all");

  const lowItems = INVENTORY.filter(i => i.stock <= i.min);
  const emptyItems = INVENTORY.filter(i => i.stock === 0);
  const filtered = filter === "low" ? lowItems : INVENTORY;

  const stats = [
    { icon: Package, label: "Artikel", value: INVENTORY.length, sub: "gesamt" },
    { icon: AlertTriangle, label: "Nachbestellen", value: lowItems.length, sub: "niedrig", warning: lowItems.length > 0 },
    { icon: TrendingDown, label: "Leer", value: emptyItems.length, sub: "Bestand = 0", warning: emptyItems.length > 0 },
    { icon: Wheat, label: "Futter", value: INVENTORY.filter(i => i.category === "futter").length, sub: "Positionen" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Lager & Futter</h1>
      <KpiGrid columns={4} items={stats} />

      <div className="flex gap-2">
        {[{ key: "all", label: "Alle" }, { key: "low", label: "Nachbestellen" }].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >{f.label}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filtered.map(item => (
          <div key={item.name} className="flex items-center gap-3 p-3">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              item.stock === 0 ? "bg-red-500/10" : item.stock <= item.min ? "bg-amber-500/10" : "bg-green-500/10"
            )}>
              <Package className={cn("h-4 w-4", item.stock === 0 ? "text-red-500" : item.stock <= item.min ? "text-amber-600" : "text-green-600")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">Min. {item.min} {item.unit}</p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-semibold", item.stock === 0 ? "text-red-500" : item.stock <= item.min ? "text-amber-600" : "text-foreground")}>
                {item.stock} {item.unit}
              </p>
              {item.stock <= item.min && (
                <p className="text-[10px] text-amber-600">Nachbestellen</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
