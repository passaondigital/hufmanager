import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase, Mic } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

const TAB_REDIRECTS: Record<string, string> = {
  profil: "/management/profil",
  website: "/management/website",
  kommunikation: "/management/kommunikation",
  abo: "/management/abo",
  rechtliches: "/management/rechtliches",
  steuer: "/management/steuer",
};

export default function ManagementHub() {
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
          description="Profil, Zertifikate, Fotos"
          onClick={() => navigate("/management/profil")}
        />
      </TileCategory>

      <TileCategory title="Business-Einstellungen">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Meine Business-Einstellungen"
          description="Steuer, MwSt, Website, Abo, Rechnungen, Kommunikation, AGB, Datenschutz, Impressum, Preisanzeige"
          onClick={() => navigate("/management/business")}
          colSpan
        />
      </TileCategory>

      <TileCategory title="HufManager">
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
