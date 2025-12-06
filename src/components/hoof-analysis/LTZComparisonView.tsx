import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, ArrowRight, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { 
  LTZHoofData,
  HOOF_POSITIONS,
  STANCE_OPTIONS,
  TOE_AXIS_OPTIONS,
  LANDING_THEORY_OPTIONS,
  HORN_QUALITY_OPTIONS,
  CORONET_THEORY_OPTIONS
} from "./ltz-constants";

interface LTZComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
}

interface HoofAnalysis {
  id: string;
  created_at: string;
  stance_front: string | null;
  stance_rear: string | null;
  hoof_data_vl: LTZHoofData | null;
  hoof_data_vr: LTZHoofData | null;
  hoof_data_hl: LTZHoofData | null;
  hoof_data_hr: LTZHoofData | null;
  recommendations: string[] | null;
}

function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find(o => o.value === value)?.label || '—';
}

function getChangeIndicator(oldValue?: string, newValue?: string) {
  if (!oldValue && !newValue) return null;
  if (oldValue === newValue) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (!oldValue && newValue) return <ArrowUp className="h-3 w-3 text-amber-500" />;
  if (oldValue && !newValue) return <ArrowDown className="h-3 w-3 text-amber-500" />;
  return <ArrowRight className="h-3 w-3 text-primary" />;
}

export function LTZComparisonView({ isOpen, onClose, horseId, horseName }: LTZComparisonViewProps) {
  const [leftAnalysisId, setLeftAnalysisId] = useState<string>('');
  const [rightAnalysisId, setRightAnalysisId] = useState<string>('');

  const { data: analyses = [] } = useQuery({
    queryKey: ["hoof-analyses-comparison", horseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hoof_analyses")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HoofAnalysis[];
    },
    enabled: isOpen,
  });

  const leftAnalysis = analyses.find(a => a.id === leftAnalysisId);
  const rightAnalysis = analyses.find(a => a.id === rightAnalysisId);

  // Auto-select first two analyses
  if (analyses.length >= 2 && !leftAnalysisId && !rightAnalysisId) {
    setLeftAnalysisId(analyses[1].id); // Older
    setRightAnalysisId(analyses[0].id); // Newer
  }

  const renderHoofComparison = (hoofKey: string, hoofLabel: string) => {
    const leftData = leftAnalysis?.[`hoof_data_${hoofKey}` as keyof HoofAnalysis] as LTZHoofData | null;
    const rightData = rightAnalysis?.[`hoof_data_${hoofKey}` as keyof HoofAnalysis] as LTZHoofData | null;

    return (
      <div key={hoofKey} className="border rounded-lg p-3">
        <h4 className="font-medium text-sm mb-2">{hoofLabel}</h4>
        <div className="space-y-1 text-xs">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <span className={leftData?.toeAxis === 'straight' ? 'text-green-500' : leftData?.toeAxis ? 'text-amber-500' : 'text-muted-foreground'}>
              {getLabel(TOE_AXIS_OPTIONS, leftData?.toeAxis)}
            </span>
            <div className="flex items-center justify-center">
              {getChangeIndicator(leftData?.toeAxis, rightData?.toeAxis)}
            </div>
            <span className={rightData?.toeAxis === 'straight' ? 'text-green-500' : rightData?.toeAxis ? 'text-amber-500' : 'text-muted-foreground'}>
              {getLabel(TOE_AXIS_OPTIONS, rightData?.toeAxis)}
            </span>
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-muted-foreground">
            <span>{getLabel(LANDING_THEORY_OPTIONS, leftData?.landingTheory)}</span>
            <div className="flex items-center justify-center">
              {getChangeIndicator(leftData?.landingTheory, rightData?.landingTheory)}
            </div>
            <span>{getLabel(LANDING_THEORY_OPTIONS, rightData?.landingTheory)}</span>
          </div>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-muted-foreground">
            <span>{getLabel(HORN_QUALITY_OPTIONS, leftData?.hornQuality)}</span>
            <div className="flex items-center justify-center">
              {getChangeIndicator(leftData?.hornQuality, rightData?.hornQuality)}
            </div>
            <span>{getLabel(HORN_QUALITY_OPTIONS, rightData?.hornQuality)}</span>
          </div>
        </div>
        
        {/* Photos comparison */}
        {(leftData?.photoUrl || rightData?.photoUrl) && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {leftData?.photoUrl ? (
              <img src={leftData.photoUrl} alt={`${hoofLabel} alt`} className="w-full h-16 object-cover rounded" />
            ) : (
              <div className="w-full h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
            )}
            {rightData?.photoUrl ? (
              <img src={rightData.photoUrl} alt={`${hoofLabel} neu`} className="w-full h-16 object-cover rounded" />
            ) : (
              <div className="w-full h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            LTZ-Analyse Vergleich: {horseName}
          </DialogTitle>
        </DialogHeader>

        {analyses.length < 2 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Mindestens 2 Analysen erforderlich für einen Vergleich.</p>
            <p className="text-sm mt-1">Aktuell: {analyses.length} Analyse(n)</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Analysis Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Ältere Analyse</label>
                <Select value={leftAnalysisId} onValueChange={setLeftAnalysisId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Analyse wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {analyses.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === rightAnalysisId}>
                        {format(parseISO(a.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Neuere Analyse</label>
                <Select value={rightAnalysisId} onValueChange={setRightAnalysisId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Analyse wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {analyses.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === leftAnalysisId}>
                        {format(parseISO(a.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {leftAnalysis && rightAnalysis && (
              <>
                {/* Date Headers */}
                <div className="grid grid-cols-2 gap-4">
                  <Badge variant="outline" className="justify-center py-2">
                    {format(parseISO(leftAnalysis.created_at), "dd. MMMM yyyy", { locale: de })}
                  </Badge>
                  <Badge variant="secondary" className="justify-center py-2">
                    {format(parseISO(rightAnalysis.created_at), "dd. MMMM yyyy", { locale: de })}
                  </Badge>
                </div>

                {/* Stance Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Stellung</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vorne:</span> {getLabel(STANCE_OPTIONS, leftAnalysis.stance_front || undefined)}
                      <br />
                      <span className="text-muted-foreground">Hinten:</span> {getLabel(STANCE_OPTIONS, leftAnalysis.stance_rear || undefined)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vorne:</span> {getLabel(STANCE_OPTIONS, rightAnalysis.stance_front || undefined)}
                      <br />
                      <span className="text-muted-foreground">Hinten:</span> {getLabel(STANCE_OPTIONS, rightAnalysis.stance_rear || undefined)}
                    </div>
                  </CardContent>
                </Card>

                {/* Hoof Comparisons */}
                <div className="grid grid-cols-2 gap-3">
                  {HOOF_POSITIONS.map((hoof) => renderHoofComparison(hoof.key, hoof.fullLabel))}
                </div>

                {/* Recommendations Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Empfehlungen</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      {leftAnalysis.recommendations?.length ? (
                        leftAnalysis.recommendations.map((r, i) => (
                          <p key={i} className="text-xs text-amber-500">• {r}</p>
                        ))
                      ) : (
                        <p className="text-xs text-green-500">Keine Auffälligkeiten</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {rightAnalysis.recommendations?.length ? (
                        rightAnalysis.recommendations.map((r, i) => (
                          <p key={i} className="text-xs text-amber-500">• {r}</p>
                        ))
                      ) : (
                        <p className="text-xs text-green-500">Keine Auffälligkeiten</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
