import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

export default function PartnerProfile() {
  const { user, signOut } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["partner-profile-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: grants, isLoading: grantsLoading } = useQuery({
    queryKey: ["partner-all-grants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select(`
          *,
          horses:horse_id (name, readable_id)
        `)
        .eq("partner_profile_id", user!.id)
        .in("status", ["active", "pending"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleSelfRevoke = async (grantId: string) => {
    const { error } = await supabase
      .from("horse_partner_access")
      .update({ status: "revoked", is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", grantId)
      .eq("partner_profile_id", user!.id);

    if (error) {
      toast.error("Fehler beim Widerrufen");
    } else {
      toast.success("Zugriff widerrufen");
    }
  };

  if (profileLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const partnerType = grants?.[0]?.partner_type;
  const typeConfig = getPartnerTypeConfig(partnerType);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Mein Profil</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile?.full_name || "—"}</h2>
              <div className="flex items-center gap-2 mt-1">
                {profile?.readable_id && (
                  <Badge variant="outline" className="font-mono">{profile.readable_id}</Badge>
                )}
                {partnerType && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
                    {typeConfig.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Grants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Meine Zugänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grantsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !grants || grants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine aktiven Zugänge</p>
          ) : (
            <div className="space-y-3">
              {grants.map((grant: any) => (
                <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">🐴 {grant.horses?.name || "—"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant={grant.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {grant.status === "active" ? "Aktiv" : "Ausstehend"}
                      </Badge>
                    </div>
                  </div>
                  {grant.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleSelfRevoke(grant.id)}
                    >
                      <X className="h-4 w-4 mr-1" /> Widerrufen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-destructive" onClick={() => signOut()}>
        Abmelden
      </Button>
    </div>
  );
}
