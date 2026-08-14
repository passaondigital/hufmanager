import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfessionConfig } from "@/hooks/useProfessionConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface NextAppointmentCardProps {
  userId: string;
  role: "client" | "provider" | "employee";
  /** For employee: filter by employee profile id */
  employeeProfileId?: string;
  onNavigate?: () => void;
  onDetails?: () => void;
}

function ClientDelayAction({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(10);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [showCustom, setShowCustom] = useState(false);
  const [note, setNote] = useState("");

  const handleSendDelay = async () => {
    let minutes = showCustom ? parseInt(customMinutes, 10) : selectedMinutes;
    if (!minutes || isNaN(minutes) || minutes < 1 || minutes > 180) {
      toast({
        title: "Ungültige Zeit",
        description: "Bitte wählen Sie eine Verspätung zwischen 1 und 180 Minuten.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-appointment-delay", {
        body: {
          appointment_id: appointmentId,
          delay_minutes: minutes,
          action_type: "delay",
          note: note.trim() || undefined,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Fehler beim Senden");
      }

      setSent(true);
      setOpen(false);
      toast({
        title: "Verspätung gemeldet",
        description: `Dein Pferdeprofi wurde über ca. ${minutes} Min. Verspätung informiert.`,
      });

      setTimeout(() => setSent(false), 30000);
    } catch (err: any) {
      console.error("Client delay notification error:", err);
      toast({
        title: "Fehler",
        description: err.message || "Verspätung konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={sent ? "secondary" : "outline"}
            className="w-full h-8 text-xs font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5"
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : sent ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {sent ? "Verspätung gemeldet" : "Ich verspäte mich"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3 space-y-3" align="center">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">Ich verspäte mich</h4>
            <p className="text-[11px] text-muted-foreground">Pferdeprofi über deine Verspätung informieren.</p>
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
            <label className="text-[10px] text-muted-foreground font-medium">Kurze Nachricht (optional)</label>
            <Input
              type="text"
              maxLength={200}
              placeholder="z.B. Stehe im Stau..."
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
            disabled={sending}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Jetzt absenden
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function NextAppointmentCard({ userId, role, employeeProfileId, onNavigate, onDetails }: NextAppointmentCardProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { serviceLabel } = useProfessionConfig();

  const { data: appointment } = useQuery({
    queryKey: ["next-appointment", userId, role, todayStr],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, date, time, location, service_type, status, horse:horses(name), client:profiles!appointments_client_id_fkey(full_name), provider:profiles!appointments_assigned_to_user_id_fkey(full_name)")
        .gte("date", todayStr)
        .in("status", ["scheduled", "confirmed", "planned"])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1);

      if (role === "client") {
        q = q.eq("client_id", userId);
      } else if (role === "provider") {
        q = q.eq("provider_id", userId);
      } else if (role === "employee") {
        q = q.eq("assigned_to_user_id", userId);
      }

      const { data } = await q.maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!appointment) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Kein Termin geplant</p>
        {role === "client" && (
          <button onClick={onNavigate} className="text-xs text-primary mt-1 hover:underline">
            Jetzt buchen →
          </button>
        )}
      </div>
    );
  }

  const daysUntil = differenceInCalendarDays(new Date(appointment.date), new Date());
  const countdownLabel = daysUntil === 0 ? "Heute" : daysUntil === 1 ? "Morgen" : `in ${daysUntil} Tagen`;
  const horseName = (appointment as any).horse?.name;
  const clientName = (appointment as any).client?.full_name;
  const providerName = (appointment as any).provider?.full_name;

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Nächster Termin</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {horseName || appointment.service_type || serviceLabel}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>
              {format(new Date(appointment.date), "EEE, dd.MM.", { locale: de })}
              {appointment.time && ` · ${appointment.time.slice(0, 5)}`}
            </span>
          </div>
          {role === "client" && providerName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{providerName}</p>
          )}
          {role !== "client" && clientName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{clientName}</p>
          )}
          {appointment.location && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
        </div>

        {/* Countdown badge */}
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 border",
          daysUntil === 0
            ? "bg-green-500/10 text-green-600 border-green-500/20"
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          {countdownLabel}
        </span>
      </div>

      {/* Action for client: Ich verspäte mich */}
      {role === "client" && (
        <ClientDelayAction appointmentId={appointment.id} />
      )}

      {/* Action buttons for provider */}
      {role !== "client" && (onNavigate || onDetails) && (
        <div className="flex gap-2 mt-3">
          {onNavigate && (
            <button onClick={onNavigate} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              Navigation starten
            </button>
          )}
          {onDetails && (
            <button onClick={onDetails} className="flex-1 py-2 rounded-lg bg-muted border border-border text-foreground text-xs font-medium hover:bg-accent transition-colors">
              Details →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
