import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2, CalendarDays, Bell, Globe, Star, Smartphone,
  CreditCard, FileText, Scale, LifeBuoy, MessageSquare,
} from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

export default function ManagementOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["business-settings-overview", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("business_name, logo_url, subdomain, subdomain_active, impressum_text, kleine_unternehmer")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["review-stats-overview", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, count } = await supabase
        .from("reviews")
        .select("rating", { count: "exact" })
        .eq("provider_id", user!.id);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + (r.rating || 0), 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: count || data.length };
    },
  });

  const ic = "h-10 w-10";

  return (
    <div className="space-y-8 animate-fade-in">
      <TileHubHeader icon="⚙️" title="Management" subtitle="Verwalte dein Huf-Business" />

      <TileCategory title="Mein Business">
        <Tile
          icon={<Building2 className={`${ic} text-primary`} />}
          title="Geschäft"
          description="Name, Logo, Kontakt, Adresse"
          status={settings?.business_name ? `${settings.business_name}  ✓` : undefined}
          onClick={() => navigate("/management/geschaeft")}
        />
        <Tile
          icon={<CalendarDays className={`${ic} text-primary`} />}
          title="Zeiten & Verfügbarkeit"
          description="Öffnungszeiten, Pausentage"
          onClick={() => navigate("/management/zeiten")}
        />
        <Tile
          icon={<Bell className={`${ic} text-primary`} />}
          title="Erinnerungen"
          description="Automatische Nachrichten an Kunden"
          onClick={() => navigate("/management/erinnerungen")}
        />
      </TileCategory>

      <TileCategory title="Online-Auftritt">
        <Tile
          icon={<Globe className={`${ic} text-blue-400`} />}
          title="Landingpage"
          description="Dein öffentliches Profil"
          status={
            settings?.subdomain_active && settings?.subdomain ? (
              <span className="badge-live">{settings.subdomain}</span>
            ) : "Nicht aktiv"
          }
          onClick={() => navigate("/management/landing")}
        />
        <Tile
          icon={<Star className={`${ic} text-blue-400`} />}
          title="Bewertungen"
          description="Deine öffentlichen Reviews"
          status={
            reviewStats && reviewStats.count > 0
              ? `⭐ ${reviewStats.avg} · ${reviewStats.count} Bewertungen`
              : "Noch keine Bewertungen"
          }
          onClick={() => navigate("/management/bewertungen")}
        />
        <Tile
          icon={<Smartphone className={`${ic} text-blue-400`} />}
          title="App & Einstellungen"
          description="Notifications, Dark Mode, Sprache"
          onClick={() => navigate("/management/app")}
        />
      </TileCategory>

      <TileCategory title="Finanzen & Recht">
        <Tile
          icon={<CreditCard className={`${ic} text-emerald-400`} />}
          title="Abo & Module"
          description="Dein aktueller Plan und Erweiterungen"
          onClick={() => navigate("/management/abo")}
        />
        <Tile
          icon={<FileText className={`${ic} text-emerald-400`} />}
          title="Rechnungen & Belege"
          description="Eingangs- und Ausgangsrechnungen"
          onClick={() => navigate("/management/rechnungen")}
        />
        <Tile
          icon={<Scale className={`${ic} text-emerald-400`} />}
          title="Rechtliches"
          description="AGB, DSGVO, Impressum"
          status={!settings?.impressum_text ? "⚠️ Impressum fehlt" : "✅ Aktualisiert"}
          onClick={() => navigate("/management/rechtliches")}
        />
      </TileCategory>

      <TileCategory title="Support & Hilfe">
        <Tile
          icon={<LifeBuoy className={`${ic} text-muted-foreground`} />}
          title="1. Hilfe Kundencenter"
          description="FAQ & Hilfe"
          onClick={() => navigate("/management/hilfe")}
        />
        <Tile
          icon={<MessageSquare className={`${ic} text-muted-foreground`} />}
          title="Feedback geben"
          description="Feature-Wünsche & Verbesserungen"
          onClick={() => navigate("/management/feedback")}
        />
      </TileCategory>
    </div>
  );
}
