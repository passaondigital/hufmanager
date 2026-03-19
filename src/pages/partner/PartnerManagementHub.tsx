import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase, Mic } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

const TAB_REDIRECTS: Record<string, string> = {
  profil: "/partner-management/profil",
  oeffentlich: "/partner-management/oeffentlich",
  kommunikation: "/partner-management/kommunikation",
  abo: "/partner-management/abo",
  rechtliches: "/partner-management/rechtliches",
  steuer: "/partner-management/steuer",
};

export default function PartnerManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Mein Account">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Persönliche Daten, Foto, Kontakt, Firmendaten"
          onClick={() => navigate("/partner-management/profil")}
        />
      </TileCategory>

      <TileCategory title="Business-Einstellungen">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Meine Business-Einstellungen"
          description="Steuer, MwSt, Profil, Abo, Rechnungen, Kommunikation, AGB, Datenschutz, Impressum, Preisanzeige"
          onClick={() => navigate("/partner-management/business")}
          colSpan
        />
      </TileCategory>

      <TileCategory title="HufManager">
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Statistiken, Auszahlungen, Werbemittel"
          onClick={() => navigate("/partner-management/botschafter")}
        />
      </TileCategory>
    </div>
  );
}
