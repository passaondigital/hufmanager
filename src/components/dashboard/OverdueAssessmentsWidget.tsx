import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { format, addMonths, isBefore, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface OverdueHorse {
  id: string;
  name: string;
  readable_id: string | null;
  owner_id: string;
  last_anamnesis_date: string | null;
  anamnesis_interval_months: number;
  months_overdue: number;
  next_appointment_id: string | null;
  next_appointment_date: string | null;
}

export function OverdueAssessmentsWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: overdueHorses = [], isLoading } = useQuery({
    queryKey: ["overdue-assessments"],
    queryFn: async () => {
      const now = new Date();
      
      // Fetch all horses
      const { data: horses, error: horsesError } = await supabase
        .from("horses")
        .select("id, name, readable_id, owner_id, last_anamnesis_date, anamnesis_interval_months");
      
      if (horsesError) throw horsesError;

      // Fetch next upcoming appointments for each horse
      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select("id, horse_id, date")
        .in("horse_id", horses?.map(h => h.id) || [])
        .gte("date", format(now, "yyyy-MM-dd"))
        .eq("status", "scheduled")
        .order("date", { ascending: true });

      if (apptError) throw apptError;

      // Process horses to find overdue ones
      const overdueList: OverdueHorse[] = [];
      
      for (const horse of horses || []) {
        const intervalMonths = horse.anamnesis_interval_months || 12;
        
        // If never had anamnesis, it's overdue (new horse)
        if (!horse.last_anamnesis_date) {
          const nextAppt = appointments?.find(a => a.horse_id === horse.id);
          overdueList.push({
            ...horse,
            anamnesis_interval_months: intervalMonths,
            months_overdue: -1, // Special flag for "never done"
            next_appointment_id: nextAppt?.id || null,
            next_appointment_date: nextAppt?.date || null,
          });
          continue;
        }

        // Check if overdue
        const lastDate = parseISO(horse.last_anamnesis_date);
        const dueDate = addMonths(lastDate, intervalMonths);
        
        if (isBefore(dueDate, now)) {
          const monthsOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          const nextAppt = appointments?.find(a => a.horse_id === horse.id);
          
          overdueList.push({
            ...horse,
            anamnesis_interval_months: intervalMonths,
            months_overdue: monthsOverdue,
            next_appointment_id: nextAppt?.id || null,
            next_appointment_date: nextAppt?.date || null,
          });
        }
      }

      return overdueList.slice(0, 5); // Limit to 5 for widget
    },
  });

  const addToAppointment = useMutation({
    mutationFn: async ({ appointmentId, horseName }: { appointmentId: string; horseName: string }) => {
      // Get current appointment
      const { data: appt, error: fetchError } = await supabase
        .from("appointments")
        .select("notes, duration")
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Update appointment with anamnesis note and extended duration
      const newNotes = appt.notes 
        ? `${appt.notes}\n\n📋 To-Do: Große Aufnahme durchführen`
        : "📋 To-Do: Große Aufnahme durchführen";
      
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          notes: newNotes,
          duration: (appt.duration || 60) + 15,
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
      
      return { horseName };
    },
    onSuccess: ({ horseName }) => {
      queryClient.invalidateQueries({ queryKey: ["overdue-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "Aufnahme eingeplant",
        description: `"Große Aufnahme" wurde zum nächsten Termin für ${horseName} hinzugefügt (+15 Min).`,
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Konnte nicht zum Termin hinzufügen.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Fällige Bestandsaufnahmen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (overdueHorses.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Fällige Bestandsaufnahmen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Alle Pferde sind auf dem neuesten Stand!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Fällige Bestandsaufnahmen
          <Badge variant="destructive" className="ml-auto">
            {overdueHorses.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueHorses.map((horse) => (
          <div
            key={horse.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {horse.name}
                </span>
                {horse.months_overdue === -1 ? (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50 shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Neu
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/50 shrink-0">
                    {horse.months_overdue}+ Monate überfällig
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {horse.months_overdue === -1 
                  ? "Noch keine Aufnahme durchgeführt"
                  : `Letzter Check: ${horse.last_anamnesis_date ? format(parseISO(horse.last_anamnesis_date), "dd.MM.yyyy", { locale: de }) : "—"}`
                }
              </p>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              {horse.next_appointment_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToAppointment.mutate({ 
                    appointmentId: horse.next_appointment_id!, 
                    horseName: horse.name 
                  })}
                  disabled={addToAppointment.isPending}
                  className="whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Zum Termin
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/kalender", { state: { createAppointment: horse.id } })}
                  className="whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Termin planen
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate(`/kunden?horse=${horse.id}`)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
