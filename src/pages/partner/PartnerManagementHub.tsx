import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { User, Globe, MessageSquare, CreditCard, FileText } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";

const TAB_REDIRECTS: Record<string, string> = {
  profil: "/partner-management/profil",
  oeffentlich: "/partner-management/oeffentlich",
  kommunikation: "/partner-management/kommunikation",
  abo: "/partner-management/abo",
  rechtliches: "/partner-management/rechtliches",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  advanced: "Advanced",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

export default function PartnerManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { plan } = useSubscription();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  const planLabel = plan ? PLAN_LABELS[plan] || plan : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Einstellungen">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Persönliche Daten, Foto"
          onClick={() => navigate("/partner-management/profil")}
        />
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Öffentliches Profil"
          description="Sichtbar für Pferdebesitzer"
          onClick={() => navigate("/partner-management/oeffentlich")}
        />
        <Tile
          icon={<MessageSquare className="w-10 h-10 text-primary" />}
          title="Kommunikation"
          description="Vorlagen, Benachrichtigungen"
          onClick={() => navigate("/partner-management/kommunikation")}
        />
        <Tile
          icon={<CreditCard className="w-10 h-10 text-primary" />}
          title="Abo & Zahlung"
          description="Plan, Rechnungen"
          status={
            planLabel ? (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
                {planLabel}
              </Badge>
            ) : undefined
          }
          onClick={() => navigate("/partner-management/abo")}
        />
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Rechtliches"
          description="AGB, Datenschutz, Impressum"
          onClick={() => navigate("/partner-management/rechtliches")}
        />
      </TileCategory>
    </div>
  );
}
