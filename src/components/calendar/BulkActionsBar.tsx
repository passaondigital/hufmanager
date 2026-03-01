import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, ArrowRight, Ban, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  appointments: any[];
}

export function BulkActionsBar({ selectedIds, onClearSelection, appointments }: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [isProcessing, setIsProcessing] = useState(false);
  const [daysOffset, setDaysOffset] = useState(1);

  if (selectedIds.length === 0) return null;

  const handleBulkReschedule = async () => {
    if (!targetDate) return;
    setIsProcessing(true);

    try {
      // Calculate the date difference from the first selected appointment
      const firstApt = appointments.find((a) => a.id === selectedIds[0]);
      if (!firstApt) return;

      const originalDate = new Date(firstApt.date);
      const diffDays = Math.round(
        (targetDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Update each appointment with the offset
      for (const id of selectedIds) {
        const apt = appointments.find((a: any) => a.id === id);
        if (!apt) continue;

        const newDate = addDays(new Date(apt.date), diffDays);
        const { error } = await supabase
          .from("appointments")
          .update({ date: format(newDate, "yyyy-MM-dd") })
          .eq("id", id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: `${selectedIds.length} Termine verschoben`,
        description: `Um ${Math.abs(diffDays)} Tag(e) ${diffDays > 0 ? "nach vorne" : "zurück"} verschoben.`,
      });
      onClearSelection();
      setRescheduleOpen(false);
    } catch (error) {
      toast({ title: "Fehler beim Verschieben", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkCancel = async () => {
    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        const { error } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: `${selectedIds.length} Termine abgesagt`,
      });
      onClearSelection();
      setCancelOpen(false);
    } catch (error) {
      toast({ title: "Fehler beim Absagen", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickShift = async (days: number) => {
    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        const apt = appointments.find((a: any) => a.id === id);
        if (!apt) continue;

        const newDate = addDays(new Date(apt.date), days);
        const { error } = await supabase
          .from("appointments")
          .update({ date: format(newDate, "yyyy-MM-dd") })
          .eq("id", id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: `${selectedIds.length} Termine verschoben`,
        description: `${days > 0 ? "+" : ""}${days} Tag(e)`,
      });
      onClearSelection();
    } catch (error) {
      toast({ title: "Fehler beim Verschieben", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 animate-in slide-in-from-top-2">
      <Badge variant="default" className="shrink-0">
        {selectedIds.length} ausgewählt
      </Badge>

      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {/* Quick shift buttons */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() => handleQuickShift(1)}
          disabled={isProcessing}
        >
          +1 Tag
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() => handleQuickShift(7)}
          disabled={isProcessing}
        >
          +1 Woche
        </Button>

        {/* Custom date picker */}
        <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              Datum wählen
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={targetDate}
              onSelect={setTargetDate}
              locale={de}
              disabled={(date) => date < new Date()}
            />
            <div className="p-3 border-t">
              <Button
                size="sm"
                className="w-full"
                onClick={handleBulkReschedule}
                disabled={!targetDate || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1" />
                )}
                Verschieben
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator />

        {/* Cancel */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
          onClick={() => setCancelOpen(true)}
          disabled={isProcessing}
        >
          <Ban className="h-3.5 w-3.5" />
          Alle absagen
        </Button>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedIds.length} Termine absagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle ausgewählten Termine werden auf "Abgesagt" gesetzt. Die betroffenen Kunden werden benachrichtigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkCancel}
              className="bg-destructive text-destructive-foreground"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Ja, alle absagen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Separator() {
  return <div className="h-5 w-px bg-border" />;
}
