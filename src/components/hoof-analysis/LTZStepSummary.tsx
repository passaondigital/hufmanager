import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";
import { 
  LTZAnalysisData, 
  generateRecommendations,
  STANCE_OPTIONS,
  CROUP_MOVEMENT_OPTIONS,
  BELLY_SWING_OPTIONS,
  FOOTFALL_OPTIONS,
  TOE_AXIS_OPTIONS,
  LANDING_THEORY_OPTIONS,
  HORN_QUALITY_OPTIONS,
  HOOF_POSITIONS
} from "./ltz-constants";
import { useEffect } from "react";

interface LTZStepSummaryProps {
  data: LTZAnalysisData;
  onChange: (data: Partial<LTZAnalysisData>) => void;
}

function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find(o => o.value === value)?.label || '—';
}

export function LTZStepSummary({ data, onChange }: LTZStepSummaryProps) {
  // Auto-generate recommendations when data changes
  useEffect(() => {
    const recommendations = generateRecommendations(data);
    if (JSON.stringify(recommendations) !== JSON.stringify(data.recommendations)) {
      onChange({ recommendations });
    }
  }, [data.hoofDataVl, data.hoofDataVr, data.hoofDataHl, data.hoofDataHr, 
      data.stanceFront, data.stanceRear, data.croupMovement]);

  const hoofDataMap = {
    vl: data.hoofDataVl,
    vr: data.hoofDataVr,
    hl: data.hoofDataHl,
    hr: data.hoofDataHr,
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">Schritt 3: Zusammenfassung & Empfehlung</span>
        </div>
      </div>

      {/* Recommendations */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Bearbeitungsempfehlung
          </CardTitle>
          <CardDescription>
            Automatisch generiert basierend auf Ihrer Analyse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Keine Auffälligkeiten - Standardbearbeitung empfohlen</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exterieur Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exterieur & Gangbild</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Vordergliedmaße:</span>
              <span className="ml-2 font-medium">{getLabel(STANCE_OPTIONS, data.stanceFront)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Hintergliedmaße:</span>
              <span className="ml-2 font-medium">{getLabel(STANCE_OPTIONS, data.stanceRear)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Kruppe:</span>
              <span className="ml-2 font-medium">{getLabel(CROUP_MOVEMENT_OPTIONS, data.croupMovement)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Bauchpendel:</span>
              <span className="ml-2 font-medium">{getLabel(BELLY_SWING_OPTIONS, data.bellySwing)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fußung Links:</span>
              <span className="ml-2 font-medium">{getLabel(FOOTFALL_OPTIONS, data.footfallLeft)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fußung Rechts:</span>
              <span className="ml-2 font-medium">{getLabel(FOOTFALL_OPTIONS, data.footfallRight)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hoof Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hufbefunde (LTZ-Tabelle)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Parameter</th>
                {HOOF_POSITIONS.map((hoof) => (
                  <th key={hoof.key} className="text-center py-2 px-2 font-medium text-muted-foreground">
                    {hoof.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 text-muted-foreground">Zehenachse</td>
                {HOOF_POSITIONS.map((hoof) => (
                  <td key={hoof.key} className="text-center py-2 px-2">
                    <Badge variant={
                      hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis === 'straight' 
                        ? 'outline' 
                        : hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis 
                          ? 'destructive' 
                          : 'secondary'
                    } className="text-xs">
                      {getLabel(TOE_AXIS_OPTIONS, hoofDataMap[hoof.key as keyof typeof hoofDataMap].toeAxis)}
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 text-muted-foreground">Fußung auf</td>
                {HOOF_POSITIONS.map((hoof) => (
                  <td key={hoof.key} className="text-center py-2 px-2">
                    <span className="text-xs">
                      {getLabel(LANDING_THEORY_OPTIONS, hoofDataMap[hoof.key as keyof typeof hoofDataMap].landingTheory)}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">Hornqualität</td>
                {HOOF_POSITIONS.map((hoof) => (
                  <td key={hoof.key} className="text-center py-2 px-2">
                    <Badge variant={
                      hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality === 'normal' 
                        ? 'outline' 
                        : hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality 
                          ? 'destructive' 
                          : 'secondary'
                    } className="text-xs">
                      {getLabel(HORN_QUALITY_OPTIONS, hoofDataMap[hoof.key as keyof typeof hoofDataMap].hornQuality)}
                    </Badge>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Zusätzliche Bemerkungen</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="sr-only">Notizen</Label>
          <Textarea
            placeholder="Weitere Beobachtungen, Empfehlungen an den Besitzer, Folgetermin-Hinweise..."
            value={data.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
