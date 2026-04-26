import { useNavigate } from "react-router-dom";
import { Receipt, FileText, TrendingDown, Car, Package, Scale, Download, Briefcase } from "lucide-react";
import { Tile, TileCategory, TileHubHeader } from "@/components/ui/TileHub";

export default function Business() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <TileHubHeader icon="💼" title="Hufi Business" subtitle="Dein Betrieb auf einen Blick" />

      <TileCategory title="Finanzen">
        <Tile
          icon={<Receipt className="w-10 h-10 text-amber-500" />}
          title="Rechnungen"
          description="Rechnungen erstellen, versenden & verwalten"
          onClick={() => navigate("/rechnungen")}
        />
        <Tile
          icon={<TrendingDown className="w-10 h-10 text-amber-500" />}
          title="Ausgaben & Belege"
          description="Kosten erfassen & Belege scannen"
          onClick={() => navigate("/ausgaben")}
        />
        <Tile
          icon={<Scale className="w-10 h-10 text-amber-500" />}
          title="GuV-Übersicht"
          description="Gewinn- und Verlustrechnung"
          onClick={() => navigate("/guv")}
        />
        <Tile
          icon={<FileText className="w-10 h-10 text-amber-500" />}
          title="Buchhaltung"
          description="EÜR, USt-VA, DATEV & Steuerberater"
          onClick={() => navigate("/buchhaltung")}
        />
      </TileCategory>

      <TileCategory title="Betrieb">
        <Tile
          icon={<Car className="w-10 h-10 text-amber-500" />}
          title="Fuhrpark"
          description="Fahrzeuge, Tankbuch & km-Protokoll"
          onClick={() => navigate("/fuhrpark")}
        />
        <Tile
          icon={<Package className="w-10 h-10 text-amber-500" />}
          title="Lager"
          description="Material & Bestand verwalten"
          onClick={() => navigate("/lager")}
        />
        <Tile
          icon={<Download className="w-10 h-10 text-amber-500" />}
          title="Daten-Export"
          description="Daten exportieren & sichern"
          onClick={() => navigate("/management/business")}
        />
      </TileCategory>
    </div>
  );
}
