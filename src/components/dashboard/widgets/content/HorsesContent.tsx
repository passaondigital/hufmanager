import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import type { WidgetContentProps } from "./types";

export default function HorsesContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data = { total: 0, horses: [] } } = useQuery({
    queryKey: ["widget-horses", user?.id],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("horses")
        .select("id, name, breed", { count: "exact" })
        .is("deleted_at", null)
        .order("name")
        .limit(6);
      return { total: count || 0, horses: data || [] };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{data.total} Pferde aktiv</p>
      <div className="grid grid-cols-2 gap-1.5">
        {data.horses.map((h) => (
          <button
            key={h.id}
            onClick={() => navigate(`/pferd/${h.id}`)}
            className="text-left p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <p className="text-xs font-medium text-foreground truncate">{h.name}</p>
            {h.breed && <p className="text-[10px] text-muted-foreground truncate">{h.breed}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
