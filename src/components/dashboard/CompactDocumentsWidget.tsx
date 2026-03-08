import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function CompactDocumentsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: docs } = useQuery({
    queryKey: ["recent-office-docs-dash", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("office_documents")
        .select("id, title, status, horse_name, last_edited_at")
        .eq("provider_id", user!.id)
        .neq("status", "archived")
        .order("last_edited_at", { ascending: false })
        .limit(2);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!docs || docs.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Dokumente
        </span>
        <button
          onClick={() => navigate("/mein-office")}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
        >
          Alle <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="divide-y divide-border">
        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => navigate(`/mein-office/${doc.id}`)}
            className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {doc.horse_name ? `${doc.horse_name} · ` : ""}
                {doc.last_edited_at
                  ? formatDistanceToNow(new Date(doc.last_edited_at), { locale: de, addSuffix: true })
                  : ""}
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
              doc.status === "completed"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}>
              {doc.status === "completed" ? "Fertig" : "Entwurf"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
