import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { User, Settings, Briefcase, Mic } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

const TAB_REDIRECTS: Record<string, string> = {
  profil: "/employee/management/profil",
  einstellungen: "/employee/management/einstellungen",
};

export default function EmployeeManagementHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile } = useEmployeeProfile();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TAB_REDIRECTS[tab]) {
      navigate(TAB_REDIRECTS[tab], { replace: true });
    }
  }, [searchParams, navigate]);

  const profileComplete = profile?.full_name && profile?.phone;

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Profil & Einstellungen" />

      <TileCategory title="Mein Account">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Persönliche Daten, Vertrag, Kontakt, Dokumente"
          status={profileComplete ? "✅ Vollständig" : "⚠️ Profil vervollständigen"}
          onClick={() => navigate("/employee/management/profil")}
        />
      </TileCategory>

      <TileCategory title="Arbeitsplatz-Einstellungen">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Meine Einstellungen"
          description="Benachrichtigungen, Passwort, Sprache, Datenschutz, Vertrag, Abwesenheiten"
          onClick={() => navigate("/employee/management/einstellungen")}
          colSpan
        />
      </TileCategory>

      <TileCategory title="Hufi">
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Statistiken, Auszahlungen, Werbemittel"
          onClick={() => navigate("/employee/management/botschafter")}
        />
      </TileCategory>
    </div>
  );
}
