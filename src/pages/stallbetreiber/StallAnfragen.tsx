import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Inbox, Loader2, Mail, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function StallAnfragen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "accepted">("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["stall-anfragen", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = filter === "all" ? leads
    : leads.filter((l: any) => filter === "pending" ? l.status === "new" || l.status === "pending" : l.status === "accepted");

  const filters = [
    { key: "all", label: "Alle" },
    { key: "pending", label: "Offen" },
    { key: "accepted", label: "Angenommen" },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Anfragen & Leads</h1>
      <p className="text-sm text-muted-foreground">Boxenanfragen und Interessenten für deinen Stall.</p>

      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border",
              filter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >{f.label}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">Keine Anfragen</h3>
          <p className="text-xs text-muted-foreground">Neue Anfragen von Interessenten erscheinen hier.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {filtered.map((lead: any) => (
            <div key={lead.id} className="flex items-center gap-3 p-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                lead.status === "accepted" ? "bg-green-500/10" : "bg-primary/10"
              )}>
                {lead.status === "accepted" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Mail className="h-4 w-4 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{lead.name || lead.email || "Anfrage"}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.created_at && format(new Date(lead.created_at), "d. MMM yyyy", { locale: de })}
                  {lead.message && ` · ${lead.message.slice(0, 50)}...`}
                </p>
              </div>
              <div className={cn(
                "text-[10px] px-2 py-0.5 rounded-full",
                lead.status === "accepted" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
              )}>
                {lead.status === "accepted" ? "Angenommen" : "Offen"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
