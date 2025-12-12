import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ClipboardList, Eye, FileText, Calendar } from "lucide-react";
import { LTZAnalysisWizard, LTZAnalysisHistory, LTZComparisonView } from "@/components/hoof-analysis";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const Hufanalyse = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch horses the provider has access to
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing analyses
  const { data: analyses = [] } = useQuery({
    queryKey: ["hoof-analyses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("hoof_analyses")
        .select(`
          *,
          horses:horse_id(name, breed)
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  const handleStartAnalysis = () => {
    if (!selectedHorseId) return;
    setShowWizard(true);
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        {/* HIER WURDE (LTZ) ENTFERNT */}
        <h1 className="text-2xl font-bold text-foreground">Hufanalyse</h1>
        <p className="text-muted-foreground mt-1">
          Professionelle Bearbeitungsbögen nach dem Leipziger Modell
        </p>
      </div>

      {/* Start New Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Neue Analyse starten
          </CardTitle>
          <CardDescription>
            {/* HIER WURDE LTZ ENTFERNT */}
            Wählen Sie ein Pferd aus, um einen neuen Bearbeitungsbogen zu erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <Button onClick={handleStartAnalysis} disabled={!selectedHorseId} className="gap-2">
              <Plus className
