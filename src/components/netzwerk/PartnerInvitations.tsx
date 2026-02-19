import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Eye, Calendar, Stethoscope, Loader2, UserPlus } from "lucide-react";

interface AccessGrant {
  id: string;
  provider_id: string;
  client_id: string;
  partner_email: string | null;
  partner_name: string | null;
  status: string;
  is_active: boolean | null;
  can_view_basic: boolean | null;
  can_view_medical: boolean | null;
  can_create_appointments: boolean | null;
  granted_at: string;
  request_message: string | null;
}

export function PartnerInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending partner invitations for this user (by email)
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["partner-invitations", user?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("access_grants")
        .select("*")
        .eq("partner_email", user.email)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return data as AccessGrant[];
    },
    enabled: !!user?.email,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ grantId, accept }: { grantId: string; accept: boolean }) => {
      setProcessingId(grantId);

      // Get grant details for webhook
      const grant = invitations.find((i) => i.id === grantId);

      // Call ecosystem-webhook (same Supabase instance)
      const { error: webhookError } = await supabase.functions.invoke("ecosystem-webhook", {
        body: {
          source_app: "hufmanager",
          event: accept ? "partner_accepted" : "partner_rejected",
          ecosystem_user_id: grant?.provider_id,
          partner_email: grant?.partner_email,
          grant_id: grantId,
        },
      });

      if (webhookError) throw webhookError;
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      toast({
        title: accept ? "Einladung angenommen" : "Einladung abgelehnt",
        description: accept
          ? "Du hast jetzt Zugriff auf die freigegebenen Daten."
          : "Die Einladung wurde abgelehnt.",
      });
      setProcessingId(null);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Aktion fehlgeschlagen.", variant: "destructive" });
      setProcessingId(null);
    },
  });

  const pending = invitations.filter((i) => i.status === "pending");
  const active = invitations.filter((i) => i.status === "active" && i.is_active);
  const rejected = invitations.filter((i) => i.status === "rejected");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Keine Partner-Einladungen vorhanden.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Einladungen von Hufbearbeitern oder Pferdebesitzern erscheinen hier.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ausstehend ({pending.length})
          </h3>
          {pending.map((grant) => (
            <InvitationCard
              key={grant.id}
              grant={grant}
              onAccept={() => respondMutation.mutate({ grantId: grant.id, accept: true })}
              onReject={() => respondMutation.mutate({ grantId: grant.id, accept: false })}
              isProcessing={processingId === grant.id}
            />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Aktiv ({active.length})
          </h3>
          {active.map((grant) => (
            <InvitationCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Abgelehnt ({rejected.length})
          </h3>
          {rejected.map((grant) => (
            <InvitationCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  grant,
  onAccept,
  onReject,
  isProcessing,
}: {
  grant: AccessGrant;
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}) {
  const isPending = grant.status === "pending";
  const isActive = grant.status === "active";

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Ausstehend", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    active: { label: "Aktiv", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    rejected: { label: "Abgelehnt", className: "bg-destructive/15 text-destructive border-destructive/30" },
  };

  const config = statusConfig[grant.status] || statusConfig.pending;

  return (
    <Card className={isPending ? "border-amber-500/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {grant.partner_name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{grant.partner_name || "Unbekannt"}</span>
              <Badge variant="outline" className={config.className}>
                {config.label}
              </Badge>
            </div>

            {grant.request_message && (
              <p className="text-sm text-muted-foreground mb-2">"{grant.request_message}"</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {grant.can_view_basic && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Eye className="h-3 w-3" /> Basisdaten
                </Badge>
              )}
              {grant.can_view_medical && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Stethoscope className="h-3 w-3" /> Medizinisch
                </Badge>
              )}
              {grant.can_create_appointments && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Calendar className="h-3 w-3" /> Termine
                </Badge>
              )}
            </div>
          </div>

          {isPending && onAccept && onReject && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={onAccept} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
