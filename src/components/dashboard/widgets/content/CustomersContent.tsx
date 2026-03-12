import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function CustomersContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: customers = [] } = useQuery({
    queryKey: ["widget-customers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, city, created_at")
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (customers.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Noch keine Kunden</p>;
  }

  return (
    <div className="space-y-1">
      {customers.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate("/kunden")}
          className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-muted/50 rounded transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
            {c.city && <p className="text-[10px] text-muted-foreground">{c.city}</p>}
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      ))}
      <button onClick={() => navigate("/kunden")} className="w-full text-xs text-primary hover:underline text-center pt-1">
        Alle Kunden →
      </button>
    </div>
  );
}
