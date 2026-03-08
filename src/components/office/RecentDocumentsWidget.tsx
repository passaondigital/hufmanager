import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle2, FileEdit, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function RecentDocumentsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: docs } = useQuery({
    queryKey: ["recent-office-docs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("office_documents")
        .select("id, title, status, horse_name, last_edited_at, template_type")
        .eq("provider_id", user!.id)
        .neq("status", "archived")
        .order("last_edited_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!docs || docs.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Zuletzt bearbeitet
        </h3>
        <button
          onClick={() => navigate("/mein-office")}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Alle <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            onClick={() => navigate(`/mein-office/${doc.id}`)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className={cn(
              "p-1.5 rounded-md shrink-0",
              doc.status === "completed" ? "bg-emerald-500/15" : "bg-muted"
            )}>
              {doc.status === "completed"
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                : <FileEdit className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {doc.horse_name ? `${doc.horse_name} · ` : ""}
                {doc.last_edited_at
                  ? formatDistanceToNow(new Date(doc.last_edited_at), { locale: de, addSuffix: true })
                  : ""}
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
              doc.status === "completed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            )}>
              {doc.status === "completed" ? "Fertig" : "Entwurf"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
