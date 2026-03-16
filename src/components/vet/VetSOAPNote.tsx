import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Plus, Trash2, CalendarIcon, FileUp } from "lucide-react";
import { toast } from "sonner";

interface MedicationEntry {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
}

interface VetSOAPNoteProps {
  horseId: string;
  horseName?: string;
  appointmentId?: string;
  onSaved?: () => void;
}

const TREATMENT_TYPES = [
  { value: "routine", label: "Routine" },
  { value: "notfall", label: "Notfall" },
  { value: "aku", label: "AKU (Kaufuntersuchung)" },
  { value: "impfung", label: "Impfung" },
  { value: "zahnbehandlung", label: "Zahnbehandlung" },
  { value: "lahmheit", label: "Lahmheitsuntersuchung" },
  { value: "kolik", label: "Kolik" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "bildgebung", label: "Bildgebung" },
  { value: "sonstiges", label: "Sonstiges" },
];

const ROUTE_OPTIONS = [
  { value: "oral", label: "Oral" },
  { value: "iv", label: "Intravenös (i.v.)" },
  { value: "im", label: "Intramuskulär (i.m.)" },
  { value: "sc", label: "Subkutan (s.c.)" },
  { value: "topisch", label: "Topisch" },
  { value: "inhalativ", label: "Inhalativ" },
  { value: "rektal", label: "Rektal" },
];

