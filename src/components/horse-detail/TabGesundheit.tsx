import { useState } from "react";
import { Horse, HEALTH_STATUS_OPTIONS, HOOF_PROTECTION_OPTIONS, HoofMeasurements } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Heart, Shield, Ruler, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnamnesisStatusCard } from "./AnamnesisStatusCard";
import { AnamnesisComparisonView } from "./AnamnesisComparisonView";
import { LTZAnalysisWizard, LTZAnalysisHistory } from "@/components/hoof-analysis";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface TabGesundheitProps {
  horse: Horse;
  onEdit: () => void;
}

export function TabGesundheit({ horse, onEdit }: TabGesundheitProps) {
  const queryClient = useQueryClient();
  const [showLTZWizard, setShowLTZWizard] = useState(false);
  
  const healthStatus = HEALTH_STATUS_OPTIONS.find(s => s.value === horse.health_status) 
    || HEALTH_STATUS_OPTIONS[0];
  const hoofProtection = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection)
    || HOOF_PROTECTION_OPTIONS[0];
  
  const measurements = (horse.hoof_measurements || {}) as HoofMeasurements;

  const handleStartAnamnesis = async () => {
    // Update the last_anamnesis_date when starting a new anamnesis
    const { error } = await supabase
      .from("horses")
      .update({ last_anamnesis_date: new Date().toISOString() })
      .eq("id", horse.id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Konnte die Aufnahme nicht starten.",
        variant: "destructive",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["horse"] });
    queryClient.invalidateQueries({ queryKey: ["overdue-assessments"] });
    
    toast({
      title: "Aufnahme gestartet",
      description: "Die Bestandsaufnahme wurde gestartet. Dokumentiere jetzt den aktuellen Zustand.",
    });
    
    // Switch to edit mode
    onEdit();
  };

  return (
    <div className="space-y-4">
      {/* LTZ Analysis Wizard */}
      <LTZAnalysisWizard
        isOpen={showLTZWizard}
        onClose={() => setShowLTZWizard(false)}
        horseId={horse.id}
        horseName={horse.name}
      />

      {/* Anamnesis Status Card */}
      <AnamnesisStatusCard
        horseId={horse.id}
        horseName={horse.name}
        lastAnamnesisDate={horse.last_anamnesis_date}
        intervalMonths={horse.anamnesis_interval_months}
        onStartAnamnesis={() => setShowLTZWizard(true)}
      />

      {/* LTZ Analysis History */}
      <LTZAnalysisHistory horseId={horse.id} />

      {/* Comparison View */}
      <AnamnesisComparisonView horseId={horse.id} />

      {/* Health Status */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Gesundheitsstatus
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded-full",
              healthStatus.value === 'healthy' && "bg-green-500",
              healthStatus.value === 'acute' && "bg-red-500",
              healthStatus.value === 'chronic' && "bg-amber-500",
              healthStatus.value === 'rehab' && "bg-blue-500"
            )} />
            <span className={cn("font-medium", healthStatus.color)}>
              {healthStatus.label}
            </span>
          </div>
          
          {horse.medical_history && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Anamnese / Vorgeschichte</span>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                {horse.medical_history}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hoof Protection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Hufschutz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{hoofProtection.icon}</span>
            <span className="font-medium text-foreground">{hoofProtection.label}</span>
          </div>
          
          {horse.shoeing_interval && (
            <div className="text-sm text-muted-foreground">
              Bearbeitungsintervall: <span className="font-medium text-foreground">{horse.shoeing_interval} Wochen</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hoof Measurements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            Hufmaße
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <MeasurementBox label="Vorne Links" value={measurements.vl} />
            <MeasurementBox label="Vorne Rechts" value={measurements.vr} />
            <MeasurementBox label="Hinten Links" value={measurements.hl} />
            <MeasurementBox label="Hinten Rechts" value={measurements.hr} />
          </div>
        </CardContent>
      </Card>

      {/* Special Notes for Farrier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Besonderheiten bei der Bearbeitung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {horse.special_notes ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {horse.special_notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Keine besonderen Hinweise eingetragen
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeasurementBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg text-center">
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className="font-mono font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}
