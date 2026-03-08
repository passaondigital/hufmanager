import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export function LeadsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: leads = [] } = useQuery({
    queryKey: ["dashboard-leads", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, created_at, status")
        .eq("provider_id", user!.id)
        .eq("status", "neu")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (leads.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Offene Anfragen
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {leads.length}
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {leads.slice(0, 2).map((lead) => (
          <button
            key={lead.id}
            onClick={() => navigate("/anfragen")}
            className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(lead.created_at), { locale: de, addSuffix: true })}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        ))}
        {leads.length > 2 && (
          <button
            onClick={() => navigate("/anfragen")}
            className="w-full p-2 text-xs text-primary hover:underline text-center"
          >
            + {leads.length - 2} weitere
          </button>
        )}
      </div>
    </div>
  );
}
