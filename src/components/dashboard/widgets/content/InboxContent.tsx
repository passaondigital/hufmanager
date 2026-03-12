import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { WidgetContentProps } from "./types";

export default function InboxContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: leads = [] } = useQuery({
    queryKey: ["widget-inbox", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, created_at, status")
        .eq("provider_id", user!.id)
        .eq("status", "neu")
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (leads.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine neuen Anfragen</p>;
  }

  return (
    <div className="space-y-1">
      {leads.map((lead) => (
        <button
          key={lead.id}
          onClick={() => navigate("/anfragen")}
          className="w-full flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded transition-colors text-left"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{lead.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(lead.created_at), { locale: de, addSuffix: true })}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
