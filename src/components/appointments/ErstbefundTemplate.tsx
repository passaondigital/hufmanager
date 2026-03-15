import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ClipboardList, Stethoscope, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErstbefundTemplateProps {
  horseName: string;
  onSubmit: (data: ErstbefundData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export interface ErstbefundData {
  intake: IntakeData;
  hoofAssessments: Record<string, HoofAssessment>;
  photos: Record<string, string | null>;
  plan: PlanData;
}

interface IntakeData {
  ownershipDuration: string;
  previousFarrier: string;
  trimmingInterval: string;
  currentHoofProtection: string[];
  knownConditions: string[];
  lamenessHistory: string;
  xraysAvailable: boolean;
}

interface HoofAssessment {
  toeLength: string;
  hoofAngle: string;
  heelHeight: string;
  frogQuality: string;
  wallQuality: string;
  sole: string;
  stance: string;
  notes: string;
}

interface PlanData {
  overallAssessment: string;
  recommendedInterval: string;
  ownerRecommendation: string;
  referrals: string[];
}

const HOOVES = [
  { key: "VL", label: "Vorne Links" },
  { key: "VR", label: "Vorne Rechts" },
  { key: "HL", label: "Hinten Links" },
  { key: "HR", label: "Hinten Rechts" },
];

const PHOTO_POSITIONS = [
  "VL seitlich", "VR seitlich", "HL seitlich", "HR seitlich",
  "VL Sohle", "VR Sohle", "HL Sohle", "HR Sohle",
  "Ganzkörper vorne", "Ganzkörper hinten",
];

const CHIP_OPTIONS = {
  hoofProtection: ["Barhuf", "Eisen", "Kunststoff", "Klebebeschlag", "Hufschuhe"],
  conditions: ["Hufrehe", "Hufgeschwür", "Hufrollenentzündung", "Sehnenproblem", "Stellungsfehler", "Keine"],
  lameness: ["Aktuell lahm", "War mal lahm", "Nie lahm"],
  frogQuality: ["gesund", "weich", "Strahlfäule", "rissig"],
  wallQuality: ["gut", "brüchig", "rissig", "Ringe"],
  sole: ["fest", "dünn", "konkav", "flach"],
  stance: ["gerade", "zeheneng", "zehenweit", "bodeneng", "bodenweit"],
  referrals: ["Tierarzt", "Osteopath", "Physiotherapeut", "Sattler", "Zahnarzt", "Keine"],
};

function ChipSelect({ options, selected, onChange, multi = true }: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <Badge
            key={opt}
            variant={isSelected ? "default" : "outline"}
            className={cn("cursor-pointer transition-colors text-xs", isSelected && "bg-primary text-primary-foreground")}
            onClick={() => {
              if (multi) {
                onChange(isSelected ? selected.filter((s) => s !== opt) : [...selected, opt]);
              } else {
                onChange([opt]);
              }
            }}
          >
            {opt}
          </Badge>
        );
      })}
    </div>
  );
}

const emptyHoof = (): HoofAssessment => ({
  toeLength: "", hoofAngle: "", heelHeight: "",
  frogQuality: "", wallQuality: "", sole: "", stance: "", notes: "",
});

