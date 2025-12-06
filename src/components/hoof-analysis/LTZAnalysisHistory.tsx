import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { 
  STANCE_OPTIONS,
  TOE_AXIS_OPTIONS,
  HORN_QUALITY_OPTIONS,
  HOOF_POSITIONS,
  LTZHoofData
} from "./ltz-constants";
import { LTZPdfExport } from "./LTZPdfExport";

interface LTZAnalysisHistoryProps {
  horseId: string;
  horseName: string;
  ownerName?: string;
}

interface HoofAnalysis {
  id: string;
  created_at: string;
  stance_front: string | null;
  stance_rear: string | null;
  croup_movement: string | null;
  belly_swing: string | null;
  footfall_left: string | null;
  footfall_right: string | null;
  hoof_data_vl: LTZHoofData | null;
  hoof_data_vr: LTZHoofData | null;
  hoof_data_hl: LTZHoofData | null;
  hoof_data_hr: LTZHoofData | null;
  notes: string | null;
  recommendations: string[] | null;
  status: string | null;
}

function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find(o => o.value === value)?.label || '—';
}

export function LTZAnalysisHistory({ horseId, horseName, ownerName }: LTZAnalysisHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["hoof-analyses", horseId],
    queryFn: async () => {
      // Using 'any' cast because the types haven't been regenerated yet after migration
      const { data, error } = await (supabase as any)
        .from("hoof_analyses")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HoofAnalysis[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Lade Analysen...
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          LTZ-Analysen Historie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyses.map((analysis) => {
          const hoofDataMap = {
            vl: (analysis.hoof_data_vl || {}) as LTZHoofData,
            vr: (analysis.hoof_data_vr || {}) as LTZHoofData,
            hl: (analysis.hoof_data_hl || {}) as LTZHoofData,
            hr: (analysis.hoof_data_hr || {}) as LTZHoofData,
          };

          return (
            <Collapsible 
              key={analysis.id}
              open={expandedId === analysis.id}
              onOpenChange={(open) => setExpandedId(open ? analysis.id : null)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {format(parseISO(analysis.created_at), "dd.MM.yyyy", { locale: de })}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {(analysis.recommendations?.length || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="h-3 w-3" />
                          {analysis.recommendations?.length} Empfehlungen
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Keine Auffälligkeiten
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LTZPdfExport 
                      analysis={analysis} 
                      horseName={horseName}
                      ownerName={ownerName}
                    />
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === analysis.id ? 'rotate-180' : ''}`} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="space-y-4 pt-2 border-t">
                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="bg-amber-500/10 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-500 mb-2">Bearbeitungsempfehlungen:</p>
                      <ul className="space-y-1">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Overview */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Stellung vorne:</span>
                      <span className="ml-1 font-medium">{getLabel(STANCE_OPTIONS, analysis.stance_front || undefined)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stellung hinten:</span>
                      <span className="ml-1 font-medium">{getLabel(STANCE_OPTIONS, analysis.stance_rear || undefined)}</span>
                    </div>
                  </div>

                  {/* Hoof Summary Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Huf</th>
                          <th className="text-center py-1 px-2 font-medium text-muted-foreground">Zehenachse</th>
                          <th className="text-center py-1 px-2 font-medium text-muted-foreground">Horn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {HOOF_POSITIONS.map((hoof) => (
                          <tr key={hoof.key} className="border-b last:border-0">
                            <td className="py-1 pr-2 font-medium">{hoof.label}</td>
                            <td className="text-center py-1 px-2">
                              <Badge variant={
                                hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis === 'straight' 
                                  ? 'outline' 
                                  : hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis 
                                    ? 'destructive' 
                                    : 'secondary'
                              } className="text-[10px]">
                                {getLabel(TOE_AXIS_OPTIONS, hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis)}
                              </Badge>
                            </td>
                            <td className="text-center py-1 px-2">
                              <Badge variant={
                                hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality === 'normal' 
                                  ? 'outline' 
                                  : hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality 
                                    ? 'destructive' 
                                    : 'secondary'
                              } className="text-[10px]">
                                {getLabel(HORN_QUALITY_OPTIONS, hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes */}
                  {analysis.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      {analysis.notes}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
