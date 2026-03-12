import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";

export function TasksPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Combine several "open task" sources
  const { data = { items: [] } } = useQuery({
    queryKey: ["sidebar-tasks", user?.id],
    queryFn: async () => {
      const items: { id: string; label: string; type: string; urgent?: boolean }[] = [];

      // Open invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("provider_id", user!.id)
        .in("status", ["draft"])
        .limit(2);
      (invoices || []).forEach((i) =>
        items.push({ id: i.id, label: `Rechnung ${i.invoice_number || "Entwurf"}`, type: "invoice" })
      );

      // Unconfirmed appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, horses(name)")
        .eq("provider_id", user!.id)
        .eq("status", "scheduled")
        .eq("is_confirmed_by_client", false)
        .limit(2);
      (appts || []).forEach((a: any) =>
        items.push({ id: a.id, label: `Bestätigung: ${a.horses?.name || "Termin"}`, type: "appointment" })
      );

      return { items: items.slice(0, 5) };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-primary" />
        Offene Aufgaben
      </h3>
      {data.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Alles erledigt ✅</p>
      ) : (
        <div className="space-y-1.5">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-1">
              <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
              <span className="text-xs text-foreground flex-1 truncate">{item.label}</span>
              {item.urgent && <span className="text-[10px]">⚠️</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
