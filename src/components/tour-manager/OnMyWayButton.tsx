import { useState } from "react";
import { Navigation, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { TourAppointment } from "./TourCard";

interface OnMyWayButtonProps {
  appointment: TourAppointment;
  userLocation: [number, number] | null;
  routeDurationMinutes: number | null;
  providerDisplayName?: string;
}

export function OnMyWayButton({ appointment, routeDurationMinutes }: OnMyWayButtonProps) {
  const [sendingOnMyWay, setSendingOnMyWay] = useState(false);
  const [sentOnMyWay, setSentOnMyWay] = useState(false);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sendingDelay, setSendingDelay] = useState(false);
  const [sentDelay, setSentDelay] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(10);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [showCustom, setShowCustom] = useState(false);
  const [note, setNote] = useState("");

  const handleOnMyWay = async () => {
    if (!appointment.id) return;

    setSendingOnMyWay(true);
    try {
      const estimatedMinutes = routeDurationMinutes || 0;

      const { data, error } = await supabase.functions.invoke("notify-appointment-delay", {
        body: {
          appointment_id: appointment.id,
          delay_minutes: estimatedMinutes,
          action_type: "on_my_way",
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Fehler beim Senden");
      }

      setSentOnMyWay(true);
      toast({
        title: "Kunde benachrichtigt",
        description: "Status 'Ich komme' wurde an den Kunden gesendet.",
      });

      setTimeout(() => setSentOnMyWay(false), 30000);
    } catch (error: any) {
      console.error("On My Way error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSendingOnMyWay(false);
    }
  };

  const handleSendDelay = async () => {
    if (!appointment.id) return;

    let minutes = showCustom ? parseInt(customMinutes, 10) : selectedMinutes;
    if (!minutes || isNaN(minutes) || minutes < 1 || minutes > 180) {
      toast({
        title: "Ungültige Zeit",
        description: "Bitte wählen Sie eine Verspätung zwischen 1 und 180 Minuten.",
        variant: "destructive",
      });
      return;
    }

    setSendingDelay(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-appointment-delay", {
        body: {
          appointment_id: appointment.id,
          delay_minutes: minutes,
          action_type: "delay",
          note: note.trim() || undefined,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Fehler beim Senden");
      }

      setSentDelay(true);
      setPopoverOpen(false);
      toast({
        title: "Verspätung gemeldet",
        description: `Kunde wurde über ca. ${minutes} Min. Verspätung informiert.`,
      });

      setTimeout(() => setSentDelay(false), 30000);
    } catch (error: any) {
      console.error("Send delay error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Verspätung konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSendingDelay(false);
    }
  };

  if (!appointment.id) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* 1. Ich komme Button */}
      <Button
        size="sm"
        variant={sentOnMyWay ? "secondary" : "default"}
        className="gap-1.5 h-8 text-xs font-medium"
        onClick={handleOnMyWay}
        disabled={sendingOnMyWay || sentOnMyWay}
      >
        {sendingOnMyWay ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : sentOnMyWay ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Navigation className="h-3.5 w-3.5" />
        )}
        {sentOnMyWay ? "Gesendet" : "Ich komme"}
      </Button>

      {/* 2. Verspätung melden Popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={sentDelay ? "secondary" : "outline"}
            className="gap-1.5 h-8 text-xs font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            disabled={sendingDelay}
          >
            {sendingDelay ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : sentDelay ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {sentDelay ? "Gemeldet" : "Verspätung"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3 space-y-3" align="end">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">Verspätung melden</h4>
            <p className="text-[11px] text-muted-foreground">Kunden über neue Ankunftszeit informieren.</p>
          </div>

          {/* Quick options */}
          <div className="grid grid-cols-4 gap-1">
            {[10, 20, 30].map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={!showCustom && selectedMinutes === m ? "default" : "outline"}
                className="h-7 text-xs font-mono px-1"
                onClick={() => {
                  setSelectedMinutes(m);
                  setShowCustom(false);
                }}
              >
                +{m}m
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={showCustom ? "default" : "outline"}
              className="h-7 text-[10px] px-1"
              onClick={() => setShowCustom(true)}
            >
              Andere
            </Button>
          </div>

          {/* Custom time input */}
          {showCustom && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={180}
                placeholder="Min. (1-180)"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground shrink-0">Min.</span>
            </div>
          )}

          {/* Short Note */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium">Kurze Info (optional)</label>
            <Input
              type="text"
              maxLength={200}
              placeholder="z.B. Stau auf A7..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          {/* Action button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs font-semibold"
            onClick={handleSendDelay}
            disabled={sendingDelay}
          >
            {sendingDelay ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : null}
            Jetzt senden
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
