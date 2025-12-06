import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { LTZStepGait } from "./LTZStepGait";
import { LTZStepHoofForm } from "./LTZStepHoofForm";
import { LTZStepSummary } from "./LTZStepSummary";
import { LTZAnalysisData, LTZHoofData } from "./ltz-constants";

interface LTZAnalysisWizardProps {
  isOpen: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  appointmentId?: string;
}

const STEPS = [
  { id: 1, title: "Gangbild & Stellung" },
  { id: 2, title: "Hufvermessung" },
  { id: 3, title: "Zusammenfassung" },
];

const emptyHoofData: LTZHoofData = {};

export function LTZAnalysisWizard({ 
  isOpen, 
  onClose, 
  horseId, 
  horseName,
  appointmentId 
}: LTZAnalysisWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [data, setData] = useState<LTZAnalysisData>({
    hoofDataVl: { ...emptyHoofData },
    hoofDataVr: { ...emptyHoofData },
    hoofDataHl: { ...emptyHoofData },
    hoofDataHr: { ...emptyHoofData },
    recommendations: [],
  });

  const updateData = (updates: Partial<LTZAnalysisData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const saveAnalysis = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nicht eingeloggt");

      // Using 'any' cast because the types haven't been regenerated yet after migration
      const { error } = await (supabase as any)
        .from("hoof_analyses")
        .insert({
          horse_id: horseId,
          provider_id: user.id,
          appointment_id: appointmentId || null,
          stance_front: data.stanceFront,
          stance_rear: data.stanceRear,
          croup_movement: data.croupMovement,
          belly_swing: data.bellySwing,
          footfall_left: data.footfallLeft,
          footfall_right: data.footfallRight,
          hoof_data_vl: data.hoofDataVl,
          hoof_data_vr: data.hoofDataVr,
          hoof_data_hl: data.hoofDataHl,
          hoof_data_hr: data.hoofDataHr,
          notes: data.notes,
          recommendations: data.recommendations,
          status: 'completed',
        });

      if (error) throw error;

      // Update horse's last anamnesis date
      await supabase
        .from("horses")
        .update({ last_anamnesis_date: new Date().toISOString() })
        .eq("id", horseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoof-analyses", horseId] });
      queryClient.invalidateQueries({ queryKey: ["horse", horseId] });
      queryClient.invalidateQueries({ queryKey: ["overdue-assessments"] });
      toast({
        title: "Analyse gespeichert",
        description: `LTZ-Hufanalyse für ${horseName} wurde erfolgreich gespeichert.`,
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Error saving analysis:", error);
      toast({
        title: "Fehler",
        description: "Die Analyse konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setCurrentStep(1);
    setData({
      hoofDataVl: { ...emptyHoofData },
      hoofDataVr: { ...emptyHoofData },
      hoofDataHl: { ...emptyHoofData },
      hoofDataHr: { ...emptyHoofData },
      recommendations: [],
    });
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    saveAnalysis.mutate();
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>LTZ-Hufanalyse: {horseName}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Schritt {currentStep} von {STEPS.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step) => (
              <span 
                key={step.id}
                className={currentStep >= step.id ? 'text-primary font-medium' : ''}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-4">
          {currentStep === 1 && (
            <LTZStepGait data={data} onChange={updateData} />
          )}
          {currentStep === 2 && (
            <LTZStepHoofForm data={data} onChange={updateData} horseId={horseId} />
          )}
          {currentStep === 3 && (
            <LTZStepSummary data={data} onChange={updateData} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSave}
              disabled={saveAnalysis.isPending}
              className="bg-primary"
            >
              {saveAnalysis.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Analyse speichern
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
