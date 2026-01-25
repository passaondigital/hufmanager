import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Edit, Footprints, Save } from "lucide-react";
import { HoofDetailsEditor } from "./HoofDetailsEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HoofDetails } from "./types";
import type { Json } from "@/integrations/supabase/types";

interface HorseHoofDetailTabProps {
  horseId: string;
  horseName: string;
  hoofDetails: HoofDetails | null;
  onUpdate: () => void;
}

type HoofPosition = "vl" | "vr" | "hl" | "hr";

const HOOF_POSITIONS: { key: HoofPosition; label: string; labelFull: string }[] = [
  { key: "vl", label: "VL", labelFull: "Vorne Links" },
  { key: "vr", label: "VR", labelFull: "Vorne Rechts" },
  { key: "hl", label: "HL", labelFull: "Hinten Links" },
  { key: "hr", label: "HR", labelFull: "Hinten Rechts" },
];

const CONDITION_COLORS: Record<string, string> = {
  "good": "text-green-600 bg-green-100 dark:bg-green-900/30",
  "gesund": "text-green-600 bg-green-100 dark:bg-green-900/30",
  "gut": "text-green-600 bg-green-100 dark:bg-green-900/30",
  "moderate": "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  "mittel": "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  "poor": "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  "problematisch": "text-red-600 bg-red-100 dark:bg-red-900/30",
  "cracked": "text-red-600 bg-red-100 dark:bg-red-900/30",
  "schlecht": "text-red-600 bg-red-100 dark:bg-red-900/30",
};

export function HorseHoofDetailTab({ horseId, horseName, hoofDetails, onUpdate }: HorseHoofDetailTabProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editedDetails, setEditedDetails] = useState<HoofDetails | null>(hoofDetails);
  const [saving, setSaving] = useState(false);

  const getHoofData = (position: HoofPosition) => {
    if (!hoofDetails) return null;
    return hoofDetails[position] || null;
  };

  const hasIssues = (position: HoofPosition) => {
    const data = getHoofData(position);
    if (!data) return false;
    const issues = data.issues || [];
    return issues.length > 0;
  };

  const getConditionClass = (condition: string | undefined) => {
    if (!condition) return "text-muted-foreground bg-muted";
    const normalized = condition.toLowerCase();
    for (const [key, value] of Object.entries(CONDITION_COLORS)) {
      if (normalized.includes(key) || key === normalized) return value;
    }
    return "text-muted-foreground bg-muted";
  };

  const handleSave = async () => {
    if (!editedDetails) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("horses")
        .update({ hoof_details: JSON.parse(JSON.stringify(editedDetails)) as Json })
        .eq("id", horseId);
      
      if (error) throw error;
      toast.success("Huf-Details gespeichert");
      setShowEditor(false);
      onUpdate();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Huf-Status im Detail</h3>
          <p className="text-sm text-muted-foreground">
            Dokumentiere Zustand, Stellung und Besonderheiten aller 4 Hufe
          </p>
        </div>
        <Button onClick={() => setShowEditor(true)} className="gap-2">
          <Edit className="h-4 w-4" />
          Huf-Analyse bearbeiten
        </Button>
      </div>

      {/* 4 Hoof Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HOOF_POSITIONS.map(({ key, label, labelFull }) => {
          const data = getHoofData(key);
          const issues = data?.issues || [];
          const hasProblems = issues.length > 0;

          return (
            <Card 
              key={key} 
              className={`transition-all ${hasProblems ? 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10' : ''}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      hasProblems ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-primary/10'
                    }`}>
                      <Footprints className={`h-5 w-5 ${hasProblems ? 'text-amber-600' : 'text-primary'}`} />
                    </div>
                    <div>
                      <span className="text-lg font-bold">{label}</span>
                      <span className="text-sm text-muted-foreground ml-2">{labelFull}</span>
                    </div>
                  </div>
                  {hasProblems ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : data ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data ? (
                  <>
                    {/* Zustand */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Zustand:</span>
                      <Badge className={getConditionClass(data.condition)}>
                        {data.condition || "Nicht bewertet"}
                      </Badge>
                    </div>

                    {/* Stellung */}
                    {data.stance && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stellung:</span>
                        <span className="text-sm font-medium">{data.stance}</span>
                      </div>
                    )}

                    {/* Größe */}
                    {data.size && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Größe:</span>
                        <span className="text-sm font-medium">{data.size} mm</span>
                      </div>
                    )}

                    {/* Besonderheiten/Issues */}
                    {issues.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Besonderheiten:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {issues.map((issue, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                            >
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Keine Daten erfasst</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowEditor(true)}
                    >
                      Jetzt erfassen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hoof Editor Modal */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Huf-Details bearbeiten - {horseName}</DialogTitle>
            <DialogDescription>
              Erfasse den detaillierten Status aller vier Hufe
            </DialogDescription>
          </DialogHeader>
          <HoofDetailsEditor 
            value={editedDetails}
            onChange={setEditedDetails}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}