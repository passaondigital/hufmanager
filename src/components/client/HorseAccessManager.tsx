import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Plus, HelpCircle, Clock, UserX } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { ChevronDown } from "lucide-react";
import { AccessGrantModal } from "./AccessGrantModal";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  horseId: string;
  horseName: string;
}

const PARTNER_TYPE_ICONS: Record<string, string> = {
  partner: "🩺",
  farrier: "⚒️",
  hoof_care: "🔨",
  physio: "🖐️",
  osteo: "🖐️",
  saddler: "🐴",
  trainer: "🏇",
  insurance: "🛡️",
  authority: "⚖️",
  other: "👤",
};

const PARTNER_TYPE_LABELS: Record<string, string> = {
  partner: "Tierarzt/Therapeut",
  farrier: "Hufschmied",
  hoof_care: "Hufbearbeiter",
  physio: "Physiotherapeut",
  osteo: "Osteopath",
  saddler: "Sattler",
  trainer: "Trainer",
  insurance: "Versicherung",
  authority: "Behörde",
  other: "Sonstige",
};

const PERMISSION_LABELS: Record<string, string> = {
  can_view_medical: "Gesundheit",
  can_view_vaccinations: "Impfpass",
  can_view_deworming: "Entwurmung",
  can_view_weight_bcs: "Gewicht/BCS",
  can_view_documents: "Dokumente",
  can_upload_documents: "Docs hochladen",
  can_view_diary: "Tagebuch",
  can_view_insurance: "Versicherung",
  can_view_breeding: "Abstammung",
  can_view_training: "Ausbildung",
};

interface GrantRow {
  id: string;
  horse_id: string;
  partner_profile_id: string;
  partner_type: string | null;
  is_active: boolean;
  can_view_medical: boolean;
  can_view_vaccinations: boolean;
  can_view_deworming: boolean;
  can_view_weight_bcs: boolean;
  can_view_documents: boolean;
  can_upload_documents: boolean;
  can_view_diary: boolean;
  can_view_insurance: boolean;
  can_view_breeding: boolean;
  can_view_training: boolean;
  valid_until: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  partner_name?: string;
  partner_readable_id?: string;
  partner_avatar?: string;
}

function getStatusBadge(grant: GrantRow) {
  if (grant.revoked_at) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Widerrufen</Badge>;
  }
  if (grant.valid_until) {
    const expiry = new Date(grant.valid_until);
    if (expiry < new Date()) {
      return <Badge variant="destructive">Abgelaufen</Badge>;
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0">
        <Clock className="h-3 w-3 mr-1" />
        Bis {format(expiry, "dd.MM.yyyy")}
      </Badge>
    );
  }
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">Aktiv</Badge>;
}

