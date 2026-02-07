import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ruler, Camera, Keyboard, Save, RotateCcw, CheckCircle, History,
  Package, ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { HufMesserCamera } from "./HufMesserCamera";
import { HufMesserMeasure } from "./HufMesserMeasure";
import { HufMesserResults, type InventoryMatch } from "./HufMesserResults";
import { calculateSizeRecommendations, type SizeRecommendation } from "./hufschuh-sizes";
import type { HoofMeasurements } from "@/components/horse-detail/types";

// Huf-Positionen
const HOOF_POSITIONS = [
  { key: "vl", label: "Vorne Links", shortLabel: "VL", position: "top-left" },
  { key: "vr", label: "Vorne Rechts", shortLabel: "VR", position: "top-right" },
  { key: "hl", label: "Hinten Links", shortLabel: "HL", position: "bottom-left" },
  { key: "hr", label: "Hinten Rechts", shortLabel: "HR", position: "bottom-right" },
] as const;

type HoofKey = "vl" | "vr" | "hl" | "hr";

interface HoofMeasurement {
  length: number;
  width: number;
  measuredAt?: string;
  photoUrl?: string;
}

interface HufMesserProps {
  horseId: string;
  horseName: string;
  existingMeasurements?: HoofMeasurements | null;
  onSaved?: () => void;
}

