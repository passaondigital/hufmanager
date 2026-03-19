import { useParams, Navigate } from "react-router-dom";
import { useOrganizationBySlug, useOrgMembership } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { User, Briefcase, Mic, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PortalManagementHub() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: membership, isLoading: memLoading } = useOrgMembership(org?.id);
  const isMobile = useIsMobile();

  if (authLoading || orgLoading || memLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !org || !membership) return <Navigate to="/auth" replace />;

  const basePath = `/portal/${slug}`;

  return (
    <div className="flex min-h-screen bg-background">
      {!isMobile && <PortalSidebar org={org} basePath={basePath} />}
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl">
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
            description="Provision verdienen, Empfehlungslinks, Statistiken, Auszahlungen, Werbemittel"
            onClick={() => navigate(`${basePath}/botschafter`)}
          />
        </TileCategory>
      </main>
    </div>
  );
}