export function VetSOAPNote({ horseId, horseName, appointmentId, onSaved }: VetSOAPNoteProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [treatmentType, setTreatmentType] = useState("routine");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // SOAP fields
  const [subjective, setSubjective] = useState("");
  const [temp, setTemp] = useState("");
  const [pulse, setPulse] = useState("");
  const [resp, setResp] = useState("");
  const [weight, setWeight] = useState("");
  const [generalFindings, setGeneralFindings] = useState("");
  const [specificFindings, setSpecificFindings] = useState("");
  const [assessment, setAssessment] = useState("");
  const [therapy, setTherapy] = useState("");
  const [nextCheck, setNextCheck] = useState("");
  const [recFarrier, setRecFarrier] = useState("");
  const [recOwner, setRecOwner] = useState("");

  // Medications
  const [medications, setMedications] = useState<MedicationEntry[]>([]);

  const addMedication = () => {
    setMedications(prev => [...prev, { name: "", dosage: "", frequency: "", route: "oral", duration: "" }]);
  };

  const updateMed = (idx: number, field: keyof MedicationEntry, value: string) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const removeMed = (idx: number) => {
    setMedications(prev => prev.filter((_, i) => i !== idx));
  };

  const saveMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!user) throw new Error("Nicht angemeldet");
      if (!subjective && !generalFindings) throw new Error("Bitte mindestens Anamnese oder Befund ausfüllen");

      const soapData = {
        subjective,
        objective: {
          temp: temp ? parseFloat(temp) : null,
          pulse: pulse ? parseInt(pulse) : null,
          resp: resp ? parseInt(resp) : null,
          weight: weight ? parseFloat(weight) : null,
          general_findings: generalFindings,
          specific_findings: specificFindings,
        },
        assessment,
        plan: {
          therapy,
          medications: medications.filter(m => m.name),
          next_check: nextCheck || null,
          recommendations: {
            farrier: recFarrier || null,
            owner: recOwner || null,
          },
        },
      };

      const soapContent = [
        subjective ? `**S (Subjektiv):** ${subjective}` : "",
        generalFindings || specificFindings ? `**O (Objektiv):** ${[generalFindings, specificFindings].filter(Boolean).join("\n")}` : "",
        temp || pulse ? `Vitalwerte: Temp ${temp || "–"}°C, Puls ${pulse || "–"}/min, Atmung ${resp || "–"}/min, Gewicht ${weight || "–"}kg` : "",
        assessment ? `**A (Assessment):** ${assessment}` : "",
        therapy ? `**P (Plan):** ${therapy}` : "",
        recFarrier ? `**Empfehlung Hufbearbeiter:** ${recFarrier}` : "",
        recOwner ? `**Empfehlung Besitzer:** ${recOwner}` : "",
      ].filter(Boolean).join("\n\n");

      // 1. Save treatment note
      const { error: noteError } = await supabase
        .from("partner_treatment_notes")
        .insert([{
          horse_id: horseId,
          partner_id: user.id,
          treatment_type: treatmentType,
          description: `SOAP-Befund: ${assessment || treatmentType}`,
          findings: soapContent,
          treatment_performed: therapy || null,
          soap_data: soapData,
          treatment_category: treatmentType,
          next_check_date: nextCheck || null,
          recommendation_for_farrier: recFarrier || null,
          recommendation_for_owner: recOwner || null,
          visible_to_kid: true,
          visible_to_pid: true,
        }] as any);
      if (noteError) throw noteError;

      // 2. Save vitals to horse_health_logs
      const vitals: Array<{ type: string; value: number; unit: string }> = [];
      if (temp) vitals.push({ type: "temperature", value: parseFloat(temp), unit: "°C" });
      if (pulse) vitals.push({ type: "pulse", value: parseInt(pulse), unit: "/min" });
      if (resp) vitals.push({ type: "respiration", value: parseInt(resp), unit: "/min" });
      if (weight) vitals.push({ type: "weight", value: parseFloat(weight), unit: "kg" });

      if (vitals.length > 0) {
        const healthLogs = vitals.map(v => ({
          horse_id: horseId,
          recorded_by: user.id,
          log_type: v.type,
          value: v.value.toString(),
          unit: v.unit,
          recorded_at: new Date(date).toISOString(),
          notes: `SOAP-Befund vom ${date}`,
        }));
        await supabase.from("horse_health_logs").insert(healthLogs as any);
      }

      // 3. Save medications
      const validMeds = medications.filter(m => m.name);
      if (validMeds.length > 0) {
        const medRows = validMeds.map(m => ({
          horse_id: horseId,
          documented_by: user.id,
          prescribed_by: user.id,
          medication_name: m.name,
          dosage: m.dosage || null,
          frequency: m.frequency || null,
          route: m.route || null,
          start_date: date,
          source: "manual",
          source_system: "manual",
          is_active: true,
        }));
        await supabase.from("horse_medications").insert(medRows as any);
      }
    },
    onSuccess: () => {
      toast.success("SOAP-Befund gespeichert");
      queryClient.invalidateQueries({ queryKey: ["vet-my-horses"] });
      onSaved?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Fehler beim Speichern");
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-base font-semibold mb-3">
            Tierärztlicher Befund{horseName ? ` für ${horseName}` : ""}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Untersuchungstyp</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TREATMENT_TYPES.map(t => (
                  <Badge
                    key={t.value}
                    variant={treatmentType === t.value ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setTreatmentType(t.value)}
                  >
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* S - Subjective */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300">S</Badge>
            Subjektiv (Anamnese)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Was berichtet der Besitzer? Vorgeschichte, Symptome, Dauer..."
            value={subjective}
            onChange={e => setSubjective(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* O - Objective */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300">O</Badge>
            Objektiv (Befund)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Vitalwerte</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              <div>
                <Label className="text-xs">Temp (°C)</Label>
                <Input type="number" step="0.1" placeholder="37.8" value={temp} onChange={e => setTemp(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Puls (/min)</Label>
                <Input type="number" placeholder="36" value={pulse} onChange={e => setPulse(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Atmung (/min)</Label>
                <Input type="number" placeholder="12" value={resp} onChange={e => setResp(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Gewicht (kg)</Label>
                <Input type="number" placeholder="520" value={weight} onChange={e => setWeight(e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Allgemeinbefund</Label>
            <Textarea
              placeholder="Klinische Untersuchung: Allgemeinzustand, Palpation, Auskultation..."
              value={generalFindings}
              onChange={e => setGeneralFindings(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Spezifischer Befund</Label>
            <Textarea
              placeholder="Detaillierte Befunde der gezielten Untersuchung..."
              value={specificFindings}
              onChange={e => setSpecificFindings(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* A - Assessment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300">A</Badge>
            Assessment (Beurteilung)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Diagnose(n), Differentialdiagnosen, Zusammenfassung..."
            value={assessment}
            onChange={e => setAssessment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* P - Plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className="bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-300">P</Badge>
            Plan (Therapie & Empfehlung)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Therapie</Label>
            <Textarea
              placeholder="Was wurde durchgeführt? Behandlung, Verbände, Injektionen..."
              value={therapy}
              onChange={e => setTherapy(e.target.value)}
              rows={3}
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Medikation</Label>
              <Button variant="outline" size="sm" onClick={addMedication} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Medikament
              </Button>
            </div>
            {medications.map((med, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 p-2 rounded-lg border bg-muted/30">
                <div className="col-span-4">
                  <Input placeholder="Medikament" value={med.name} onChange={e => updateMed(idx, "name", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Input placeholder="Dosis" value={med.dosage} onChange={e => updateMed(idx, "dosage", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Input placeholder="Frequenz" value={med.frequency} onChange={e => updateMed(idx, "frequency", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Select value={med.route} onValueChange={v => updateMed(idx, "route", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTE_OPTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input placeholder="Tage" value={med.duration} onChange={e => updateMed(idx, "duration", e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-1 flex items-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMed(idx)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nächste Kontrolle</Label>
              <Input type="date" value={nextCheck} onChange={e => setNextCheck(e.target.value)} className="h-9" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Empfehlung an Hufbearbeiter</Label>
            <Textarea
              placeholder="z.B. Bitte Trachten kürzen, Eisen mit Steg empfohlen..."
              value={recFarrier}
              onChange={e => setRecFarrier(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs">Empfehlung an Besitzer</Label>
            <Textarea
              placeholder="z.B. 2 Wochen Boxenruhe, tägliche Kontrolle der Temperatur..."
              value={recOwner}
              onChange={e => setRecOwner(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button
          variant="outline"
          onClick={() => saveMutation.mutate(true)}
          disabled={saveMutation.isPending}
        >
          Entwurf speichern
        </Button>
        <Button
          onClick={() => saveMutation.mutate(false)}
          disabled={saveMutation.isPending || (!subjective && !generalFindings)}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Befund abschließen
        </Button>
      </div>
    </div>
  );
}
