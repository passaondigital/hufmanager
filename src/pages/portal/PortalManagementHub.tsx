import { useOutletContext, useNavigate } from "react-router-dom";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { User, Briefcase, Mic } from "lucide-react";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalManagementHub() {
  const { org, basePath } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Mein Account">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Persönliche Daten, Kontakt, Firmendaten"
          onClick={() => navigate(`${basePath}/settings`)}
        />
      </TileCategory>

      <TileCategory title="Organisation">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Organisations-Einstellungen"
          description="Branding, Team, Abrechnung, Plan, Website"
          onClick={() => navigate(`${basePath}/settings`)}
          colSpan
        />
      </TileCategory>

      <TileCategory title="HufManager">
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Statistiken"
          onClick={() => navigate(`${basePath}/botschafter`)}
        />
      </TileCategory>
    </div>
  );
}
