import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";

export default function PartnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["partner-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, readable_id, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: grants, isLoading } = useQuery({
    queryKey: ["partner-horse-grants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horse_partner_access")
        .select(`
          *,
          horses:horse_id (id, name, readable_id, photo_url, breed, owner_id)
        `)
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch partner type from the first grant
  const partnerType = grants?.[0]?.partner_type;
  const typeConfig = getPartnerTypeConfig(partnerType);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Willkommen{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {profile?.readable_id && (
            <Badge variant="outline" className="font-mono text-xs">
              {profile.readable_id}
            </Badge>
          )}
          {partnerType && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <typeConfig.icon className={`h-3 w-3 ${typeConfig.color}`} />
              {typeConfig.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Horse Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Meine Pferde</h2>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : !grants || grants.length === 0 ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-8 text-center">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">
                Du hast noch keinen Zugriff auf Pferde.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Warte auf eine Einladung von einem Hufbearbeiter oder Pferdebesitzer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {grants.map((grant: any) => {
              const horse = grant.horses;
              if (!horse) return null;

              return (
                <Card
                  key={grant.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/partner-horse/${horse.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        🐴
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{horse.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {horse.readable_id && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {horse.readable_id}
                            </Badge>
                          )}
                          {horse.breed && (
                            <span className="text-xs text-muted-foreground">{horse.breed}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {grant.can_view_medical && (
                          <Badge variant="secondary" className="text-[10px]">Medizin</Badge>
                        )}
                        {grant.can_add_treatment_notes && (
                          <Badge variant="secondary" className="text-[10px]">Notizen</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
