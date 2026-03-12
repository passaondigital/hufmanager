import { useNavigate } from "react-router-dom";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { User, Settings } from "lucide-react";
import { Tile, TileHubHeader } from "@/components/ui/TileHub";

export default function EmployeeManagementHub() {
  const navigate = useNavigate();
  const { data: profile } = useEmployeeProfile();

  const profileComplete = profile?.full_name && profile?.phone;

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader title="Management" subtitle="Profil & Einstellungen" />

      <div className="grid grid-cols-1 gap-4">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Name, Foto, Kontakt"
          status={profileComplete ? "✅ Vollständig" : "⚠️ Profil vervollständigen"}
          colSpan
          onClick={() => navigate("/employee/profil")}
        />
        <Tile
          icon={<Settings className="w-10 h-10 text-primary" />}
          title="Einstellungen"
          description="App-Kanal, Benachrichtigungen"
          colSpan
          onClick={() => navigate("/employee/profil")}
        />
      </div>
    </div>
  );
}
