import { useState } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, MapPin, FileText, PartyPopper, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DayEndProps {
  completedCount: number;
  totalCount: number;
  workedMinutes: number;
  documentedCount: number;
  onClose: () => void;
}

export function EmployeeDayEnd({ completedCount, totalCount, workedMinutes, documentedCount, onClose }: DayEndProps) {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [ending, setEnding] = useState(false);

  const hours = Math.floor(workedMinutes / 60);
  const mins = workedMinutes % 60;

  const endDay = useMutation({
    mutationFn: async () => {
      if (!profile || !user) return;
      setEnding(true);

      // End active time record
      const { data: activeRecord } = await supabase
        .from("employee_time_records")
        .select("id")
        .eq("employee_id", profile.id)
        .is("end_time", null)
        .is("deleted_at", null)
        .maybeSingle();

      if (activeRecord) {
        await supabase
          .from("employee_time_records")
          .update({ end_time: new Date().toISOString(), notes: note || null })
          .eq("id", activeRecord.id);
      }

      // Send notification to provider
      await supabase.from("employee_notifications").insert({
        employee_id: profile.id,
        type: "day_end_report",
        title: "Tagesabschluss",
        body: `${profile.full_name} hat die Schicht beendet: ${completedCount}/${totalCount} Termine, ${hours}h ${mins}m gearbeitet.`,
        link_to: "/team",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-active-time"] });
      toast.success("Schicht beendet — bis morgen! 👋");
      onClose();
    },
    onError: () => {
      toast.error("Fehler beim Beenden");
      setEnding(false);
    },
  });

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-6 space-y-5">
        <div className="text-center">
          <PartyPopper className="h-10 w-10 mx-auto mb-2 text-primary" />
          <h2 className="text-lg font-bold">Guter Tag, {profile?.full_name?.split(" ")[0]}!</h2>
          <p className="text-sm text-muted-foreground">Hier dein Überblick:</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg p-3 text-center border">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{completedCount}/{totalCount}</p>
            <p className="text-[10px] text-muted-foreground">Termine erledigt</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border">
            <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{hours}h {mins}m</p>
            <p className="text-[10px] text-muted-foreground">Arbeitszeit</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border">
            <FileText className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{documentedCount}</p>
            <p className="text-[10px] text-muted-foreground">Dokumentiert</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center border">
            <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Stops besucht</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Notiz für Provider (optional)</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Besonderheiten heute..."
            rows={2}
            className="resize-none"
            maxLength={500}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Bis morgen!
          </Button>
          <Button className="flex-1 gap-1.5" onClick={() => endDay.mutate()} disabled={ending}>
            {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Schicht beenden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
