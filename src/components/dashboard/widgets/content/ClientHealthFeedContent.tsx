import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Activity } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function ClientHealthFeedContent({ settings }: WidgetContentProps) {
  const { user } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ["client-health-feed", user?.id],
    queryFn: async () => {
      // Get recent completed appointments as health events
      const { data } = await supabase
        .from("appointments")
        .select("id, date, service_type, completion_notes, horse_id, provider_id, horses(name), profiles!appointments_provider_id_fkey(full_name)")
        .eq("client_id", user!.id)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Noch keine Behandlungen</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((evt: any) => (
        <div key={evt.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {evt.service_type || "Hufbearbeitung"} — {evt.horses?.name || "Pferd"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(evt.date), "dd.MM.yyyy", { locale: de })}
              {evt.profiles?.full_name ? ` · ${evt.profiles.full_name}` : ""}
            </p>
            {evt.completion_notes && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {evt.completion_notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
