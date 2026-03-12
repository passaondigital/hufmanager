import { useState } from "react";
import { ServiceOrderWizard } from "@/components/client/ServiceOrderWizard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Mail, Shield, X, ChevronDown, ChevronUp, Clock, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { InvitePartnerModal } from "@/components/horse-detail/InvitePartnerModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  horseId: string;
  horseName: string;
  inviterRole: "provider" | "client";
}

export function HorsePartnerPanel({ horseId, horseName, inviterRole }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(true);

  const { data: grants, isLoading } = useQuery({
    queryKey: ["horse-partner-grants", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("*")
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  const { data: treatmentNotes } = useQuery({
    queryKey: ["horse-partner-notes", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_treatment_notes")
        .select("*")
        .eq("horse_id", horseId)
        .eq("visible_to_pid", true)
        .order("treatment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  const activeGrants = grants?.filter((g: any) => g.status === "active") || [];
  const pendingGrants = grants?.filter((g: any) => g.status === "pending") || [];

  const handleRevoke = async () => {
    if (!revokeId) return;
    const { error } = await supabase
      .from("horse_partner_access")
      .update({ status: "revoked", is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", revokeId);

    if (error) {
      toast.error("Fehler beim Widerrufen");
    } else {
      toast.success("Zugriff widerrufen");
      queryClient.invalidateQueries({ queryKey: ["horse-partner-grants", horseId] });
    }
    setRevokeId(null);
  };

  const handleResendInvite = async (grant: any) => {
    try {
      const { error } = await supabase.functions.invoke("send-partner-invitation", {
        body: {
          horse_id: horseId,
          partner_email: grant.partner_email,
          partner_name: grant.partner_name,
          partner_type: grant.partner_type,
          permissions: {
            can_view_basic: grant.can_view_basic,
            can_view_hoof_history: grant.can_view_hoof_history,
            can_view_medical: grant.can_view_medical,
            can_add_treatment_notes: grant.can_add_treatment_notes,
            can_create_appointments: grant.can_create_appointments,
          },
          invited_by_role: inviterRole,
        },
      });
      if (error) throw error;
      toast.success("Einladung erneut gesendet");
    } catch (err) {
      toast.error("Fehler beim erneuten Senden");
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Active Partners */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Aktive Partner
          </CardTitle>
          <Button size="sm" onClick={() => setInviteModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Partner einladen
          </Button>
        </CardHeader>
        <CardContent>
          {activeGrants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine aktiven Partner für dieses Pferd.</p>
          ) : (
            <div className="space-y-3">
              {activeGrants.map((grant: any) => {
                const typeConfig = getPartnerTypeConfig(grant.partner_type);
                return (
                  <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center`}>
                        <typeConfig.icon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{grant.partner_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{typeConfig.label}</Badge>
                          <span className="text-xs text-muted-foreground">{grant.partner_email}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeId(grant.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Notes from Partners */}
      {treatmentNotes && treatmentNotes.length > 0 && (
        <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Behandlungsnotizen von Partnern
                  <Badge variant="secondary" className="ml-1">{treatmentNotes.length}</Badge>
                </CardTitle>
                {notesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {treatmentNotes.map((note: any) => {
                  const noteTypeConfig = getPartnerTypeConfig(note.partner_type);
                  return (
                    <div key={note.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <noteTypeConfig.icon className={`h-3 w-3 ${noteTypeConfig.color}`} />
                          {noteTypeConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.treatment_date).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{note.title}</p>
                      {note.findings && <p className="text-sm text-muted-foreground mt-1">{note.findings}</p>}
                      {note.next_treatment && (
                        <p className="text-xs text-primary mt-2">
                          Nächster Termin: {new Date(note.next_treatment).toLocaleDateString("de-DE")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Pending Invitations */}
      {pendingGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Ausstehende Einladungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingGrants.map((grant: any) => {
              const typeConfig = getPartnerTypeConfig(grant.partner_type);
              return (
                <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border">
                  <div>
                    <p className="font-medium text-foreground">{grant.partner_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{typeConfig.label}</Badge>
                      <span className="text-xs text-muted-foreground">{grant.partner_email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Eingeladen: {new Date(grant.invited_at).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleResendInvite(grant)}>
                      <Mail className="h-3 w-3 mr-1" /> Erneut senden
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setRevokeId(grant.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InvitePartnerModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          horseId={horseId}
          horseName={horseName}
          inviterRole={inviterRole}
          onSent={() => {
            setInviteModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["horse-partner-grants", horseId] });
          }}
        />
      )}

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zugriff widerrufen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Partner verliert sofort den Zugriff auf dieses Pferd. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
              Widerrufen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