export function HorseAccessManager({ horseId, horseName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<GrantRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Fetch active grants with partner profile info
  const { data: grants, isLoading } = useQuery({
    queryKey: ["horse-access-grants", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select("*")
        .eq("horse_id", horseId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch partner profiles
      const partnerIds = (data || []).map((g: any) => g.partner_profile_id).filter(Boolean);
      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, avatar_url")
        .in("id", partnerIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (data || []).map((g: any) => ({
        ...g,
        partner_name: profileMap.get(g.partner_profile_id)?.full_name || "Unbekannt",
        partner_readable_id: profileMap.get(g.partner_profile_id)?.readable_id || "",
        partner_avatar: profileMap.get(g.partner_profile_id)?.avatar_url || "",
      })) as GrantRow[];
    },
    enabled: !!horseId,
  });

  // Fetch audit history
  const { data: auditHistory } = useQuery({
    queryKey: ["horse-access-audit", horseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_audit_log")
        .select("*")
        .eq("horse_id", horseId)
        .in("action_type", ["grant_access", "revoke_access"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!horseId && historyOpen,
  });

  const handleRevoke = async () => {
    if (!revokeTarget || !user) return;
    try {
      const { error } = await supabase
        .from("horse_partner_access")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          is_active: false,
        })
        .eq("id", revokeTarget.id);

      if (error) throw error;

      // Audit log
      await supabase.from("horse_audit_log").insert({
        horse_id: horseId,
        actor_id: user.id,
        action_type: "revoke_access",
        action_detail: {
          partner_name: revokeTarget.partner_name,
          partner_id: revokeTarget.partner_profile_id,
        },
      });

      // Notification to partner
      await supabase.from("notifications").insert({
        user_id: revokeTarget.partner_profile_id,
        title: "Zugriff widerrufen",
        message: `🔒 Dein Zugriff auf ${horseName} wurde vom Besitzer widerrufen.`,
        type: "access_revoked",
        link: "/partner-dashboard",
      });

      toast.success(`Zugriff für ${revokeTarget.partner_name} entzogen`);
      queryClient.invalidateQueries({ queryKey: ["horse-access-grants", horseId] });
      queryClient.invalidateQueries({ queryKey: ["horse-access-audit", horseId] });
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler beim Entziehen des Zugriffs");
    } finally {
      setRevokeTarget(null);
    }
  };

  const activePermissions = (grant: GrantRow) => {
    return Object.entries(PERMISSION_LABELS).filter(
      ([key]) => (grant as any)[key] === true
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Zugriffsrechte für {horseName}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Hier siehst du wer Zugriff auf die Daten deines Pferdes hat. Du kannst Rechte jederzeit gewähren oder entziehen.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Du entscheidest wer was sehen darf. Du kannst Rechte jederzeit widerrufen.
            </p>
          </CardHeader>
        </Card>

        {/* Active Grants */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : grants && grants.length > 0 ? (
          <div className="space-y-3">
            {grants.map((grant) => (
              <Card key={grant.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Partner Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                        {grant.partner_avatar ? (
                          <img src={grant.partner_avatar} className="h-10 w-10 rounded-full object-cover" alt="" />
                        ) : (
                          PARTNER_TYPE_ICONS[grant.partner_type || "other"] || "👤"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{grant.partner_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PARTNER_TYPE_LABELS[grant.partner_type || "other"] || "Partner"}
                          {grant.partner_readable_id && ` · #${grant.partner_readable_id}`}
                        </p>
                        {grant.granted_at && (
                          <p className="text-xs text-muted-foreground">
                            Seit {format(new Date(grant.granted_at), "dd.MM.yyyy", { locale: de })}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(grant)}
                  </div>

                  {/* Permissions Grid */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <Badge
                        key={key}
                        variant={(grant as any)[key] ? "default" : "outline"}
                        className={
                          (grant as any)[key]
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs"
                            : "text-xs opacity-50"
                        }
                      >
                        {(grant as any)[key] ? "✅" : "❌"} {label}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setRevokeTarget(grant)}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Zugriff entziehen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                Noch keine Zugriffsrechte vergeben.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Erteile Tierärzten, Therapeuten oder anderen Partnern Zugriff auf die Daten deines Pferdes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Grant Access Button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => setGrantModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Zugriff gewähren
        </Button>

        {/* History Accordion */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground">
              Zugriffshistorie anzeigen
              <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="p-4 space-y-2">
                {auditHistory && auditHistory.length > 0 ? (
                  auditHistory.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-2 text-sm py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), "dd.MM.yy HH:mm")}
                      </span>
                      <span>
                        {entry.action_type === "grant_access" ? "🟢 Zugriff gewährt" : "🔴 Zugriff entzogen"}
                        {entry.action_detail?.partner_name && ` für ${entry.action_detail.partner_name}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Keine Historie vorhanden</p>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Revoke Dialog */}
        <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zugriff entziehen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchtest du {revokeTarget?.partner_name} den Zugriff auf {horseName} wirklich entziehen?
                {" "}{revokeTarget?.partner_name} wird sofort keinen Zugriff mehr haben.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Zugriff entziehen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Grant Modal */}
        <AccessGrantModal
          open={grantModalOpen}
          onClose={() => setGrantModalOpen(false)}
          horseId={horseId}
          horseName={horseName}
          onGranted={() => {
            queryClient.invalidateQueries({ queryKey: ["horse-access-grants", horseId] });
            queryClient.invalidateQueries({ queryKey: ["horse-access-audit", horseId] });
          }}
        />
      </div>
    </TooltipProvider>
  );
}
