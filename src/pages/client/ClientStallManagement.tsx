import { useNavigate } from "react-router-dom";
import { Building2, Users, ClipboardList, BarChart3, FileText, MapPin, Shield, Settings, UserPlus, Star } from "lucide-react";
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

      <TileCategory title="Betrieb">
        <Tile
          icon={<Building2 className="w-10 h-10 text-primary" />}
          title="Betriebsübersicht"
          description="Stallplätze, Belegung, Kapazitäten, Standort-Infos"
          onClick={() => navigate("/client-stall/overview")}
        />
        <Tile
          icon={<MapPin className="w-10 h-10 text-primary" />}
          title="Standorte & Koppeln"
          description="Weiden, Hallen, Paddocks, Belegungspläne"
          onClick={() => navigate("/client-stall/locations")}
        />
      </TileCategory>

      <TileCategory title="Kunden & Pferde">
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
        <Tile
          icon={<Star className="w-10 h-10 text-primary" />}
          title="Experten & Dienstleister"
          description="Empfohlene Hufpfleger, Tierärzte, Therapeuten verwalten"
          onClick={() => navigate("/client-stall/experts")}
          colSpan
        />
      </TileCategory>

      <TileCategory title="Finanzen & Berichte">
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Rechnungen & Ausgaben"
          description="Stallmiete, Futterkosten, Sammelrechnungen"
          onClick={() => navigate("/client-stall/invoices")}
        />
        <Tile
          icon={<BarChart3 className="w-10 h-10 text-primary" />}
          title="Berichte & Behörden"
          description="Veterinäramt, Tierseuchenkasse, Bestandsmeldungen"
          onClick={() => navigate("/client-stall/reports")}
        />
      </TileCategory>

      <TileCategory title="Team & Zugang">
        <Tile
          icon={<UserPlus className="w-10 h-10 text-primary" />}
          title="Mitarbeiter"
          description="Stallpersonal, Aufgaben, Schichtpläne"
          onClick={() => navigate("/client-stall/staff")}
        />
        <Tile
          icon={<Shield className="w-10 h-10 text-primary" />}
          title="Tresor & Dokumente"
          description="Betriebsgenehmigungen, Versicherungen, Pachtverträge"
          onClick={() => navigate("/client-stall/vault")}
        />
        <Tile
          icon={<Settings className="w-10 h-10 text-primary" />}
          title="Stall-Einstellungen"
          description="Website, AGB, Impressum, Preisliste, Buchungsportal"
          onClick={() => navigate("/client-stall/settings")}
        />
      </TileCategory>
    </div>
  );
}
