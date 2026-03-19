import { useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, Globe, MessageSquare, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  advanced: "Advanced",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

export default function ManagementBusinessHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan } = useSubscription();

  const { data: settings } = useQuery({
    queryKey: ["business-settings-hub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("subdomain, subdomain_active, mwst_pflichtig, kleine_unternehmer")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const hasWebsite = settings?.subdomain_active && (settings as any)?.subdomain;
  const planLabel = plan ? PLAN_LABELS[plan] || plan : null;
  const hasTaxConfig = settings?.mwst_pflichtig || settings?.kleine_unternehmer;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/management")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <TileHubHeader icon="💼" title="Business-Einstellungen" subtitle="Steuern, Website, Kommunikation & mehr" />
      </div>

      <TileCategory title="Finanzen & Recht">
        <Tile
          icon={<Receipt className="w-10 h-10 text-primary" />}
          title="Steuer & MwSt"
          description="Umsatzsteuer, Kleinunternehmer, Steuernummer, Preisanzeige, Netto/Brutto"
          status={
            !hasTaxConfig ? (
              <Badge variant="secondary" className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                Einrichten
              </Badge>
            ) : undefined
          }
          onClick={() => navigate("/management/steuer")}
        />
        <Tile
          icon={<CreditCard className="w-10 h-10 text-primary" />}
          title="Abo & Zahlung"
          description="Plan, Rechnungen, Vertrag, Zahlungsmethode, Laufzeit"
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
          description="AGB, Datenschutz, Impressum, Widerrufsbelehrung"
          onClick={() => navigate("/management/rechtliches")}
        />
      </TileCategory>

      <TileCategory title="Außenauftritt & Kommunikation">
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Meine Website"
          description="Website, Domain, Vorschau, SEO, Farben, Logo"
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
          description="Vorlagen, Push, E-Mail, SMS, Erinnerungen"
          onClick={() => navigate("/management/kommunikation")}
        />
      </TileCategory>
    </div>
  );
}
