import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, Globe, Bell, CreditCard, Scale } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

export default function PartnerManagementHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["partner-biz-settings-hub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_business_settings")
        .select("business_name, owner_name, email, phone, address, specialty, public_profile_visible")
        .eq("partner_id", user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const profileComplete = settings?.business_name && settings?.owner_name && settings?.email;
  const missingFields = [
    !settings?.business_name && "Name",
    !settings?.owner_name && "Inhaber",
    !settings?.email && "E-Mail",
  ].filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Profil & Sichtbarkeit">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Name, Foto, Kontakt, Fachgebiet"
          status={profileComplete ? "✅ Vollständig" : `⚠️ ${missingFields.length} Felder fehlen`}
          onClick={() => navigate("/partner-settings")}
        />
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Mein Profil (öffentlich)"
          description="Öffentliche Partner-Seite"
          status={settings?.public_profile_visible ? <span className="badge-live">Sichtbar</span> : "Nicht sichtbar"}
          onClick={() => navigate("/partner-profile")}
        />
      </TileCategory>

      <TileCategory title="Kommunikation & Abo">
        <Tile
          icon={<Bell className="w-10 h-10 text-primary" />}
          title="Kommunikation"
          description="App-Kanal, Einstellungen"
          onClick={() => navigate("/partner-settings")}
        />
        <Tile
          icon={<CreditCard className="w-10 h-10 text-primary" />}
          title="Abo & Zahlung"
          description="Aktueller Plan, Rechnungen"
          onClick={() => navigate("/partner-settings")}
        />
      </TileCategory>

      <TileCategory title="Recht & Compliance">
        <Tile
          icon={<Scale className="w-10 h-10 text-primary" />}
          title="Rechtliches"
          description="Impressum · AGB · Datenschutz"
          colSpan
          onClick={() => navigate("/partner-rechtliches")}
        />
      </TileCategory>
    </div>
  );
}
