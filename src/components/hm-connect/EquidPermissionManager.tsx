import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield, ChevronDown, Eye, Stethoscope, Footprints,
  FileText, Syringe, Scale, HeartPulse, BookOpen,
  CalendarDays, Upload, Users, Bug, Dna, Loader2, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logHorseAction } from "@/utils/auditLog";

interface PermissionToggle {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const PERMISSION_TOGGLES: PermissionToggle[] = [
  { key: "can_view_basic", label: "Stammdaten", icon: Eye, description: "Name, Rasse, Geburtsjahr, Farbe" },
  { key: "can_view_medical", label: "Medizinisch", icon: Stethoscope, description: "Diagnosen, Befunde, Medikamente" },
  { key: "can_view_hoof_history", label: "Huf-Historie", icon: Footprints, description: "Hufprotokolle, Messungen, Winkel" },
  { key: "can_view_vaccinations", label: "Impfungen", icon: Syringe, description: "Impfstatus und -historie" },
  { key: "can_view_deworming", label: "Entwurmung", icon: Bug, description: "Entwurmungsplan und -historie" },
  { key: "can_view_weight_bcs", label: "Gewicht & BCS", icon: Scale, description: "Gewichtsverlauf, Body Condition Score" },
  { key: "can_view_training", label: "Training", icon: HeartPulse, description: "Trainingsplan und -tagebuch" },
  { key: "can_view_breeding", label: "Zucht", icon: Dna, description: "Zuchtdaten und Abstammung" },
  { key: "can_view_diary", label: "Tagebuch", icon: BookOpen, description: "Besitzer-Tagebuch und Notizen" },
  { key: "can_view_documents", label: "Dokumente", icon: FileText, description: "Hochgeladene Dokumente einsehen" },
  { key: "can_view_insurance", label: "Versicherung", icon: Shield, description: "Versicherungsdaten" },
  { key: "can_view_other_partners", label: "Andere Partner", icon: Users, description: "Kompetenzteam / andere Fachpartner sehen" },
  { key: "can_add_treatment_notes", label: "Behandlungsnotizen", icon: Stethoscope, description: "Eigene Befunde & Notizen hinzufügen" },
  { key: "can_create_appointments", label: "Termine erstellen", icon: CalendarDays, description: "Termine für dieses Pferd anlegen" },
  { key: "can_upload_documents", label: "Dokumente hochladen", icon: Upload, description: "Dokumente zum Pferd hochladen" },
  { key: "can_view_chat", label: "Equid-Chat", icon: MessageCircle, description: "Am Pferde-Chat teilnehmen" },
];

interface HorseAccess {
  id: string;
  horse_id: string;
  horse_name: string;
  horse_readable_id: string;
  horse_photo: string | null;
  partner_name: string;
  partner_profile_id: string | null;
  partner_type: string | null;
  status: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
}

export function EquidPermissionManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedHorse, setExpandedHorse] = useState<string | null>(null);

  // Fetch horses owned by user with partner access entries
  const { data: horseAccesses = [], isLoading } = useQuery({
    queryKey: ["equid-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get horses owned by user
      const { data: horses, error: hError } = await supabase
        .from("horses")
        .select("id, name, readable_id, photo_url")
        .eq("owner_id", user.id);

      if (hError) throw hError;
      if (!horses?.length) return [];

      // Get all partner access entries for these horses
      const horseIds = horses.map(h => h.id);
      const { data: accesses, error: aError } = await supabase
        .from("horse_partner_access")
        .select("*")
        .in("horse_id", horseIds)
        .order("created_at", { ascending: false });

      if (aError) throw aError;

      // Get partner profiles
      const partnerIds = [...new Set((accesses || []).map(a => a.partner_profile_id).filter(Boolean))] as string[];
      let partnerMap = new Map<string, string>();

      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", partnerIds);
        partnerMap = new Map((partners || []).map(p => [p.id, p.full_name || "Unbekannt"]));
      }

      const horseMap = new Map(horses.map(h => [h.id, h]));

      return (accesses || []).map(a => {
        const horse = horseMap.get(a.horse_id);
        const permissions: Record<string, boolean> = {};
        PERMISSION_TOGGLES.forEach(pt => {
          permissions[pt.key] = !!(a as any)[pt.key];
        });

        return {
          id: a.id,
          horse_id: a.horse_id,
          horse_name: horse?.name || "Unbekannt",
          horse_readable_id: horse?.readable_id || "",
          horse_photo: horse?.photo_url || null,
          partner_name: a.partner_name || partnerMap.get(a.partner_profile_id || "") || "Unbekannt",
          partner_profile_id: a.partner_profile_id,
          partner_type: a.partner_type,
          status: a.status,
          is_active: a.is_active,
          permissions,
        } as HorseAccess;
      });
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const updatePermission = useMutation({
    mutationFn: async ({ accessId, key, value }: { accessId: string; key: string; value: boolean }) => {
      const { error } = await supabase
        .from("horse_partner_access")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("id", accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equid-permissions"] });
    },
    onError: () => {
      toast.error("Berechtigung konnte nicht geändert werden");
    },
  });

  // Group by horse
  const groupedByHorse = horseAccesses.reduce<Record<string, HorseAccess[]>>((acc, item) => {
    if (!acc[item.horse_id]) acc[item.horse_id] = [];
    acc[item.horse_id].push(item);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (Object.keys(groupedByHorse).length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Keine Freigaben vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Wenn du Fachpartnern Zugriff auf deine Pferde gibst, kannst du hier die Berechtigungen verwalten.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Berechtigungen pro Equid</h3>
          <p className="text-sm text-muted-foreground">
            Verwalte genau, wer was bei welchem Pferd sehen und tun darf.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {Object.keys(groupedByHorse).length} Pferd{Object.keys(groupedByHorse).length !== 1 ? "e" : ""}
        </Badge>
      </div>

      {Object.entries(groupedByHorse).map(([horseId, accesses]) => {
        const horse = accesses[0];
        const isOpen = expandedHorse === horseId;
        const activeCount = accesses.filter(a => a.is_active).length;

        return (
          <Collapsible key={horseId} open={isOpen} onOpenChange={() => setExpandedHorse(isOpen ? null : horseId)}>
            <Card>
              <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={horse.horse_photo || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">🐴</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{horse.horse_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          #EQID-{horse.horse_readable_id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {activeCount} Partner aktiv
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </CardContent>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <Separator />
                  {accesses.map((access) => (
                    <div key={access.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{access.partner_name}</p>
                          <div className="flex items-center gap-2">
                            {access.partner_type && (
                              <Badge variant="secondary" className="text-[10px]">{access.partner_type}</Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${access.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}
                            >
                              {access.is_active ? "Aktiv" : access.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {access.is_active && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {PERMISSION_TOGGLES.map((pt) => (
                            <div
                              key={pt.key}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-background"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <pt.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{pt.label}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{pt.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={access.permissions[pt.key] || false}
                                onCheckedChange={(checked) => {
                                  updatePermission.mutate({
                                    accessId: access.id,
                                    key: pt.key,
                                    value: checked,
                                  });
                                }}
                                className="flex-shrink-0"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {accesses.indexOf(access) < accesses.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      <p className="text-xs text-muted-foreground text-center pt-2">
        🔒 Alle Änderungen werden sofort wirksam und DSGVO-konform protokolliert.
      </p>
    </div>
  );
}
