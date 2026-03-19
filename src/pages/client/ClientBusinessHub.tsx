import { useNavigate } from "react-router-dom";
import { Briefcase, Users, Package, BarChart3, FileText, Globe, Shield, Settings, Award, Truck } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";
import { useClientMode } from "@/hooks/useClientMode";
import { LockedFeatureOverlay } from "@/components/client/LockedFeatureOverlay";

export default function ClientBusinessHub() {
  const navigate = useNavigate();
  const { modeInfo } = useClientMode();

  if (!modeInfo.isVerified) {
    return <LockedFeatureOverlay feature="Gewerbeverwaltung" requiredMode="commercial" />;
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24 lg:pb-8">
      <TileHubHeader icon="🏢" title="Gewerbeverwaltung" subtitle={modeInfo.companyName || "Mein Betrieb"} />

      <TileCategory title="Geschäftsbetrieb">
        <Tile
          icon={<Briefcase className="w-10 h-10 text-primary" />}
          title="Betriebsübersicht"
          description="Umsatz, Kunden, Pferde, KPIs auf einen Blick"
          onClick={() => navigate("/client-business/overview")}
        />
        <Tile
          icon={<Users className="w-10 h-10 text-primary" />}
          title="Kundenverwaltung"
          description="Käufer, Auftraggeber, Mitglieder, Kontakte"
          onClick={() => navigate("/client-business/customers")}
        />
      </TileCategory>

      <TileCategory title="Angebot & Bestand">
        <Tile
          icon={<Package className="w-10 h-10 text-primary" />}
          title="Meine Pferde & Bestand"
          description="Zuchtpferde, Verkaufspferde, Inventar"
          onClick={() => navigate("/client-business/inventory")}
        />
        <Tile
          icon={<Award className="w-10 h-10 text-primary" />}
          title="Leistungen & Preise"
          description="Dienstleistungen, Kurse, Preislisten"
          onClick={() => navigate("/client-business/services")}
        />
        <Tile
          icon={<Truck className="w-10 h-10 text-primary" />}
          title="Lieferanten & Partner"
          description="Futter, Einstreu, Ausrüstung, Kooperationen"
          onClick={() => navigate("/client-business/suppliers")}
        />
      </TileCategory>

      <TileCategory title="Finanzen & Berichte">
        <Tile
          icon={<FileText className="w-10 h-10 text-primary" />}
          title="Rechnungen & Buchhaltung"
          description="Ausgangsrechnungen, Eingangsrechnungen, EÜR"
          onClick={() => navigate("/client-business/invoices")}
        />
        <Tile
          icon={<BarChart3 className="w-10 h-10 text-primary" />}
          title="Berichte & Behörden"
          description="Tierseuchenkasse, Zuchtverband, Statistiken"
          onClick={() => navigate("/client-business/reports")}
        />
      </TileCategory>

      <TileCategory title="Präsenz & Rechtliches">
        <Tile
          icon={<Globe className="w-10 h-10 text-primary" />}
          title="Meine Website"
          description="Landingpage, Buchungsportal, Öffentliches Profil"
          onClick={() => navigate("/client-business/website")}
        />
        <Tile
          icon={<Shield className="w-10 h-10 text-primary" />}
          title="Tresor & Dokumente"
          description="Gewerbeschein, Versicherungen, Zertifikate"
          onClick={() => navigate("/client-business/vault")}
        />
        <Tile
          icon={<Settings className="w-10 h-10 text-primary" />}
          title="Einstellungen"
          description="AGB, Datenschutz, Impressum, Steuer, MwSt"
          onClick={() => navigate("/client-business/settings")}
        />
      </TileCategory>
    </div>
  );
}
