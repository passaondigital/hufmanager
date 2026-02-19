import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function PartnerNotes() {
  const { user } = useAuth();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["partner-all-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select(`
          *,
          horses:horse_id (name, readable_id)
        `)
        .eq("partner_id", user!.id)
        .order("treatment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Group by horse
  const grouped = (notes || []).reduce((acc: Record<string, any[]>, note: any) => {
    const horseName = note.horses?.name || "Unbekannt";
    if (!acc[horseName]) acc[horseName] = [];
    acc[horseName].push(note);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Behandlungsnotizen</h1>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Noch keine Behandlungsnotizen vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([horseName, horseNotes]) => (
          <div key={horseName}>
            <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              🐴 {horseName}
              <Badge variant="secondary" className="text-xs">{(horseNotes as any[]).length}</Badge>
            </h2>
            <div className="space-y-2">
              {(horseNotes as any[]).map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.treatment_date).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </div>
                    {note.findings && (
                      <p className="text-sm mt-2 text-muted-foreground">{note.findings}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
