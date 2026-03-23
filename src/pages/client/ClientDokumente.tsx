import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Download, Loader2, FolderOpen } from "lucide-react";

export default function ClientDokumente() {
  const { user } = useAuth();

  // Get all horses owned by user, then their documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["client-all-documents", user?.id],
    queryFn: async () => {
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name")
        .eq("owner_id", user!.id)
        .is("deleted_at", null);

      if (!horses || horses.length === 0) return [];

      const horseIds = horses.map(h => h.id);
      const horseMap = Object.fromEntries(horses.map(h => [h.id, h.name]));

      const { data: docs } = await supabase
        .from("horse_documents")
        .select("*")
        .in("horse_id", horseIds)
        .order("created_at", { ascending: false });

      return (docs ?? []).map((d: any) => ({
        ...d,
        horse_name: horseMap[d.horse_id] || "Unbekannt",
      }));
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">Meine Dokumente</h1>
      <p className="text-sm text-muted-foreground">Alle Dokumente deiner Pferde an einem Ort.</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border bg-card">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">Noch keine Dokumente</h3>
          <p className="text-xs text-muted-foreground">Dokumente werden hier angezeigt, sobald dein Hufbearbeiter welche hochlädt.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{doc.title || doc.file_name || "Dokument"}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.horse_name} · {doc.created_at ? format(new Date(doc.created_at), "d. MMM yyyy", { locale: de }) : ""}
                </p>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
