import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MessageSquare, Phone } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientNextAppointmentContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: nextAppt } = useQuery({
    queryKey: ["client-next-appointment-widget", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time, horse_id, provider_id, horses(name), profiles!appointments_provider_id_fkey(full_name)")
        .eq("client_id", user!.id)
        .gte("date", today)
        .in("status", ["scheduled", "planned", "confirmed"])
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (!nextAppt) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Kein Termin geplant</p>
        <button
          onClick={() => navigate("/client-booking")}
          className="text-xs font-medium text-primary mt-2 hover:underline"
        >
          Jetzt buchen →
        </button>
      </div>
    );
  }

  const daysUntil = differenceInDays(new Date(nextAppt.date), new Date());
  const horseName = (nextAppt as any)?.horses?.name || "Pferd";
  const providerName = (nextAppt as any)?.profiles?.full_name || "";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {horseName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(nextAppt.date), "EEEE, dd.MM.yyyy", { locale: de })}
            {nextAppt.time ? ` · ${nextAppt.time.substring(0, 5)}` : ""}
          </p>
          {providerName && (
            <p className="text-xs text-muted-foreground">bei {providerName}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {daysUntil === 0 ? "Heute" : daysUntil === 1 ? "Morgen" : `${daysUntil}d`}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate("/client-chat")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted hover:bg-accent text-xs font-medium transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <button
          onClick={() => navigate("/client-booking")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-colors hover:bg-primary/90"
        >
          <Calendar className="h-3.5 w-3.5" /> Buchen
        </button>
      </div>
    </div>
  );
}
