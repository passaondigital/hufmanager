import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Shield, Heart } from "lucide-react";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

interface InvitationData {
  valid: boolean;
  id?: string;
  horse_name?: string;
  horse_readable_id?: string;
  partner_email?: string;
  partner_name?: string;
  partner_type?: string;
  inviter_name?: string;
  inviter_role?: string;
  can_view_basic?: boolean;
  can_view_hoof_history?: boolean;
  can_view_medical?: boolean;
  can_add_treatment_notes?: boolean;
  can_create_appointments?: boolean;
  access_note?: string;
  status?: string;
  valid_until?: string;
}

export default function PartnerInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      const { data, error } = await supabase.rpc("get_partner_invitation", { p_token: token });
      if (error) {
        console.error("Error fetching invitation:", error);
        setInvitation({ valid: false });
      } else {
        setInvitation(data as unknown as InvitationData);
      }
      setLoading(false);
    };

    fetchInvitation();
  }, [token]);

  const handleLogin = () => {
    sessionStorage.setItem("partner_invite_token", token!);
    navigate("/auth?mode=login");
  };

  const handleSignup = () => {
    sessionStorage.setItem("partner_invite_token", token!);
    const email = invitation?.partner_email || "";
    navigate(`/auth?mode=signup&email=${encodeURIComponent(email)}&role=partner`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (!invitation?.valid || invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Einladung ungültig</h2>
            <p className="text-muted-foreground">
              Diese Einladung ist abgelaufen, wurde bereits verwendet oder existiert nicht.
            </p>
            <Button className="mt-6" onClick={() => navigate("/auth")}>Zur Anmeldung</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = getPartnerTypeConfig(invitation.partner_type);
  const permissions = [
    { key: "can_view_basic", label: "Basisdaten einsehen", active: invitation.can_view_basic },
    { key: "can_view_hoof_history", label: "Huf-Historie einsehen", active: invitation.can_view_hoof_history },
    { key: "can_view_medical", label: "Medizinische Daten einsehen", active: invitation.can_view_medical },
    { key: "can_add_treatment_notes", label: "Behandlungsnotizen anlegen", active: invitation.can_add_treatment_notes },
    { key: "can_create_appointments", label: "Termine erstellen", active: invitation.can_create_appointments },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/30 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <typeConfig.icon className={`h-8 w-8 ${typeConfig.color}`} />
          </div>
          <CardTitle className="text-xl">Einladung als {typeConfig.label}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{invitation.inviter_name}</strong> ({invitation.inviter_role === "provider" ? "Hufbearbeiter" : "Pferdebesitzer"}) hat Ihnen Zugriff gewährt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Horse info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <span className="text-2xl">🐴</span>
            <div>
              <p className="font-semibold text-foreground">{invitation.horse_name}</p>
              {invitation.horse_readable_id && (
                <Badge variant="outline" className="font-mono text-xs">{invitation.horse_readable_id}</Badge>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Ihre Berechtigungen:</p>
            {permissions.map((perm) => (
              <div key={perm.key} className="flex items-center gap-2 text-sm">
                {perm.active ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/30" />
                )}
                <span className={perm.active ? "text-foreground" : "text-muted-foreground"}>
                  {perm.label}
                </span>
              </div>
            ))}
          </div>

          {invitation.access_note && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Nachricht:</p>
              <p className="text-sm text-foreground italic">"{invitation.access_note}"</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button className="w-full" onClick={handleSignup}>
              <Heart className="h-4 w-4 mr-2" />
              Neu registrieren
            </Button>
            <Button variant="outline" className="w-full" onClick={handleLogin}>
              <Shield className="h-4 w-4 mr-2" />
              Bereits registriert? Anmelden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
