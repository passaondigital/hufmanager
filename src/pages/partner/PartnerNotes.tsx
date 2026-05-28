import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { PartnerTreatmentNoteModal } from "@/components/partner/PartnerTreatmentNoteModal";

export default function PartnerNotes() {
  const { user } = useAuth();
  const [showNewNote, setShowNewNote] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">Behandlungsnotizen <HelpTip id="partner.notizen" /></h1>
        <Button onClick={() => { setSelectedHorseId(null); setShowNewNote(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Neue Notiz
        </Button>
      </div>

      {showNewNote && (
        <PartnerTreatmentNoteModal
          isOpen={showNewNote}
          onClose={() => setShowNewNote(false)}
          horseId={selectedHorseId ?? ""}
          partnerId={user?.id ?? ""}
        />
      )}

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium text-foreground">Noch keine Behandlungsnotizen</p>
            <p className="text-sm text-muted-foreground">Tippe auf "Neue Notiz" um die erste Behandlung zu dokumentieren.</p>
            <Button size="sm" onClick={() => setShowNewNote(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Erste Notiz anlegen
            </Button>
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.treatment_date).toLocaleDateString("de-DE")}
                        </p>
                        {note.findings && (
                          <p className="text-sm mt-1.5 text-muted-foreground">{note.findings}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-xs"
                        onClick={() => { setSelectedHorseId(note.horse_id); setShowNewNote(true); }}>
                        <Plus className="h-3.5 w-3.5" /> Folgenotiz
                      </Button>
                    </div>
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
