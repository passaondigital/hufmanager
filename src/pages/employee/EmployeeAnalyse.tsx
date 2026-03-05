import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LTZAnalysisWizard, LTZAnalysisHistory } from "@/components/hoof-analysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

const EmployeeAnalyse = () => {
  const { user } = useAuth();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Fetch ONLY horses assigned to this employee via employee_assignments
  const { data: horses = [] } = useQuery({
    queryKey: ["employee-horses-analyse", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get employee profile id
      const { data: empProfile } = await supabase
        .from("employee_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!empProfile?.id) return [];

      // Get horse IDs from assignments
      const { data: assignments } = await supabase
        .from("employee_assignments")
        .select("appointment:appointments(horse_id)")
        .eq("employee_id", empProfile.id);

      const horseIds = [...new Set(
        (assignments || [])
          .map((a: any) => a.appointment?.horse_id)
          .filter(Boolean)
      )];

      if (horseIds.length === 0) return [];

      const { data } = await supabase
        .from("horses")
        .select("id, name, breed")
        .in("id", horseIds)
        .is("deleted_at", null);

      return data || [];
    },
    enabled: !!user?.id,
  });

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Hufanalyse
          <HelpTip id="mitarbeiter.hufanalyse" />
        </h1>
        <p className="text-sm text-muted-foreground">
          Professionelle Bearbeitungsbögen nach LTZ-Standard
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedHorseId || ""} onValueChange={setSelectedHorseId}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Pferd auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name} {horse.breed ? `(${horse.breed})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowWizard(true)} disabled={!selectedHorseId} className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Analyse starten
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedHorseId && selectedHorse && (
        <LTZAnalysisHistory horseId={selectedHorseId} horseName={selectedHorse.name} />
      )}

      {selectedHorse && (
        <LTZAnalysisWizard
          isOpen={showWizard}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};

export default EmployeeAnalyse;
