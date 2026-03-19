import { useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, Globe, MessageSquare, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  advanced: "Advanced",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

export default function PartnerManagementBusinessHub() {
  const navigate = useNavigate();
  const { plan } = useSubscription();
  const planLabel = plan ? PLAN_LABELS[plan] || plan : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/partner-management")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <TileHubHeader icon="💼" title="Business-Einstellungen" subtitle="Steuern, Profil, Kommunikation & mehr" />
      </div>

      <TileCategory title="Finanzen & Recht">
        <Tile
          icon={<Receipt className="w-10 h-10 text-primary" />}
          title="Steuer & MwSt"
          description="Umsatzsteuer, Preisanzeige"
          onClick={() => navigate("/partner-management/steuer")}
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

      <TileCategory title="Außenauftritt & Kommunikation">
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
      </TileCategory>
    </div>
  );
}
