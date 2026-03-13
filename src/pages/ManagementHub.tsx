import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { User, Globe, MessageSquare, CreditCard, FileText, Mic } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";

// Map old ?tab= params to new routes
const TAB_REDIRECTS: Record<string, string> = {
  profil: "/management/profil",
  website: "/management/website",
  kommunikation: "/management/kommunikation",
  abo: "/management/abo",
  rechtliches: "/management/rechtliches",
};

// Plan display names
const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  advanced: "Advanced",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

export default function ManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { plan } = useSubscription();

  // Redirect old ?tab=... deep links
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  const { data: settings } = useQuery({
    queryKey: ["business-settings-hub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("subdomain, subdomain_active")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const hasWebsite = settings?.subdomain_active && settings?.subdomain;
  const planLabel = plan ? PLAN_LABELS[plan] || plan : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Einstellungen">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Profil, Zertifikate, Fotos"
          onClick={() => navigate("/management/profil")}
        />
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Meine Website"
          description="Website, Domain, Vorschau"
          status={
            !hasWebsite ? (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                Einrichten
              </Badge>
            ) : undefined
          }
          onClick={() => navigate("/management/website")}
        />
        <Tile
          icon={<MessageSquare className="w-10 h-10 text-primary" />}
          title="Kommunikation"
          description="Vorlagen, Push, E-Mail"
          onClick={() => navigate("/management/kommunikation")}
        />
        <Tile
          icon={<CreditCard className="w-10 h-10 text-primary" />}
          title="Abo & Zahlung"
          description="Plan, Rechnungen, Vertrag"
          status={
            planLabel ? (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
                {planLabel}
              </Badge>
            ) : undefined
          }
          onClick={() => navigate("/management/abo")}
        />
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Rechtliches"
          description="AGB, Datenschutz, Impressum"
          onClick={() => navigate("/management/rechtliches")}
        />
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen & HufManager empfehlen"
          onClick={() => navigate("/management/botschafter")}
        />
      </TileCategory>
    </div>
  );
}
