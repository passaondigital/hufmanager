import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Eye } from "lucide-react";
import { 
  STANCE_OPTIONS, 
  CROUP_MOVEMENT_OPTIONS, 
  BELLY_SWING_OPTIONS, 
  FOOTFALL_OPTIONS,
  LTZAnalysisData 
} from "./ltz-constants";

interface LTZStepGaitProps {
  data: LTZAnalysisData;
  onChange: (data: Partial<LTZAnalysisData>) => void;
}

export function LTZStepGait({ data, onChange }: LTZStepGaitProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Schritt 1: Vor dem Anfassen</span>
        </div>
      </div>

      {/* Stellung */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Gliedmaßenstellung
          </CardTitle>
          <CardDescription>Beurteilung im Stand von vorne und hinten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vordergliedmaße */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Vordergliedmaße</Label>
              <RadioGroup
                value={data.stanceFront || ''}
                onValueChange={(value) => onChange({ stanceFront: value })}
                className="space-y-2"
              >
                {STANCE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`front-${option.value}`} />
                    <Label htmlFor={`front-${option.value}`} className="cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Hintergliedmaße */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Hintergliedmaße</Label>
              <RadioGroup
                value={data.stanceRear || ''}
                onValueChange={(value) => onChange({ stanceRear: value })}
                className="space-y-2"
              >
                {STANCE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`rear-${option.value}`} />
                    <Label htmlFor={`rear-${option.value}`} className="cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bewegung */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bewegungsanalyse</CardTitle>
          <CardDescription>Beurteilung in der Bewegung (Trab)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kruppe */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Bewegung Kruppe</Label>
            <RadioGroup
              value={data.croupMovement || ''}
              onValueChange={(value) => onChange({ croupMovement: value })}
              className="flex flex-wrap gap-4"
            >
              {CROUP_MOVEMENT_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`croup-${option.value}`} />
                  <Label htmlFor={`croup-${option.value}`} className="cursor-pointer text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Bauchpendel */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Bauchpendel</Label>
            <RadioGroup
              value={data.bellySwing || ''}
              onValueChange={(value) => onChange({ bellySwing: value })}
              className="flex flex-wrap gap-4"
            >
              {BELLY_SWING_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`belly-${option.value}`} />
                  <Label htmlFor={`belly-${option.value}`} className="cursor-pointer text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Fußung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fußung Links</Label>
              <RadioGroup
                value={data.footfallLeft || ''}
                onValueChange={(value) => onChange({ footfallLeft: value })}
                className="space-y-2"
              >
                {FOOTFALL_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`footfall-left-${option.value}`} />
                    <Label htmlFor={`footfall-left-${option.value}`} className="cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Fußung Rechts</Label>
              <RadioGroup
                value={data.footfallRight || ''}
                onValueChange={(value) => onChange({ footfallRight: value })}
                className="space-y-2"
              >
                {FOOTFALL_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`footfall-right-${option.value}`} />
                    <Label htmlFor={`footfall-right-${option.value}`} className="cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
