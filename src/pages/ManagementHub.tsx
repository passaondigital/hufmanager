import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Briefcase, Mic, Shield } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { HufiPermissionsSettings } from "@/components/consent/HufiPermissionsSettings";

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
          description="Profil, Zertifikate, Fotos, Kontaktdaten, Qualifikationen"
          onClick={() => navigate("/management/profil")}
        />
        <Tile
          icon={<Shield className="w-10 h-10 text-primary" />}
          title="Sicherheit"
          description="Biometrische Anmeldung — Fingerabdruck, Face ID, Iris-Scan"
          onClick={() => navigate("/management/sicherheit")}
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

      <TileCategory title="Hufi">
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Statistiken, Auszahlungen, Werbemittel"
          onClick={() => navigate("/management/botschafter")}
        />
      </TileCategory>

      {/* Berechtigungen & Hufi — inline Einstellungsbereich */}
      <div className="px-1">
        <HufiPermissionsSettings />
      </div>
    </div>
  );
}
