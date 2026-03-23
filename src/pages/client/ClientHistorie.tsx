import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { History, Calendar, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientHistorie() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["client-service-history", user?.id, filter],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, date, time, status, service_type, notes, location, price, horses(name), profiles!appointments_provider_id_fkey(full_name, business_name)")
        .eq("client_id", user!.id)
        .order("date", { ascending: false })
        .limit(50);
      
      if (filter === "completed") q = q.in("status", ["completed", "done"]);
      if (filter === "cancelled") q = q.eq("status", "cancelled");
      if (filter === "all") q = q.in("status", ["completed", "done", "cancelled"]);

      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const filters = [
    { key: "all", label: "Alle" },
    { key: "completed", label: "Erledigt" },
    { key: "cancelled", label: "Storniert" },
  ] as const;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">Service-Historie</h1>

      {/* Filter pills */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">Noch keine Einträge</h3>
          <p className="text-xs text-muted-foreground">Deine Service-Historie erscheint hier nach dem ersten Termin.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {history.map((item: any) => (
            <div key={item.id} className="p-3 flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                item.status === "completed" || item.status === "done"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-500"
              )}>
                {item.status === "cancelled" ? <Calendar className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{(item.horses as any)?.name || item.service_type || "Hufbearbeitung"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.date), "d. MMM yyyy", { locale: de })}
                  {item.time && ` · ${item.time.slice(0, 5)}`}
                  {(item.profiles as any)?.business_name && ` · ${(item.profiles as any).business_name}`}
                </p>
                {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>}
              </div>
              {item.price && (
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">{item.price} €</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
