import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, CheckCircle2 } from "lucide-react";
import { HOOF_POSITIONS, LTZAnalysisData, LTZHoofData } from "./ltz-constants";
import { LTZHoofDetailForm } from "./LTZHoofDetailForm";

interface LTZStepHoofFormProps {
  data: LTZAnalysisData;
  onChange: (data: Partial<LTZAnalysisData>) => void;
  horseId: string;
}

function isHoofComplete(hoofData: LTZHoofData): boolean {
  return !!(
    hoofData.toeAxis &&
    hoofData.pasternAngle &&
    hoofData.coronetTheory &&
    hoofData.soleFrogPlane &&
    hoofData.landingTheory &&
    hoofData.hornQuality
  );
}

export function LTZStepHoofForm({ data, onChange, horseId }: LTZStepHoofFormProps) {
  const [activeHoof, setActiveHoof] = useState('vl');

  const hoofDataMap: Record<string, { data: LTZHoofData; key: keyof LTZAnalysisData }> = {
    vl: { data: data.hoofDataVl, key: 'hoofDataVl' },
    vr: { data: data.hoofDataVr, key: 'hoofDataVr' },
    hl: { data: data.hoofDataHl, key: 'hoofDataHl' },
    hr: { data: data.hoofDataHr, key: 'hoofDataHr' },
  };

  const handleHoofChange = (hoofKey: string, hoofData: LTZHoofData) => {
    const dataKey = hoofDataMap[hoofKey].key;
    onChange({ [dataKey]: hoofData });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary">
          <Ruler className="h-4 w-4" />
          <span className="text-sm font-medium">Schritt 2: LTZ-Hufvermessung</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hufanalyse nach LTZ-Standard</CardTitle>
          <CardDescription>
            Wähle jeden Huf einzeln aus und erfasse die Parameter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeHoof} onValueChange={setActiveHoof}>
            <TabsList className="grid grid-cols-4 w-full mb-6">
              {HOOF_POSITIONS.map((hoof) => {
                const isComplete = isHoofComplete(hoofDataMap[hoof.key].data);
                return (
                  <TabsTrigger 
                    key={hoof.key} 
                    value={hoof.key}
                    className="relative"
                  >
                    <span className="flex items-center gap-1">
                      {hoof.label}
                      {isComplete && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {HOOF_POSITIONS.map((hoof) => (
              <TabsContent key={hoof.key} value={hoof.key} className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-foreground">{hoof.fullLabel}</h4>
                  {isHoofComplete(hoofDataMap[hoof.key].data) ? (
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Vollständig
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Unvollständig
                    </Badge>
                  )}
                </div>
                <LTZHoofDetailForm
                  hoofKey={hoof.key}
                  hoofLabel={hoof.fullLabel}
                  data={hoofDataMap[hoof.key].data}
                  onChange={(newData) => handleHoofChange(hoof.key, newData)}
                  horseId={horseId}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Visual completion indicator */}
      <div className="grid grid-cols-2 gap-2">
        {HOOF_POSITIONS.map((hoof) => {
          const isComplete = isHoofComplete(hoofDataMap[hoof.key].data);
          return (
            <button
              key={hoof.key}
              onClick={() => setActiveHoof(hoof.key)}
              className={`p-3 rounded-lg border-2 transition-all ${
                activeHoof === hoof.key 
                  ? 'border-primary bg-primary/5' 
                  : isComplete 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <div className="text-center">
                <span className={`text-sm font-medium ${
                  isComplete ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  {hoof.fullLabel}
                </span>
                {isComplete && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mt-1" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
