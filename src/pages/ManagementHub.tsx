import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, Globe, Bell, CreditCard, Scale, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const { data: profile } = useQuery({
    queryKey: ["profile-hub", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("readable_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data as any;
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

  const tiles = [
    {
      icon: <User className="w-10 h-10 text-primary" />,
      title: "Mein Profil",
      description: "Geschäftsdaten, Arbeitszeiten, Erinnerungen",
      status: profileComplete ? "✅ Vollständig" : `⚠️ ${missingFields.length} Felder fehlen`,
      path: "/management/profil",
    },
    {
      icon: <Globe className="w-10 h-10 text-primary" />,
      title: "Meine Website",
      description: "Landingpage, Bewertungen, Domain",
      status: websiteActive ? `🟢 Live · ${settings?.subdomain}.hufmanager.de` : "⚫ Nicht aktiv",
      path: "/management/website",
    },
    {
      icon: <Bell className="w-10 h-10 text-primary" />,
      title: "Kommunikation",
      description: "App-Kanal, Einstellungen, KI-Features",
      path: "/management/kommunikation",
    },
    {
      icon: <CreditCard className="w-10 h-10 text-primary" />,
      title: "Abo & Zahlung",
      description: "Aktueller Plan, Rechnungen, Zahlungsart, Vertrag",
      path: "/management/abo",
    },
    {
      icon: <Scale className="w-10 h-10 text-primary" />,
      title: "Rechtliches",
      description: "Impressum · AGB · Datenschutz · AVV",
      status: legalComplete ? "✅ Vollständig" : "⚠️ Impressum prüfen",
      colSpan: true,
      path: "/management/rechtliches",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Management</h1>
        <p className="text-muted-foreground mt-1">Einstellungen & Verwaltung</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <div
            key={tile.path}
            onClick={() => navigate(tile.path)}
            className={cn(
              "group bg-card border border-border rounded-2xl p-6 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md",
              (tile as any).colSpan && "sm:col-span-2"
            )}
          >
            <div className="mb-4">{tile.icon}</div>
            <h2 className="text-lg font-bold text-foreground mb-1">{tile.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{tile.description}</p>
            {tile.status && (
              <p className="text-xs text-muted-foreground mb-3">{tile.status}</p>
            )}
            <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              Öffnen <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
