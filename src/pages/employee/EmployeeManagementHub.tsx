import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { User, Settings, Mic } from "lucide-react";
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

      <TileCategory title="Einstellungen">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Persönliche Daten, Vertrag"
          status={profileComplete ? "✅ Vollständig" : "⚠️ Profil vervollständigen"}
          onClick={() => navigate("/employee/management/profil")}
        />
        <Tile
          icon={<Settings className="w-10 h-10 text-primary" />}
          title="Einstellungen"
          description="Benachrichtigungen, Passwort"
          onClick={() => navigate("/employee/management/einstellungen")}
        />
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen & HufManager empfehlen"
          onClick={() => navigate("/employee/management/botschafter")}
        />
      </TileCategory>
    </div>
  );
}
