import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ProviderTimelineProps {
  providerId: string;
}

export function ProviderTimeline({ providerId }: ProviderTimelineProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [providerId]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("provider_timeline_events")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(50);

    setEvents(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine Timeline-Einträge.</p>;
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {events.map((evt) => (
        <div key={evt.id} className="flex items-start gap-2 px-3 py-1.5 rounded-md bg-background border text-xs">
          <span className="shrink-0 text-sm">{evt.icon || "📄"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {evt.is_auto ? "🤖" : "👤"}
              </Badge>
              <span className="font-medium truncate">{evt.title}</span>
            </div>
            {evt.description && (
              <p className="text-muted-foreground truncate">{evt.description}</p>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 text-[10px]">
            {format(new Date(evt.created_at), "dd.MM. HH:mm", { locale: de })}
          </span>
        </div>
      ))}
    </div>
  );
}
