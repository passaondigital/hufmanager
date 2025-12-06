import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PASTERN_ANGLE_OPTIONS,
  CORONET_THEORY_OPTIONS,
  SOLE_FROG_PLANE_OPTIONS,
  LANDING_THEORY_OPTIONS,
  HORN_QUALITY_OPTIONS,
  TOE_AXIS_OPTIONS,
  LTZHoofData 
} from "./ltz-constants";
import { LTZHoofPhotoCapture } from "./LTZHoofPhotoCapture";

interface LTZHoofDetailFormProps {
  hoofKey: string;
  hoofLabel: string;
  data: LTZHoofData;
  onChange: (data: LTZHoofData) => void;
  horseId: string;
}

export function LTZHoofDetailForm({ hoofKey, hoofLabel, data, onChange, horseId }: LTZHoofDetailFormProps) {
  const updateField = (field: keyof LTZHoofData, value: string | undefined) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Photo Capture */}
      <LTZHoofPhotoCapture
        hoofKey={hoofKey}
        hoofLabel={hoofLabel}
        photoUrl={data.photoUrl}
        onPhotoChange={(url) => updateField('photoUrl', url)}
        horseId={horseId}
      />

      {/* Zehenachse - Most important */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Zehenachse</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.toeAxis || ''}
            onValueChange={(value) => updateField('toeAxis', value)}
            className="space-y-2"
          >
            {TOE_AXIS_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${hoofKey}-axis-${option.value}`} />
                <Label htmlFor={`${hoofKey}-axis-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Fesselstand */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Fesselstand (1/3 zu 2/3)</Label>
        <RadioGroup
          value={data.pasternAngle || ''}
          onValueChange={(value) => updateField('pasternAngle', value)}
          className="flex gap-4"
        >
          {PASTERN_ANGLE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${hoofKey}-pastern-${option.value}`} />
              <Label htmlFor={`${hoofKey}-pastern-${option.value}`} className="cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Kronrandtheorie */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Kronrandtheorie (Wo höher?)</Label>
        <RadioGroup
          value={data.coronetTheory || ''}
          onValueChange={(value) => updateField('coronetTheory', value)}
          className="flex flex-wrap gap-3"
        >
          {CORONET_THEORY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${hoofKey}-coronet-${option.value}`} />
              <Label htmlFor={`${hoofKey}-coronet-${option.value}`} className="cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sohle-Strahl-Ebene */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sohle-Strahl-Ebene (Tragrand höher?)</Label>
        <RadioGroup
          value={data.soleFrogPlane || ''}
          onValueChange={(value) => updateField('soleFrogPlane', value)}
          className="flex flex-wrap gap-3"
        >
          {SOLE_FROG_PLANE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${hoofKey}-sole-${option.value}`} />
              <Label htmlFor={`${hoofKey}-sole-${option.value}`} className="cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Fußungstheorie */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Fußungstheorie (Fußt auf)</Label>
        <RadioGroup
          value={data.landingTheory || ''}
          onValueChange={(value) => updateField('landingTheory', value)}
          className="flex flex-wrap gap-3"
        >
          {LANDING_THEORY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${hoofKey}-landing-${option.value}`} />
              <Label htmlFor={`${hoofKey}-landing-${option.value}`} className="cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Hornqualität */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hornqualität</Label>
        <RadioGroup
          value={data.hornQuality || ''}
          onValueChange={(value) => updateField('hornQuality', value)}
          className="flex flex-wrap gap-3"
        >
          {HORN_QUALITY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${hoofKey}-horn-${option.value}`} />
              <Label htmlFor={`${hoofKey}-horn-${option.value}`} className="cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Notizen */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Notizen {hoofLabel}</Label>
        <Textarea
          placeholder={`Besonderheiten für ${hoofLabel}...`}
          value={data.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}
