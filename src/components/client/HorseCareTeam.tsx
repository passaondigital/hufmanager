import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, UserPlus, Search, Shield, Check, X, Lightbulb, Eye, EyeOff } from "lucide-react";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { InvitePartnerModal } from "@/components/horse-detail/InvitePartnerModal";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  horseId: string;
  horse: any;
}

export function HorseCareTeam({ horseId, horse }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [togglingTeam, setTogglingTeam] = useState(false);

  // Load care team config
  const { data: careTeam } = useQuery({
    queryKey: ["horse-care-team", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_care_team")
        .select("id, horse_id, owner_id, team_sharing_enabled, team_sharing_enabled_at")
        .eq("horse_id", horseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!horseId,
  });

  // Load active partners
  const { data: partners, isLoading } = useQuery({
    queryKey: ["horse-care-partners", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("id, partner_profile_id, partner_name, partner_email, partner_type, status, owner_approved, owner_approved_at, can_view_other_partners, can_view_basic, can_view_hoof_history, can_view_medical, can_add_treatment_notes, can_create_appointments, invited_at, created_at")
        .eq("horse_id", horseId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  // Load pending recommendations
  const { data: recommendations } = useQuery({
    queryKey: ["horse-recommendations", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_recommendations")
        .select("id, recommended_by, recommended_partner_name, recommended_partner_email, recommended_partner_type, reason, status, created_at")
        .eq("horse_id", horseId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId,
  });

  // Load recommender names
  const { data: recommenderProfiles } = useQuery({
    queryKey: ["recommender-profiles", recommendations?.map(r => r.recommended_by)],
    queryFn: async () => {
      const ids = recommendations?.map(r => r.recommended_by).filter(Boolean) || [];
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = p.full_name || "Unbekannt"; });
      return map;
    },
    enabled: !!recommendations && recommendations.length > 0,
  });

  const activePartners = partners?.filter(p => p.status === "active" && p.owner_approved) || [];
  const pendingApproval = partners?.filter(p => p.status === "active" && !p.owner_approved) || [];
  const pendingInvites = partners?.filter(p => p.status === "pending") || [];

  const handleToggleTeamSharing = async (enabled: boolean) => {
    if (!user) return;
    setTogglingTeam(true);
    try {
      if (careTeam) {
        await supabase
          .from("horse_care_team")
          .update({
            team_sharing_enabled: enabled,
            team_sharing_enabled_at: enabled ? new Date().toISOString() : null,
          })
          .eq("id", careTeam.id);
      } else {
        await supabase.from("horse_care_team").insert({
          horse_id: horseId,
          owner_id: user.id,
          team_sharing_enabled: enabled,
          team_sharing_enabled_at: enabled ? new Date().toISOString() : null,
        });
      }

      // Update all approved partners' can_view_other_partners
      if (activePartners.length > 0) {
        await supabase
          .from("horse_partner_access")
          .update({ can_view_other_partners: enabled })
          .eq("horse_id", horseId)
          .eq("owner_approved", true)
          .eq("status", "active");
      }

      toast.success(enabled ? "Team-Freigabe aktiviert" : "Team-Freigabe deaktiviert");
      queryClient.invalidateQueries({ queryKey: ["horse-care-team", horseId] });
      queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
    } catch (err) {
      toast.error("Fehler beim Ändern der Team-Freigabe");
    } finally {
      setTogglingTeam(false);
    }
  };

  const handleApprovePartner = async (partnerId: string) => {
    try {
      await supabase
        .from("horse_partner_access")
        .update({
          owner_approved: true,
          owner_approved_at: new Date().toISOString(),
          can_view_other_partners: careTeam?.team_sharing_enabled || false,
        })
        .eq("id", partnerId);
      toast.success("Zugriff genehmigt");
      queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
    } catch {
      toast.error("Fehler");
    }
  };

  const handleDeclinePartner = async (partnerId: string) => {
    try {
      await supabase
        .from("horse_partner_access")
        .update({ status: "revoked", is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", partnerId);
      toast.success("Zugriff abgelehnt");
      queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
    } catch {
      toast.error("Fehler");
    }
  };

  const handleRevokePartner = async () => {
    if (!revokeId) return;
    try {
      await supabase
        .from("horse_partner_access")
        .update({ status: "revoked", is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", revokeId);
      toast.success("Zugriff entzogen");
      queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
    } catch {
      toast.error("Fehler beim Entziehen des Zugriffs");
    } finally {
      setRevokeId(null);
    }
  };

  const handleAcceptRecommendation = async (rec: any) => {
    if (!user) return;
    try {
      // Create horse_partner_access with owner_approved=true
      await supabase.from("horse_partner_access").insert({
        horse_id: horseId,
        partner_email: rec.recommended_partner_email,
        partner_name: rec.recommended_partner_name,
        partner_type: rec.recommended_partner_type,
        invited_by_client_id: user.id,
        status: "pending",
        is_active: false,
        can_view_basic: true,
        can_view_hoof_history: true,
        can_view_medical: false,
        can_add_treatment_notes: true,
        can_create_appointments: false,
        owner_approved: true,
        owner_approved_at: new Date().toISOString(),
        invited_at: new Date().toISOString(),
      });

      // Update recommendation status
      await supabase
        .from("partner_recommendations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", rec.id);

      toast.success(`Einladung an ${rec.recommended_partner_name} wird gesendet`);
      queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
      queryClient.invalidateQueries({ queryKey: ["horse-recommendations", horseId] });
    } catch {
      toast.error("Fehler beim Annehmen der Empfehlung");
    }
  };

  const handleDeclineRecommendation = async (recId: string) => {
    try {
      await supabase
        .from("partner_recommendations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", recId);
      toast.success("Empfehlung abgelehnt");
      queryClient.invalidateQueries({ queryKey: ["horse-recommendations", horseId] });
    } catch {
      toast.error("Fehler");
    }
  };

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></div>;
  }

  const permLabels = (p: any) => {
    const perms: string[] = [];
    if (p.can_view_basic) perms.push("Stammdaten");
    if (p.can_view_hoof_history) perms.push("Huf");
    if (p.can_view_medical) perms.push("Medizin");
    if (p.can_add_treatment_notes) perms.push("Befunde");
    if (p.can_create_appointments) perms.push("Termine");
    return perms;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Kompetenzteam für {horse?.name || "Pferd"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Du entscheidest wer Zugriff auf die Daten deines Pferdes hat.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Team-Freigabe</p>
              <p className="text-xs text-muted-foreground">
                {careTeam?.team_sharing_enabled
                  ? "Alle Teammitglieder können untereinander relevante Befunde einsehen."
                  : "Partner sehen nur ihre eigenen Einträge."}
              </p>
            </div>
            <Switch
              checked={careTeam?.team_sharing_enabled || false}
              onCheckedChange={handleToggleTeamSharing}
              disabled={togglingTeam}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Owner Approvals (Provider invited without owner consent) */}
      {pendingApproval.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <Shield className="h-4 w-4" />
              Genehmigung erforderlich
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApproval.map((p: any) => {
              const config = getPartnerTypeConfig(p.partner_type);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <config.icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.partner_name}</p>
                      <p className="text-xs text-muted-foreground">{config.label} · {p.partner_email}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Vom Dienstleister eingeladen – deine Zustimmung nötig</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-500/30" onClick={() => handleApprovePartner(p.id)}>
                      <Check className="h-3.5 w-3.5" /> Genehmigen
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeclinePartner(p.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Team Members */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aktive Teammitglieder</CardTitle>
        </CardHeader>
        <CardContent>
          {activePartners.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Teammitglieder.</p>
              <p className="text-xs text-muted-foreground mt-1">Lade Tierärzte, Therapeuten oder andere Partner ein.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePartners.map((p: any) => {
                const config = getPartnerTypeConfig(p.partner_type);
                const perms = permLabels(p);
                return (
                  <div key={p.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <config.icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.partner_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {config.label} · Seit {new Date(p.owner_approved_at || p.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRevokeId(p.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {perms.map(perm => (
                        <Badge key={perm} variant="secondary" className="text-[10px]">✅ {perm}</Badge>
                      ))}
                      {p.can_view_other_partners && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                          <Eye className="h-2.5 w-2.5 mr-0.5" /> Team-Einsicht
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Ausstehende Einladungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((p: any) => {
              const config = getPartnerTypeConfig(p.partner_type);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border">
                  <div>
                    <p className="text-sm font-medium">{p.partner_name}</p>
                    <p className="text-xs text-muted-foreground">{config.label} · {p.partner_email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Ausstehend</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recommendations from providers */}
      {recommendations && recommendations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Empfehlungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec: any) => {
              const config = getPartnerTypeConfig(rec.recommended_partner_type);
              const recommenderName = recommenderProfiles?.[rec.recommended_by] || "Ein Dienstleister";
              return (
                <div key={rec.id} className="p-3 rounded-lg border border-primary/10 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <config.icon className={`h-4 w-4 ${config.color}`} />
                    <p className="text-sm font-medium">
                      {recommenderName} empfiehlt: {rec.recommended_partner_name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.label} · {rec.recommended_partner_email}</p>
                  {rec.reason && (
                    <p className="text-xs text-foreground italic">„{rec.reason}"</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="gap-1" onClick={() => handleAcceptRecommendation(rec)}>
                      <Check className="h-3.5 w-3.5" /> Zugriff gewähren
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeclineRecommendation(rec.id)}>
                      Ablehnen
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button className="flex-1 gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Dienstleister einladen
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/client/search-providers")}>
          <Search className="h-4 w-4" />
          Suchen
        </Button>
      </div>

      {/* Invite Modal */}
      <InvitePartnerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        horseId={horseId}
        horseName={horse?.name || "Pferd"}
        inviterRole="client"
        onSent={() => {
          setInviteOpen(false);
          queryClient.invalidateQueries({ queryKey: ["horse-care-partners", horseId] });
        }}
      />

      {/* Revoke Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zugriff entziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Partner verliert sofort den Zugriff auf dieses Pferd. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokePartner} className="bg-destructive text-destructive-foreground">
              Zugriff entziehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
