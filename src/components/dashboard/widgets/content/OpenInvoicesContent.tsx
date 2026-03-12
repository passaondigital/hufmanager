import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { WidgetContentProps } from "./types";

export default function OpenInvoicesContent(_props: WidgetContentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: invoices = [] } = useQuery({
    queryKey: ["widget-open-invoices", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, client_name, status")
        .eq("provider_id", user!.id)
        .in("status", ["draft", "sent", "overdue"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (invoices.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Keine offenen Rechnungen</p>;
  }

  return (
    <div className="space-y-1">
      {invoices.map((inv) => (
        <button
          key={inv.id}
          onClick={() => navigate("/rechnungen")}
          className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-muted/50 rounded transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{inv.invoice_number}</p>
            <p className="text-[10px] text-muted-foreground truncate">{inv.client_name}</p>
          </div>
          <span className="text-xs font-bold text-foreground shrink-0 ml-2">
            {(inv.total_amount || 0).toFixed(2)} €
          </span>
        </button>
      ))}
    </div>
  );
}
