import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Info, Footprints, Activity, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PartnerTreatmentNoteModal } from "@/components/partner/PartnerTreatmentNoteModal";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

export default function PartnerHorseView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  // Fetch the grant for this horse
  const { data: grant, isLoading: grantLoading } = useQuery({
    queryKey: ["partner-grant", user?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("*")
        .eq("partner_profile_id", user!.id)
        .eq("horse_id", id!)
        .eq("status", "active")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch horse data
  const { data: horse, isLoading: horseLoading } = useQuery({
    queryKey: ["partner-horse", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id!)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!grant,
  });

  // Fetch treatment notes
  const { data: notes } = useQuery({
    queryKey: ["partner-treatment-notes", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select("*")
        .eq("horse_id", id!)
        .eq("partner_id", user!.id)
        .order("treatment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!user && !!grant?.can_add_treatment_notes,
  });

  const isLoading = grantLoading || horseLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Kein Zugriff auf dieses Pferd</p>
          <Button onClick={() => navigate("/partner-home")}>Zurück</Button>
        </div>
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Pferd nicht gefunden</p>
      </div>
    );
  }

  const availableTabs: { value: string; label: string; icon: any }[] = [];
  if (grant.can_view_basic) {
    availableTabs.push({ value: "uebersicht", label: "Übersicht", icon: Info });
  }
  if (grant.can_view_hoof_history) {
    availableTabs.push({ value: "huf-historie", label: "Huf-Historie", icon: Footprints });
  }
  if (grant.can_view_medical) {
    availableTabs.push({ value: "medizin", label: "Medizin", icon: Activity });
  }
  if (grant.can_add_treatment_notes) {
    availableTabs.push({ value: "notizen", label: "Meine Notizen", icon: FileText });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner-home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{horse.name}</h1>
          {(horse as any).readable_id && (
            <Badge variant="outline" className="font-mono text-xs mt-0.5">
              {(horse as any).readable_id}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={availableTabs[0]?.value || "uebersicht"} className="space-y-4">
        <TabsList className={`grid w-full grid-cols-${availableTabs.length}`}>
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Übersicht */}
        {grant.can_view_basic && (
          <TabsContent value="uebersicht">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stammdaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{horse.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rasse</p>
                    <p className="font-medium">{(horse as any).breed || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Geburtsjahr</p>
                    <p className="font-medium">{(horse as any).birth_year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Geschlecht</p>
                    <p className="font-medium">{(horse as any).gender || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Huf-Historie (read-only) */}
        {grant.can_view_hoof_history && (
          <TabsContent value="huf-historie">
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Footprints className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Huf-Historie</p>
                <p className="text-sm mt-1">Nur-Lesen Zugriff auf die Hufhistorie dieses Pferdes.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Medical (read-only) */}
        {grant.can_view_medical && (
          <TabsContent value="medizin">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Medizinische Daten — Nur-Lesen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Gesundheitsstatus</p>
                  <p className="font-medium">{(horse as any).health_status || "Keine Angaben"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Krankengeschichte</p>
                  <p className="text-sm">{(horse as any).medical_history || "Keine Einträge"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Besondere Hinweise</p>
                  <p className="text-sm">{(horse as any).special_notes || "Keine"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Treatment Notes */}
        {grant.can_add_treatment_notes && (
          <TabsContent value="notizen">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Meine Behandlungsnotizen</h3>
                <Button size="sm" onClick={() => setNoteModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Neue Notiz
                </Button>
              </div>

              {!notes || notes.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Noch keine Notizen für dieses Pferd.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <Card key={note.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{note.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.treatment_date).toLocaleDateString("de-DE")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {note.visible_to_pid && <Badge variant="outline" className="text-[10px]">PID</Badge>}
                            {note.visible_to_kid && <Badge variant="outline" className="text-[10px]">KID</Badge>}
                          </div>
                        </div>
                        {note.findings && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Befund:</p>
                            <p className="text-sm">{note.findings}</p>
                          </div>
                        )}
                        {note.notes && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Behandlung:</p>
                            <p className="text-sm">{note.notes}</p>
                          </div>
                        )}
                        {note.next_treatment && (
                          <p className="text-xs text-primary mt-2">
                            Nächster Termin: {new Date(note.next_treatment).toLocaleDateString("de-DE")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {noteModalOpen && (
              <PartnerTreatmentNoteModal
                open={noteModalOpen}
                onClose={() => setNoteModalOpen(false)}
                horseId={id!}
                partnerType={grant.partner_type}
                onSaved={() => {
                  setNoteModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["partner-treatment-notes", id] });
                }}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
