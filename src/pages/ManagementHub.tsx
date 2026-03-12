import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, Globe, Bell, CreditCard, Scale } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

export default function ManagementHub() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["business-settings-hub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("business_name, logo_url, subdomain, subdomain_active, impressum_text, owner_name, email, phone, address")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const profileComplete = settings?.business_name && settings?.owner_name && settings?.email && settings?.phone && settings?.address;
  const missingFields = [
    !settings?.business_name && "Name",
    !settings?.owner_name && "Inhaber",
    !settings?.email && "E-Mail",
    !settings?.phone && "Telefon",
    !settings?.address && "Adresse",
  ].filter(Boolean);

  const websiteActive = settings?.subdomain_active && settings?.subdomain;
  const legalComplete = !!settings?.impressum_text?.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader title="Management" subtitle="Einstellungen & Verwaltung" />

      <TileCategory title="Mein Business">
        <Tile
          icon={<User className="w-10 h-10 text-primary" />}
          title="Mein Profil"
          description="Geschäftsdaten, Arbeitszeiten, Erinnerungen"
          status={profileComplete ? "✅ Vollständig" : `⚠️ ${missingFields.length} Felder fehlen`}
          onClick={() => navigate("/management/profil")}
        />
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Meine Website"
          description="Landingpage, Bewertungen, Domain"
          status={
            websiteActive ? (
              <span className="badge-live">{settings?.subdomain}.hufmanager.de</span>
            ) : (
              "⚫ Nicht aktiv"
            )
          }
          onClick={() => navigate("/management/website")}
        />
      </TileCategory>

      <TileCategory title="Kommunikation & Abo">
        <Tile
          icon={<Bell className="w-10 h-10 text-primary" />}
          title="Kommunikation"
          description="App-Kanal, Einstellungen, KI-Features"
          onClick={() => navigate("/management/kommunikation")}
        />
        <Tile
          icon={<CreditCard className="w-10 h-10 text-primary" />}
          title="Abo & Zahlung"
          description="Aktueller Plan, Rechnungen, Zahlungsart, Vertrag"
          onClick={() => navigate("/management/abo")}
        />
      </TileCategory>

      <TileCategory title="Recht & Compliance">
        <Tile
          icon={<Scale className="w-10 h-10 text-primary" />}
          title="Rechtliches"
          description="Impressum · AGB · Datenschutz · AVV"
          status={legalComplete ? "✅ Vollständig" : "⚠️ Impressum prüfen"}
          colSpan
          onClick={() => navigate("/management/rechtliches")}
        />
      </TileCategory>
    </div>
  );
}