export function HufMesser({
  horseId,
  horseName,
  existingMeasurements,
  onSaved,
}: HufMesserProps) {
  const { user } = useAuth();
  const [activeHoof, setActiveHoof] = useState<HoofKey>("vl");
  const [inputMode, setInputMode] = useState<"manual" | "camera">("manual");
  const [measurements, setMeasurements] = useState<Record<HoofKey, HoofMeasurement | null>>({
    vl: null,
    vr: null,
    hl: null,
    hr: null,
  });

  // Camera workflow state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Results
  const [recommendations, setRecommendations] = useState<Record<HoofKey, SizeRecommendation[]>>({
    vl: [],
    vr: [],
    hl: [],
    hr: [],
  });

  // Inventory
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Parse existing measurements on load
  useEffect(() => {
    if (existingMeasurements) {
      const parsed: Record<HoofKey, HoofMeasurement | null> = {
        vl: null, vr: null, hl: null, hr: null,
      };

      for (const key of ["vl", "vr", "hl", "hr"] as HoofKey[]) {
        const value = existingMeasurements[key];
        if (value) {
          // Parse "130 x 145" or "130x145" or "130 × 145"
          const match = value.match(/(\d+)\s*[x×]\s*(\d+)/i);
          if (match) {
            parsed[key] = {
              length: parseInt(match[1]),
              width: parseInt(match[2]),
            };
          }
        }
      }

      setMeasurements(parsed);
    }
  }, [existingMeasurements]);

  // Fetch inventory for size matching
  useEffect(() => {
    if (!user) return;

    const fetchInventory = async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("product_name, brand, current_stock, category")
        .eq("user_id", user.id)
        .gt("current_stock", 0);

      if (data) {
        const matches: InventoryMatch[] = data
          .filter((item) => {
            const name = (item.product_name || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            return (
              name.includes("hufschuh") ||
              name.includes("boot") ||
              name.includes("scoot") ||
              name.includes("easyboot") ||
              name.includes("renegade") ||
              name.includes("flex boot") ||
              cat.includes("hufschutz") ||
              cat.includes("hufschuh")
            );
          })
          .map((item) => {
            // Extract size from product name
            const sizeMatch = (item.product_name || "").match(/(?:Größe|Size|Gr\.?)\s*(\S+)/i);
            return {
              brand: item.brand || "",
              size: sizeMatch?.[1] || "",
              currentStock: item.current_stock || 0,
              productName: item.product_name || "",
            };
          });

        setInventoryMatches(matches);
      }
    };

    fetchInventory();
  }, [user]);

  // Calculate recommendations when measurements change
  useEffect(() => {
    const newRecs: Record<HoofKey, SizeRecommendation[]> = {
      vl: [], vr: [], hl: [], hr: [],
    };

    for (const key of ["vl", "vr", "hl", "hr"] as HoofKey[]) {
      const m = measurements[key];
      if (m && m.length > 0 && m.width > 0) {
        newRecs[key] = calculateSizeRecommendations(m.length, m.width);
      }
    }

    setRecommendations(newRecs);
  }, [measurements]);

  const updateMeasurement = (hoof: HoofKey, field: "length" | "width", value: number) => {
    setMeasurements((prev) => ({
      ...prev,
      [hoof]: {
        ...(prev[hoof] || { length: 0, width: 0 }),
        [field]: value,
        measuredAt: new Date().toISOString(),
      },
    }));
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    setShowCamera(false);
    setCapturedImage(imageDataUrl);
  };

  const handleMeasured = (lengthMm: number, widthMm: number) => {
    setMeasurements((prev) => ({
      ...prev,
      [activeHoof]: {
        length: lengthMm,
        width: widthMm,
        measuredAt: new Date().toISOString(),
      },
    }));
    setCapturedImage(null);
    toast.success(`${HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label}: ${lengthMm} x ${widthMm} mm`);
  };

  const saveMeasurements = async () => {
    setSaving(true);
    try {
      const hoofMeasurements: Record<string, string> = {};

      for (const key of ["vl", "vr", "hl", "hr"] as HoofKey[]) {
        const m = measurements[key];
        if (m && m.length > 0 && m.width > 0) {
          hoofMeasurements[key] = `${m.length} × ${m.width} mm`;
        }
      }

      const { error } = await supabase
        .from("horses")
        .update({
          hoof_measurements: hoofMeasurements,
        })
        .eq("id", horseId);

      if (error) throw error;

      toast.success("Hufmaße gespeichert!");
      onSaved?.();
    } catch (err: any) {
      console.error("Fehler beim Speichern:", err);
      toast.error("Fehler beim Speichern der Hufmaße");
    } finally {
      setSaving(false);
    }
  };

  const hasMeasurements = Object.values(measurements).some(
    (m) => m && m.length > 0 && m.width > 0
  );

  const currentMeasurement = measurements[activeHoof];
  const currentRecs = recommendations[activeHoof];

  // Camera mode
  if (showCamera) {
    return (
      <HufMesserCamera
        hoofLabel={HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label || ""}
        onCapture={handleCameraCapture}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  // Measure mode (photo captured)
  if (capturedImage) {
    return (
      <HufMesserMeasure
        imageDataUrl={capturedImage}
        hoofLabel={HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label || ""}
        onMeasured={handleMeasured}
        onRetake={() => {
          setCapturedImage(null);
          setShowCamera(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          HufMesser
        </h3>
        <p className="text-sm text-muted-foreground">
          Hufmaße erfassen & passende Hufschuh-Größe ermitteln
        </p>
      </div>

      {/* Visual Hoof Selector */}
      <div className="flex justify-center">
        <div className="relative w-52 h-64 bg-muted/20 rounded-3xl border-2 border-dashed border-muted-foreground/20">
          {/* Horse silhouette hint */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-10 h-12 bg-muted/30 rounded-full" />
          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-16 h-28 bg-muted/30 rounded-full" />

          {HOOF_POSITIONS.map((pos) => {
            const m = measurements[pos.key];
            const isActive = activeHoof === pos.key;
            const hasMeas = m && m.length > 0 && m.width > 0;
            const hasRecs = recommendations[pos.key].length > 0;
            const hasPerfectFit = recommendations[pos.key].some((r) => r.fit === "perfect");

            const positionStyles: Record<string, string> = {
              vl: "top-4 left-1",
              vr: "top-4 right-1",
              hl: "bottom-4 left-1",
              hr: "bottom-4 right-1",
            };

            return (
              <button
                key={pos.key}
                type="button"
                onClick={() => setActiveHoof(pos.key)}
                className={cn(
                  "absolute w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all text-xs",
                  positionStyles[pos.key],
                  isActive
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                    : "hover:scale-105",
                  hasMeas
                    ? hasPerfectFit
                      ? "bg-green-500 text-white"
                      : hasRecs
                      ? "bg-amber-500 text-white"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted border-2 border-dashed border-muted-foreground/30"
                )}
              >
                <span className="font-bold">{pos.shortLabel}</span>
                {hasMeas && (
                  <span className="text-[10px] leading-tight opacity-90">
                    {m!.length}x{m!.width}
                  </span>
                )}
                {hasMeas && (
                  <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-white bg-green-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Mode Tabs */}
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "manual" | "camera")} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="gap-1.5">
            <Keyboard className="h-4 w-4" />
            Manuell eingeben
          </TabsTrigger>
          <TabsTrigger value="camera" className="gap-1.5">
            <Camera className="h-4 w-4" />
            Kamera-Messung
          </TabsTrigger>
        </TabsList>

        {/* Manual Input */}
        <TabsContent value="manual">
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                {HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-blue-600 font-medium">
                    Länge (mm)
                  </Label>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Zehenspitze bis breiteste Stelle Strahl
                  </p>
                  <Input
                    type="number"
                    placeholder="z.B. 130"
                    value={currentMeasurement?.length || ""}
                    onChange={(e) =>
                      updateMeasurement(activeHoof, "length", parseInt(e.target.value) || 0)
                    }
                    className="text-lg font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-green-600 font-medium">
                    Breite (mm)
                  </Label>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Breiteste Stelle des Hufs
                  </p>
                  <Input
                    type="number"
                    placeholder="z.B. 145"
                    value={currentMeasurement?.width || ""}
                    onChange={(e) =>
                      updateMeasurement(activeHoof, "width", parseInt(e.target.value) || 0)
                    }
                    className="text-lg font-mono"
                  />
                </div>
              </div>

              {/* Quick measurement guide */}
              <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                <p className="text-[10px] text-muted-foreground">
                  <strong>Tipp:</strong> Messe am frisch bearbeiteten Huf. Länge = Zehenspitze
                  bis breiteste Stelle des Strahls. Breite = breiteste Stelle, ca. 1 Daumenbreit
                  hinter der Strahlspitze.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Camera Input */}
        <TabsContent value="camera">
          <Card>
            <CardContent className="p-4 text-center space-y-3">
              <div className="w-24 h-24 mx-auto bg-muted/30 rounded-2xl flex items-center justify-center border-2 border-dashed border-primary/30">
                <Camera className="h-10 w-10 text-primary/50" />
              </div>
              <div>
                <p className="font-medium text-sm">Foto-Messung</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fotografiere die Huf-Sohle mit einem Referenz-Maß (Lineal, Münze)
                  neben dem Huf. Dann Länge und Breite auf dem Foto markieren.
                </p>
              </div>
              <Button
                onClick={() => setShowCamera(true)}
                className="w-full gap-2"
              >
                <Camera className="h-4 w-4" />
                {HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label} fotografieren
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Size Recommendations */}
      {currentMeasurement && currentMeasurement.length > 0 && currentMeasurement.width > 0 && (
        <HufMesserResults
          lengthMm={currentMeasurement.length}
          widthMm={currentMeasurement.width}
          hoofLabel={HOOF_POSITIONS.find((p) => p.key === activeHoof)?.label || ""}
          recommendations={currentRecs}
          inventoryMatches={inventoryMatches}
          onOrderClick={(brand, model, size) => {
            toast.info(`Bestellung für ${brand} ${model} Größe ${size} - kommt bald!`);
          }}
        />
      )}

      {/* Summary of all hooves */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Übersicht alle Hufe</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {HOOF_POSITIONS.map((pos) => {
              const m = measurements[pos.key];
              const recs = recommendations[pos.key];
              const perfectCount = recs.filter((r) => r.fit === "perfect").length;

              return (
                <button
                  key={pos.key}
                  onClick={() => setActiveHoof(pos.key)}
                  className={cn(
                    "p-2 rounded-lg text-center text-xs border transition-all",
                    activeHoof === pos.key ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="font-bold text-sm">{pos.shortLabel}</div>
                  {m && m.length > 0 && m.width > 0 ? (
                    <>
                      <div className="text-muted-foreground font-mono">
                        {m.length}x{m.width}
                      </div>
                      {perfectCount > 0 ? (
                        <Badge className="bg-green-500 text-[9px] h-4 mt-1">
                          {perfectCount} passend
                        </Badge>
                      ) : recs.length > 0 ? (
                        <Badge variant="secondary" className="text-[9px] h-4 mt-1">
                          {recs.length} Treffer
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-muted-foreground">—</div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasMeasurements && (
        <Button
          onClick={saveMeasurements}
          disabled={saving}
          className="w-full gap-2"
          size="lg"
        >
          <Save className="h-5 w-5" />
          {saving ? "Speichern..." : "Hufmaße speichern"}
        </Button>
      )}
    </div>
  );
}
