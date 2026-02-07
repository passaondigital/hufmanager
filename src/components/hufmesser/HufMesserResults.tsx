import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, MinusCircle, ShoppingCart, Package, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SizeRecommendation } from "./hufschuh-sizes";

interface HufMesserResultsProps {
  lengthMm: number;
  widthMm: number;
  hoofLabel: string;
  recommendations: SizeRecommendation[];
  inventoryMatches?: InventoryMatch[];
  onOrderClick?: (brand: string, model: string, size: string) => void;
}

export interface InventoryMatch {
  brand: string;
  size: string;
  currentStock: number;
  productName: string;
}

const FIT_CONFIG = {
  perfect: {
    label: "Passt perfekt",
    color: "bg-green-500/10 text-green-700 border-green-500/30",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  tight: {
    label: "Knapp",
    color: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  loose: {
    label: "Etwas weit",
    color: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    icon: MinusCircle,
    iconColor: "text-blue-500",
  },
};

export function HufMesserResults({
  lengthMm,
  widthMm,
  hoofLabel,
  recommendations,
  inventoryMatches = [],
  onOrderClick,
}: HufMesserResultsProps) {
  // Group recommendations by brand
  const groupedByBrand = recommendations.reduce<Record<string, SizeRecommendation[]>>(
    (acc, rec) => {
      const key = `${rec.brand} ${rec.model}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    },
    {}
  );

  const checkInventory = (brand: string, size: string): InventoryMatch | undefined => {
    return inventoryMatches.find(
      (m) => m.brand.toLowerCase().includes(brand.toLowerCase()) && m.size === size
    );
  };

  if (recommendations.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="font-medium text-amber-700">Keine passende Größe gefunden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Für {lengthMm}mm x {widthMm}mm konnte kein passender Hufschuh ermittelt werden.
            Bitte die Maße prüfen oder direkt beim Hersteller anfragen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Measurement Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wide">
                {hoofLabel} - Messergebnis
              </p>
              <p className="text-2xl font-bold text-foreground">
                {lengthMm} x {widthMm} mm
              </p>
              <p className="text-xs text-muted-foreground">Länge x Breite</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-primary border-primary">
                {recommendations.filter((r) => r.fit === "perfect").length} perfekte Treffer
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations by Brand */}
      {Object.entries(groupedByBrand).map(([brandModel, recs]) => (
        <Card key={brandModel}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {brandModel}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {recs.map((rec) => {
              const fitInfo = FIT_CONFIG[rec.fit];
              const FitIcon = fitInfo.icon;
              const stock = checkInventory(rec.brand, rec.size);

              return (
                <div
                  key={`${rec.brand}-${rec.model}-${rec.size}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    fitInfo.color
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FitIcon className={cn("h-5 w-5 shrink-0", fitInfo.iconColor)} />
                    <div>
                      <p className="font-semibold text-sm">Größe {rec.size}</p>
                      <p className="text-xs opacity-70">{fitInfo.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Inventory Status */}
                    {stock && stock.currentStock > 0 ? (
                      <Badge className="bg-green-500 text-white text-xs gap-1">
                        <Package className="h-3 w-3" />
                        {stock.currentStock}x Lager
                      </Badge>
                    ) : (
                      onOrderClick && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => onOrderClick(rec.brand, rec.model, rec.size)}
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Bestellen
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