export function ErstbefundTemplate({ horseName, onSubmit, onCancel, isSubmitting }: ErstbefundTemplateProps) {
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<IntakeData>({
    ownershipDuration: "", previousFarrier: "", trimmingInterval: "",
    currentHoofProtection: [], knownConditions: [], lamenessHistory: "", xraysAvailable: false,
  });
  const [hoofAssessments, setHoofAssessments] = useState<Record<string, HoofAssessment>>({
    VL: emptyHoof(), VR: emptyHoof(), HL: emptyHoof(), HR: emptyHoof(),
  });
  const [photos, setPhotos] = useState<Record<string, string | null>>(
    Object.fromEntries(PHOTO_POSITIONS.map((p) => [p, null]))
  );
  const [plan, setPlan] = useState<PlanData>({
    overallAssessment: "", recommendedInterval: "", ownerRecommendation: "", referrals: [],
  });

  const updateHoof = (key: string, field: keyof HoofAssessment, value: string) => {
    setHoofAssessments((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSubmit = () => {
    onSubmit({ intake, hoofAssessments, photos, plan });
  };

  const steps = [
    { icon: ClipboardList, label: "Vorgeschichte" },
    { icon: Stethoscope, label: "Befund" },
    { icon: Camera, label: "Fotos" },
    { icon: FileText, label: "Plan" },
  ];

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              i === step ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
        ERSTBEFUND – {horseName}
      </Badge>

      {/* Step 1: Vorgeschichte */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vorgeschichte</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Wie lange hat der Besitzer das Pferd?</Label>
              <Select value={intake.ownershipDuration} onValueChange={(v) => setIntake({ ...intake, ownershipDuration: v })}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="<1">Weniger als 1 Jahr</SelectItem>
                  <SelectItem value="1-3">1–3 Jahre</SelectItem>
                  <SelectItem value="3+">Mehr als 3 Jahre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Letzter Hufbearbeiter</Label>
              <Input value={intake.previousFarrier} onChange={(e) => setIntake({ ...intake, previousFarrier: e.target.value })} placeholder="Name oder unbekannt" />
            </div>
            <div>
              <Label>Bearbeitungsintervall bisher</Label>
              <Select value={intake.trimmingInterval} onValueChange={(v) => setIntake({ ...intake, trimmingInterval: v })}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6w">Alle 6 Wochen</SelectItem>
                  <SelectItem value="8w">Alle 8 Wochen</SelectItem>
                  <SelectItem value="12w+">12+ Wochen</SelectItem>
                  <SelectItem value="irregular">Unregelmäßig</SelectItem>
                  <SelectItem value="never">Nie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Aktueller Hufschutz</Label>
              <ChipSelect options={CHIP_OPTIONS.hoofProtection} selected={intake.currentHoofProtection} onChange={(v) => setIntake({ ...intake, currentHoofProtection: v })} />
            </div>
            <div>
              <Label className="mb-2 block">Bekannte Vorerkrankungen</Label>
              <ChipSelect options={CHIP_OPTIONS.conditions} selected={intake.knownConditions} onChange={(v) => setIntake({ ...intake, knownConditions: v })} />
            </div>
            <div>
              <Label className="mb-2 block">Lahmheitshistorie</Label>
              <ChipSelect options={CHIP_OPTIONS.lameness} selected={[intake.lamenessHistory]} onChange={(v) => setIntake({ ...intake, lamenessHistory: v[0] || "" })} multi={false} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={intake.xraysAvailable} onCheckedChange={(v) => setIntake({ ...intake, xraysAvailable: v })} />
              <Label>Röntgenbilder vorhanden</Label>
            </div>
            {intake.xraysAvailable && (
              <p className="text-xs text-muted-foreground">Bitte im Tresor der Pferdeakte hochladen.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Huf-Befund */}
      {step === 1 && (
        <div className="space-y-4">
          {HOOVES.map(({ key, label }) => (
            <Card key={key}>
              <CardHeader><CardTitle className="text-sm">{label} ({key})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Zehenlänge (mm)</Label>
                    <Input type="number" placeholder="75-90" value={hoofAssessments[key].toeLength} onChange={(e) => updateHoof(key, "toeLength", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Hufwinkel (°)</Label>
                    <Input type="number" placeholder="48-58" value={hoofAssessments[key].hoofAngle} onChange={(e) => updateHoof(key, "hoofAngle", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Trachtenhöhe (mm)</Label>
                    <Input type="number" placeholder="20-40" value={hoofAssessments[key].heelHeight} onChange={(e) => updateHoof(key, "heelHeight", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Strahlqualität</Label>
                  <ChipSelect options={CHIP_OPTIONS.frogQuality} selected={[hoofAssessments[key].frogQuality]} onChange={(v) => updateHoof(key, "frogQuality", v[0] || "")} multi={false} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Wandqualität</Label>
                  <ChipSelect options={CHIP_OPTIONS.wallQuality} selected={[hoofAssessments[key].wallQuality]} onChange={(v) => updateHoof(key, "wallQuality", v[0] || "")} multi={false} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Sohle</Label>
                  <ChipSelect options={CHIP_OPTIONS.sole} selected={[hoofAssessments[key].sole]} onChange={(v) => updateHoof(key, "sole", v[0] || "")} multi={false} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Stellung</Label>
                  <ChipSelect options={CHIP_OPTIONS.stance} selected={[hoofAssessments[key].stance]} onChange={(v) => updateHoof(key, "stance", v[0] || "")} multi={false} />
                </div>
                <div>
                  <Label className="text-xs">Besonderheiten</Label>
                  <Input placeholder="Optional..." value={hoofAssessments[key].notes} onChange={(e) => updateHoof(key, "notes", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Fotos */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fotos (mind. 8 empfohlen)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {PHOTO_POSITIONS.map((pos) => (
              <div key={pos} className="flex items-center gap-3">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center text-xs", photos[pos] ? "bg-primary text-primary-foreground border-primary" : "border-border")}>
                  {photos[pos] ? "✓" : ""}
                </div>
                <span className="text-sm flex-1">{pos}</span>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Camera className="h-3.5 w-3.5 mr-1" /> Foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setPhotos((prev) => ({ ...prev, [pos]: url }));
                        }
                      }}
                    />
                  </label>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Plan */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Beurteilung & Plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gesamtbeurteilung</Label>
              <Textarea rows={4} placeholder="Beschreibe den Gesamtzustand..." value={plan.overallAssessment} onChange={(e) => setPlan({ ...plan, overallAssessment: e.target.value })} />
            </div>
            <div>
              <Label>Empfohlenes Bearbeitungsintervall</Label>
              <Select value={plan.recommendedInterval} onValueChange={(v) => setPlan({ ...plan, recommendedInterval: v })}>
                <SelectTrigger><SelectValue placeholder="Intervall wählen..." /></SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 12].map((w) => (
                    <SelectItem key={w} value={`${w}`}>{w} Wochen</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empfehlung an Besitzer</Label>
              <Textarea rows={3} placeholder="Boden, Bewegung, Futter, Tierarzt..." value={plan.ownerRecommendation} onChange={(e) => setPlan({ ...plan, ownerRecommendation: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">Überweisung nötig?</Label>
              <ChipSelect options={CHIP_OPTIONS.referrals} selected={plan.referrals} onChange={(v) => setPlan({ ...plan, referrals: v })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={step > 0 ? () => setStep(step - 1) : onCancel}>
          {step > 0 ? "Zurück" : "Abbrechen"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)}>Weiter</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Speichern..." : "Erstbefund speichern"}
          </Button>
        )}
      </div>
    </div>
  );
}
