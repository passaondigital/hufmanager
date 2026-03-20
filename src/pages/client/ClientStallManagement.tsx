import { useNavigate } from "react-router-dom";
import {
  Building2, Users, ClipboardList, BarChart3, FileText, MapPin, Shield, Settings,
  UserPlus, Star, Calendar, Package, Zap, Headphones, Search, PieChart, Send,
  MessageSquare, Megaphone, Briefcase, Mic, TrendingUp, Target, FolderOpen,
  LayoutDashboard, CalendarDays, Clock, Bot, Warehouse,
} from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { useClientMode } from "@/hooks/useClientMode";
import { LockedFeatureOverlay } from "@/components/client/LockedFeatureOverlay";

export default function ClientStallManagement() {
  const navigate = useNavigate();
  const { modeInfo } = useClientMode();

  if (!modeInfo.isVerified) {
    return <LockedFeatureOverlay feature="Stallverwaltung" requiredMode="stall" />;
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24 lg:pb-8">
      <TileHubHeader icon="🏇" title="Stallverwaltung" subtitle={modeInfo.companyName || "Mein Stall"} />

      {/* ── 5A Workflow ──────────────────────────── */}
      <TileCategory title="1️⃣ Anfrage">
        <Tile
          icon={<Search className="w-10 h-10 text-primary" />}
          title="Anfragen & Leads"
          description="Eingehende Stallplatz-Anfragen, Warteliste, Interessenten"
          onClick={() => navigate("/client-stall/anfragen")}
        />
        <Tile
          icon={<Send className="w-10 h-10 text-primary" />}
          title="Buchungsportal"
          description="Externer Buchungslink für Reitstunden, Kurse, Stallplätze"
          onClick={() => navigate("/client-stall/buchungsportal")}
        />
      </TileCategory>

      <TileCategory title="2️⃣ Angebote">
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Angebote & Verträge"
          description="Pensionsverträge, Preislisten, individuelle Angebote erstellen"
          onClick={() => navigate("/client-stall/angebote")}
        />
        <Tile
          icon={<ClipboardList className="w-10 h-10 text-primary" />}
          title="Leistungskatalog"
          description="Pensionsleistungen, Zusatzleistungen, Kurse, Reitstunden"
          onClick={() => navigate("/client-stall/leistungen")}
        />
      </TileCategory>

      <TileCategory title="3️⃣ Aufnahme">
        <Tile
          icon={<Users className="w-10 h-10 text-primary" />}
          title="Einsteller-Verwaltung"
          description="Kunden, Verträge, Kontaktdaten, Zahlungsstatus"
          onClick={() => navigate("/client-stall/boarders")}
        />
        <Tile
          icon={<ClipboardList className="w-10 h-10 text-primary" />}
          title="Pferde im Stall"
          description="Alle Pferde, Boxenzuordnung, Futterpläne, Gesundheit"
          onClick={() => navigate("/client-stall/horses")}
        />
      </TileCategory>

      <TileCategory title="4️⃣ Auffassen">
        <Tile
          icon={<LayoutDashboard className="w-10 h-10 text-primary" />}
          title="Tages-Cockpit"
          description="Tagesaufgaben, Fütterungszeiten, anstehende Termine"
          onClick={() => navigate("/client-stall/cockpit")}
        />
        <Tile
          icon={<CalendarDays className="w-10 h-10 text-primary" />}
          title="Kalender"
          description="Termine, Kurse, Reitstunden, Schmied- & Tierarzt-Besuche"
          onClick={() => navigate("/client-stall/kalender")}
        />
        <Tile
          icon={<Megaphone className="w-10 h-10 text-primary" />}
          title="Feedback"
          description="Kundenbewertungen, Verbesserungsvorschläge, Zufriedenheit"
          onClick={() => navigate("/client-stall/feedback")}
        />
      </TileCategory>

      <TileCategory title="5️⃣ Analyse">
        <Tile
          icon={<BarChart3 className="w-10 h-10 text-primary" />}
          title="Betriebsübersicht"
          description="Stallplätze, Belegung, Kapazitäten, Umsatz"
          onClick={() => navigate("/client-stall/overview")}
        />
        <Tile
          icon={<PieChart className="w-10 h-10 text-primary" />}
          title="Finanzen & Berichte"
          description="Stallmiete, Futterkosten, Einnahmen, Sammelrechnungen"
          onClick={() => navigate("/client-stall/invoices")}
        />
        <Tile
          icon={<TrendingUp className="w-10 h-10 text-primary" />}
          title="Statistiken"
          description="Belegungsquote, Umsatzentwicklung, Kundenbindung"
          onClick={() => navigate("/client-stall/statistiken")}
        />
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Berichte & Behörden"
          description="Veterinäramt, Tierseuchenkasse, Bestandsmeldungen"
          onClick={() => navigate("/client-stall/reports")}
          colSpan
        />
      </TileCategory>

      {/* ── Erweiterungen ──────────────────────────── */}
      <TileCategory title="Erweiterungen">
        <Tile
          icon={<Headphones className="w-10 h-10 text-primary" />}
          title="Main Office"
          description="Zentrale Schaltstelle für alle Stallbetrieb-Aufgaben"
          onClick={() => navigate("/client-stall/main-office")}
        />
        <Tile
          icon={<Target className="w-10 h-10 text-primary" />}
          title="HM Control"
          description="Dashboard, KPIs, Echtzeit-Übersicht deines Betriebs"
          onClick={() => navigate("/client-stall/hm-control")}
        />
        <Tile
          icon={<Bot className="w-10 h-10 text-primary" />}
          title="Autoflow"
          description="Automatisierung: Erinnerungen, Rechnungen, Fütterungsalarm"
          onClick={() => navigate("/client-stall/autoflow")}
        />
      </TileCategory>

      <TileCategory title="Team & Betrieb">
        <Tile
          icon={<UserPlus className="w-10 h-10 text-primary" />}
          title="Mitarbeiter"
          description="Stallpersonal, Aufgaben, Schichtpläne, Berechtigungen"
          onClick={() => navigate("/client-stall/staff")}
        />
        <Tile
          icon={<Warehouse className="w-10 h-10 text-primary" />}
          title="Lager & Futtermittel"
          description="Heu, Stroh, Kraftfutter, Müsli, Mineralfutter, Einstreu, Zusatzfutter"
          onClick={() => navigate("/client-stall/lager")}
        />
        <Tile
          icon={<Star className="w-10 h-10 text-primary" />}
          title="Experten & Dienstleister"
          description="Empfohlene Hufpfleger, Tierärzte, Therapeuten verwalten"
          onClick={() => navigate("/client-stall/experts")}
        />
      </TileCategory>

      <TileCategory title="Standort & Anlage">
        <Tile
          icon={<MapPin className="w-10 h-10 text-primary" />}
          title="Standorte & Koppeln"
          description="Weiden, Hallen, Paddocks, Belegungspläne"
          onClick={() => navigate("/client-stall/locations")}
        />
        <Tile
          icon={<Building2 className="w-10 h-10 text-primary" />}
          title="Boxenbelegung"
          description="Boxenplan, Zuweisung, Verfügbarkeit, Weideplätze"
          onClick={() => navigate("/client-stall/boxen")}
        />
      </TileCategory>

      <TileCategory title="Management">
        <Tile
          icon={<Shield className="w-10 h-10 text-primary" />}
          title="Tresor & Dokumente"
          description="Betriebsgenehmigungen, Versicherungen, Pachtverträge"
          onClick={() => navigate("/client-stall/vault")}
        />
        <Tile
          icon={<Settings className="w-10 h-10 text-primary" />}
          title="Stall-Einstellungen"
          description="Website, AGB, Impressum, Preisliste, Kommunikation, Steuern"
          onClick={() => navigate("/client-stall/settings")}
        />
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Business-Einstellungen"
          description="Steuer, MwSt, Preisanzeige, Datenschutz, Abo-Verwaltung"
          onClick={() => navigate("/client-stall/business")}
        />
        <Tile
          icon={<Mic className="w-10 h-10 text-primary" />}
          title="Botschafter werden"
          description="Provision verdienen, Empfehlungslinks, Werbemittel"
          onClick={() => navigate("/client/botschafter")}
        />
      </TileCategory>
    </div>
  );
}
