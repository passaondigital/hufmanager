import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  CalendarDays,
  Bell,
  Globe,
  Star,
  Smartphone,
  CreditCard,
  FileText,
  Scale,
  LifeBuoy,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TileProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: string;
  buttonLabel: string;
  onClick: () => void;
  actionRequired?: boolean;
}

function Tile({ icon, title, description, status, buttonLabel, onClick, actionRequired }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start text-left min-h-[160px] rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm",
        actionRequired && "border-amber-500/50"
      )}
    >
      {actionRequired && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-amber-500 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Aktion nötig
        </span>
      )}
      <div className="mb-2">{icon}</div>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</span>
      <div className="flex-1" />
      {status && (
        <span className="text-xs text-muted-foreground mt-3 truncate w-full">{status}</span>
      )}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
        {buttonLabel} <ChevronRight className="h-3 w-3" />
      </span>
    </button>
  );
}

interface CategoryProps {
  title: string;
  children: React.ReactNode;
}

function Category({ title, children }: CategoryProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

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

  const iconClass = (color: string) => cn("h-8 w-8", color);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>⚙️</span> Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Verwalte dein Huf-Business</p>
      </div>

      {/* Kategorie 1: Mein Business */}
      <Category title="Mein Business">
        <Tile
          icon={<Building2 className={iconClass("text-amber-500")} />}
          title="Geschäft"
          description="Name, Logo, Kontakt, Adresse"
          status={settings?.business_name ? `${settings.business_name}  ✓` : undefined}
          actionRequired={!settings?.business_name && !settings?.logo_url}
          buttonLabel="Bearbeiten"
          onClick={() => navigate("/management/geschaeft")}
        />
        <Tile
          icon={<CalendarDays className={iconClass("text-amber-500")} />}
          title="Zeiten & Verfügbarkeit"
          description="Öffnungszeiten, Pausentage"
          buttonLabel="Bearbeiten"
          onClick={() => navigate("/management/zeiten")}
        />
        <Tile
          icon={<Bell className={iconClass("text-amber-500")} />}
          title="Erinnerungen"
          description="Automatische Nachrichten an Kunden"
          buttonLabel="Bearbeiten"
          onClick={() => navigate("/management/erinnerungen")}
        />
      </Category>

      {/* Kategorie 2: Online-Auftritt */}
      <Category title="Online-Auftritt">
        <Tile
          icon={<Globe className={iconClass("text-blue-400")} />}
          title="Landingpage"
          description="Dein öffentliches Profil"
          status={
            settings?.subdomain_active && settings?.subdomain
              ? `● Aktiv · ${settings.subdomain}`
              : "Nicht aktiv"
          }
          buttonLabel="Öffnen"
          onClick={() => navigate("/management/landing")}
        />
        <Tile
          icon={<Star className={iconClass("text-blue-400")} />}
          title="Bewertungen"
          description="Deine öffentlichen Reviews"
          status={
            reviewStats && reviewStats.count > 0
              ? `⭐ ${reviewStats.avg} · ${reviewStats.count} Bewertungen`
              : "Noch keine Bewertungen"
          }
          buttonLabel="Anzeigen"
          onClick={() => navigate("/management/bewertungen")}
        />
        <Tile
          icon={<Smartphone className={iconClass("text-blue-400")} />}
          title="App & Einstellungen"
          description="Notifications, Dark Mode, Sprache"
          buttonLabel="Öffnen"
          onClick={() => navigate("/management/app")}
        />
      </Category>

      {/* Kategorie 3: Finanzen & Recht */}
      <Category title="Finanzen & Recht">
        <Tile
          icon={<CreditCard className={iconClass("text-emerald-400")} />}
          title="Abo & Module"
          description="Dein aktueller Plan und Erweiterungen"
          buttonLabel="Verwalten"
          onClick={() => navigate("/management/abo")}
        />
        <Tile
          icon={<FileText className={iconClass("text-emerald-400")} />}
          title="Rechnungen & Belege"
          description="Eingangs- und Ausgangsrechnungen"
          buttonLabel="Anzeigen"
          onClick={() => navigate("/management/rechnungen")}
        />
        <Tile
          icon={<Scale className={iconClass("text-emerald-400")} />}
          title="Rechtliches"
          description="AGB, DSGVO, Impressum"
          status={!settings?.impressum_text ? "Impressum fehlt" : `Aktualisiert`}
          actionRequired={!settings?.impressum_text}
          buttonLabel="Anzeigen"
          onClick={() => navigate("/management/rechtliches")}
        />
      </Category>

      {/* Kategorie 4: Support & Hilfe */}
      <Category title="Support & Hilfe">
        <Tile
          icon={<LifeBuoy className={iconClass("text-muted-foreground")} />}
          title="1. Hilfe Kundencenter"
          description="FAQ & Hilfe"
          buttonLabel="Öffnen"
          onClick={() => navigate("/management/hilfe")}
        />
        <Tile
          icon={<MessageSquare className={iconClass("text-muted-foreground")} />}
          title="Feedback geben"
          description="Feature-Wünsche & Verbesserungen"
          buttonLabel="Öffnen"
          onClick={() => navigate("/management/feedback")}
        />
      </Category>
    </div>
  );
}
