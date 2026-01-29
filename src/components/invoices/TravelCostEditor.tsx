import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Car, Info, MapPin, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { InvoiceLineItem } from "./InvoiceLineItemsEditor";

interface Client {
  id: string;
  full_name: string | null;
  readable_id: string | null;
  stable_latitude: number | null;
  stable_longitude: number | null;
}

interface TravelCostEditorProps {
  clientId: string;
  clients: Client[];
  onAddTravelCost: (lineItem: InvoiceLineItem) => void;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function TravelCostEditor({ clientId, clients, onAddTravelCost }: TravelCostEditorProps) {
  const [showTravelCost, setShowTravelCost] = useState(false);
  const [travelCostMode, setTravelCostMode] = useState<"kilometer" | "pauschale">("kilometer");
  const [travelKm, setTravelKm] = useState<string>("");
  const [pricePerKm, setPricePerKm] = useState<string>("0.50");
  const [flatAmount, setFlatAmount] = useState<string>("");
  const [flatDescription, setFlatDescription] = useState<string>("Anfahrtspauschale");
  const [calculatedTravelCost, setCalculatedTravelCost] = useState<number>(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Calculate travel cost when km changes or mode changes
  useEffect(() => {
    if (travelCostMode === "kilometer") {
      const km = parseFloat(travelKm) || 0;
      const perKm = parseFloat(pricePerKm) || 0;
      const cost = km * 2 * perKm;
      setCalculatedTravelCost(Math.round(cost * 100) / 100);
    } else {
      const flat = parseFloat(flatAmount) || 0;
      setCalculatedTravelCost(Math.round(flat * 100) / 100);
    }
  }, [travelKm, pricePerKm, flatAmount, travelCostMode]);

  const calculateTravelDistance = () => {
    const selectedClient = clients.find(c => c.id === clientId);
    
    if (!selectedClient?.stable_latitude || !selectedClient?.stable_longitude) {
      toast({
        title: "Keine Koordinaten",
        description: "Für diesen Kunden sind keine Standortdaten hinterlegt. Bitte KM manuell eingeben.",
        variant: "destructive",
      });
      return;
    }
    
    const businessLat = 49.45; // Nuremberg (default)
    const businessLon = 11.08;
    
    const distance = calculateDistance(
      businessLat,
      businessLon,
      selectedClient.stable_latitude,
      selectedClient.stable_longitude
    );
    
    setTravelKm(Math.round(distance).toString());
    setShowTravelCost(true);
  };

  const addTravelCostAsLineItem = () => {
    const title = travelCostMode === "kilometer"
      ? `Anfahrt: ${travelKm} km (Hin- und Rückfahrt)`
      : flatDescription.trim() || "Anfahrtspauschale";
    
    const newLineItem: InvoiceLineItem = {
      id: `travel-${Date.now()}`,
      inventory_item_id: null,
      title,
      quantity: 1,
      unit_price: calculatedTravelCost,
    };
    
    onAddTravelCost(newLineItem);
    setShowTravelCost(false);
    setTravelKm("");
    setFlatAmount("");
    setFlatDescription("Anfahrtspauschale");
    toast({ title: "Fahrtkosten hinzugefügt" });
  };

  if (!clientId) return null;

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-dashed space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Car className="h-4 w-4" />
          Fahrtkosten
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>Wähle 'Kilometer' für automatische Distanzberechnung (Hin- & Rückweg) oder 'Pauschale' für feste Zonentarife.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        {!showTravelCost && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowTravelCost(true);
              if (travelCostMode === "kilometer") {
                calculateTravelDistance();
              }
            }}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Hinzufügen
          </Button>
        )}
      </div>
      
      {showTravelCost && (
        <div className="space-y-3">
          {/* Mode Switcher */}
          <ToggleGroup
            type="single"
            value={travelCostMode}
            onValueChange={(value) => value && setTravelCostMode(value as "kilometer" | "pauschale")}
            className="justify-start"
          >
            <ToggleGroupItem 
              value="kilometer" 
              className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Kilometer
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="pauschale" 
              className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Pauschale
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Mode A: Kilometer */}
          {travelCostMode === "kilometer" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={travelKm}
                  onChange={(e) => setTravelKm(e.target.value)}
                  placeholder="km"
                  className="w-20 h-8"
                />
                <span className="text-xs text-muted-foreground">km (einfach)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={calculateTravelDistance}
                        className="h-7"
                      >
                        <MapPin className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Automatische Distanzermittlung basierend auf der Kundenadresse.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Preis pro km:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(e.target.value)}
                    className="w-20 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground pl-0.5">
                  Standard: 0,30€ - 0,60€. Dieser Wert multipliziert sich mit der doppelten Strecke (Hin/Rück).
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {travelKm ? `${travelKm} km × 2 × €${pricePerKm}/km` : "Formel: Distanz × 2 × Preis/km"}
                </span>
                <span className="font-medium">{formatCurrency(calculatedTravelCost)}</span>
              </div>
            </div>
          )}

          {/* Mode B: Pauschale (Flat Rate) */}
          {travelCostMode === "pauschale" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Betrag:</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={flatAmount}
                  onChange={(e) => setFlatAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-24 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">€</span>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Beschreibung (optional):</Label>
                <Input
                  type="text"
                  value={flatDescription}
                  onChange={(e) => setFlatDescription(e.target.value)}
                  placeholder="Anfahrtspauschale"
                  className="h-8 text-sm mt-1"
                />
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {flatDescription || "Anfahrtspauschale"}
                </span>
                <span className="font-medium">{formatCurrency(calculatedTravelCost)}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addTravelCostAsLineItem}
              disabled={
                (travelCostMode === "kilometer" && (!travelKm || calculatedTravelCost <= 0)) ||
                (travelCostMode === "pauschale" && calculatedTravelCost <= 0)
              }
              className="flex-1 h-7 text-xs"
            >
              Als Position hinzufügen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTravelCost(false)}
              className="h-7 text-xs"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
