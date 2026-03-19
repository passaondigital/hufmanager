import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Calculator, Plus, Trash2, FileDown, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useTaxConfig } from "@/hooks/useTaxConfig";
import { VAT_RATES } from "@/lib/taxConfig";

interface GOTPosition {
  id: string;
  position_number: string;
  category: string;
  description: string;
  price_1x: number;
  price_2x: number | null;
  price_3x: number | null;
  price_4x: number | null;
}

interface SelectedPosition {
  position: GOTPosition;
  multiplier: number; // 1-4
  quantity: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  allgemein: "Allgemein",
  orthopaedie: "Orthopädie",
  bildgebung: "Bildgebung",
  zahnheilkunde: "Zahnheilkunde",
  chirurgie: "Chirurgie",
  innere: "Innere Medizin",
  labor: "Labor",
  impfung: "Impfung/Prophylaxe",
  notdienst: "Notdienst",
  kaufuntersuchung: "Kaufuntersuchung",
};

const CATEGORY_COLORS: Record<string, string> = {
  allgemein: "bg-blue-500/10 text-blue-700",
  orthopaedie: "bg-amber-500/10 text-amber-700",
  bildgebung: "bg-purple-500/10 text-purple-700",
  zahnheilkunde: "bg-green-500/10 text-green-700",
  chirurgie: "bg-red-500/10 text-red-700",
  innere: "bg-teal-500/10 text-teal-700",
  labor: "bg-indigo-500/10 text-indigo-700",
  impfung: "bg-cyan-500/10 text-cyan-700",
  notdienst: "bg-orange-500/10 text-orange-700",
  kaufuntersuchung: "bg-pink-500/10 text-pink-700",
};

export default function VetGOTRechner() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedPosition[]>([]);
  const [distance, setDistance] = useState(0);

  const { data: positions, isLoading } = useQuery({
    queryKey: ["got-positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("got_positions")
        .select("id, position_number, category, description, price_1x, price_2x, price_3x, price_4x")
        .eq("is_equine_relevant", true)
        .order("position_number");
      if (error) throw error;
      return (data || []) as GOTPosition[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const filtered = positions?.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) && !p.position_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addPosition = (pos: GOTPosition) => {
    setSelected((prev) => [...prev, { position: pos, multiplier: 1, quantity: 1 }]);
  };

  const removePosition = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMultiplier = (index: number, mult: number) => {
    setSelected((prev) => prev.map((s, i) => i === index ? { ...s, multiplier: mult } : s));
  };

  const updateQuantity = (index: number, qty: number) => {
    setSelected((prev) => prev.map((s, i) => i === index ? { ...s, quantity: Math.max(1, qty) } : s));
  };

  const getPrice = (pos: GOTPosition, mult: number): number => {
    if (mult === 1) return pos.price_1x;
    if (mult === 2) return pos.price_2x || pos.price_1x * 2;
    if (mult === 3) return pos.price_3x || pos.price_1x * 3;
    if (mult === 4) return pos.price_4x || pos.price_1x * 4;
    return pos.price_1x * mult;
  };

  // Calculate wegegeld
  const wegegeld = positions?.find((p) => p.position_number === "E81");
  const wegegeldTotal = distance > 0 && wegegeld ? distance * wegegeld.price_1x : 0;

  const subtotal = selected.reduce((sum, s) => sum + getPrice(s.position, s.multiplier) * s.quantity, 0);
  const total = subtotal + wegegeldTotal;

  const categories = [...new Set(positions?.map((p) => p.category) || [])];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">GOT-Rechner</h1>
              <p className="text-xs text-muted-foreground">Gebührenordnung für Tierärzte 2022 – Pferde</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Position Catalog */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Leistungskatalog</CardTitle>
                <div className="flex gap-2 items-center mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Leistung suchen..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge
                    variant={filterCategory === null ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setFilterCategory(null)}
                  >
                    Alle
                  </Badge>
                  {categories.map((cat) => (
                    <Badge
                      key={cat}
                      variant={filterCategory === cat ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-auto space-y-1">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Lade GOT-Positionen...</p>
                ) : filtered?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Keine Positionen gefunden</p>
                ) : (
                  filtered?.map((pos) => (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="secondary" className={`text-[10px] shrink-0 ${CATEGORY_COLORS[pos.category] || ""}`}>
                          {pos.position_number}
                        </Badge>
                        <span className="text-sm truncate">{pos.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-mono font-medium">
                          {pos.price_1x.toFixed(2)}€
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => addPosition(pos)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Selected + Total */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Rechnung
                  <Badge variant="secondary">{selected.length} Position{selected.length !== 1 ? "en" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Leistungen aus dem Katalog hinzufügen
                  </p>
                ) : (
                  selected.map((s, i) => (
                    <div key={i} className="space-y-2 p-3 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.position.description}</p>
                          <p className="text-xs text-muted-foreground">{s.position.position_number}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removePosition(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-xs">Satz: {s.multiplier}×</Label>
                          <Slider
                            min={1}
                            max={4}
                            step={1}
                            value={[s.multiplier]}
                            onValueChange={([v]) => updateMultiplier(i, v)}
                            className="mt-1"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                            <span>1×</span><span>2×</span><span>3×</span><span>4× (Notdienst)</span>
                          </div>
                        </div>
                        <div className="w-16">
                          <Label className="text-xs">Menge</Label>
                          <Input
                            type="number"
                            min={1}
                            value={s.quantity}
                            onChange={(e) => updateQuantity(i, parseInt(e.target.value) || 1)}
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="text-right text-sm font-mono font-semibold">
                        {(getPrice(s.position, s.multiplier) * s.quantity).toFixed(2)}€
                      </div>
                    </div>
                  ))
                )}

                {/* Wegegeld */}
                <div className="pt-3 border-t space-y-2">
                  <Label className="text-xs">Wegegeld (km einfache Strecke)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={distance}
                    onChange={(e) => setDistance(parseInt(e.target.value) || 0)}
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                  {wegegeldTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {distance} km × {wegegeld?.price_1x.toFixed(2)}€/km = {wegegeldTotal.toFixed(2)}€
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="pt-3 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zwischensumme</span>
                    <span className="font-mono">{subtotal.toFixed(2)}€</span>
                  </div>
                  {wegegeldTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wegegeld</span>
                      <span className="font-mono">{wegegeldTotal.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-1 border-t">
                    <span>Gesamt (netto)</span>
                    <span className="font-mono">{total.toFixed(2)}€</span>
                  </div>
                  <VetMwstDisplay total={total} />
                </div>

                <p className="text-[10px] text-muted-foreground border-t pt-2">
                  ⚠️ Berechnung basiert auf der GOT 2022 (Stand Nov 2022). 
                  Keine Gewähr. Für verbindliche Abrechnung gilt die aktuelle GOT-Fassung.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
