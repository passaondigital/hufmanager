import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInCalendarDays } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextAppointmentCardProps {
  userId: string;
  role: "client" | "provider" | "employee";
  /** For employee: filter by employee profile id */
  employeeProfileId?: string;
  onNavigate?: () => void;
  onDetails?: () => void;
}

export function NextAppointmentCard({ userId, role, employeeProfileId, onNavigate, onDetails }: NextAppointmentCardProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

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
      } else if (role === "employee" && employeeProfileId) {
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
            {horseName || appointment.service_type || "Termin"}
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

      {/* Action buttons for provider */}
      {(onNavigate || onDetails) && (
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
