import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function VetSOAPForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedHorseId, setSelectedHorseId] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentType, setTreatmentType] = useState("untersuchung");

  // Horses I have access to
  const { data: myHorses } = useQuery({
    queryKey: ["vet-accessible-horses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses!horse_partner_access_horse_id_fkey(id, name, breed)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("can_add_treatment_notes", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHorseId || !subjective) throw new Error("Pferd und Anamnese sind Pflichtfelder");

      const soapContent = [
        `**S (Subjektiv):** ${subjective}`,
        `**O (Objektiv):** ${objective}`,
        `**A (Assessment):** ${assessment}`,
        `**P (Plan):** ${plan}`,
        diagnosis ? `**Diagnose:** ${diagnosis}` : "",
      ].filter(Boolean).join("\n\n");

      const { error } = await supabase
        .from("partner_treatment_notes")
        .insert({
          horse_id: selectedHorseId,
          partner_id: user!.id,
          treatment_type: treatmentType,
          description: `SOAP-Befund: ${diagnosis || treatmentType}`,
          findings: soapContent,
          treatment_performed: plan,
          visible_to_kid: true,
          visible_to_pid: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SOAP-Befund gespeichert");
      queryClient.invalidateQueries({ queryKey: ["vet-my-horses"] });
      navigate("/vet/dashboard");
    },
    onError: (err: any) => {
      toast.error(err.message || "Fehler beim Speichern");
    },
  });

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link to="/vet/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-bold">SOAP-Befund</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Horse Selection */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Pferd auswählen *</Label>
              <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pferd wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {myHorses?.map((access: any) => (
                    <SelectItem key={access.horse_id} value={access.horse_id}>
                      {access.horses?.name} {access.horses?.breed ? `(${access.horses.breed})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Behandlungsart</Label>
              <Select value={treatmentType} onValueChange={setTreatmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="untersuchung">Allgemeine Untersuchung</SelectItem>
                  <SelectItem value="lahmheit">Lahmheitsuntersuchung</SelectItem>
                  <SelectItem value="kolik">Kolik</SelectItem>
                  <SelectItem value="zahnbehandlung">Zahnbehandlung</SelectItem>
                  <SelectItem value="chirurgie">Chirurgie</SelectItem>
                  <SelectItem value="bildgebung">Bildgebung (Röntgen/Ultraschall)</SelectItem>
                  <SelectItem value="impfung">Impfung/Prophylaxe</SelectItem>
                  <SelectItem value="notfall">Notfall</SelectItem>
                  <SelectItem value="kaufuntersuchung">Kaufuntersuchung</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* SOAP Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Badge variant="outline" className="mr-2 text-blue-600 border-blue-200 bg-blue-50">S</Badge>
              Subjektiv (Anamnese)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Was berichtet der Besitzer? Vorgeschichte, Symptome, Dauer..."
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Badge variant="outline" className="mr-2 text-green-600 border-green-200 bg-green-50">O</Badge>
              Objektiv (Befund)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Klinische Untersuchung: Vitalparameter, Palpation, Auskultation, Provokationsproben..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Badge variant="outline" className="mr-2 text-amber-600 border-amber-200 bg-amber-50">A</Badge>
              Assessment (Beurteilung)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Diagnose</Label>
              <Input
                placeholder="z.B. V.a. Hufrollenerkrankung beidseits vorne"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Zusammenfassende Beurteilung, Differentialdiagnosen..."
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Badge variant="outline" className="mr-2 text-purple-600 border-purple-200 bg-purple-50">P</Badge>
              Plan (Therapie & Empfehlung)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Behandlung, Medikation, Nachkontrolle, Empfehlungen an Besitzer/Hufbearbeiter..."
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Link to="/vet/dashboard">
            <Button variant="outline">Abbrechen</Button>
          </Link>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedHorseId || !subjective}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Befund speichern
          </Button>
        </div>
      </main>
    </div>
  );
}
