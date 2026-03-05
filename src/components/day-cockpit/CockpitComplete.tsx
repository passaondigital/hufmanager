import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Route, Fuel, FileText, WifiOff } from "lucide-react";

interface CockpitCompleteProps {
  gpsTotalKm: number;
  tourStartTime: Date | null;
  completedCount: number;
  totalCount: number;
  livePrice: number | null;
  vehicleConsumption: number | null | undefined;
  pricePerKm: number | null | undefined;
  isOnline: boolean;
  onDismiss: () => void;
}

export function CockpitComplete({
  gpsTotalKm,
  tourStartTime,
  completedCount,
  totalCount,
  livePrice,
  vehicleConsumption,
  pricePerKm,
  isOnline,
  onDismiss,
}: CockpitCompleteProps) {
  const navigate = useNavigate();

  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const driveTime = useMemo(() => {
    if (!tourStartTime) return "—";
    const diff = Date.now() - tourStartTime.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [tourStartTime]);

  const fuelCost = useMemo(() => {
    if (!vehicleConsumption || !livePrice || gpsTotalKm <= 0) return null;
    return Math.round(gpsTotalKm * (vehicleConsumption / 100) * livePrice * 100) / 100;
  }, [gpsTotalKm, vehicleConsumption, livePrice]);

  const flatCost = useMemo(() => {
    if (!pricePerKm) return null;
    return Math.round(gpsTotalKm * pricePerKm * 100) / 100;
  }, [gpsTotalKm, pricePerKm]);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#111" }}>
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium" style={{ background: "#dc2626", color: "#fff" }}>
          <WifiOff className="h-3.5 w-3.5" /> Offline
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>
          <CheckCircle className="h-20 w-20" style={{ color: "#22c55e" }} />
        </motion.div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Tour beendet!</h1>
          <p className="mt-1" style={{ color: "#999" }}>
            {completedCount}/{totalCount} Termine erledigt
          </p>
        </div>

        {/* Summary */}
        <div className="w-full max-w-sm space-y-2">
          <SummaryRow icon={<Route className="h-5 w-5" />} label="Gesamt-km" value={`${gpsTotalKm} km`} />
          <SummaryRow icon={<Clock className="h-5 w-5" />} label="Fahrzeit" value={driveTime} />
          {fuelCost !== null && (
            <SummaryRow
              icon={<Fuel className="h-5 w-5" />}
              label="Spritkosten"
              value={fmt(fuelCost)}
              sub={livePrice ? `${livePrice.toFixed(3)} €/L` : undefined}
              highlight
            />
          )}
          {flatCost !== null && (
            <SummaryRow icon={<Route className="h-5 w-5" />} label="Pauschale" value={fmt(flatCost)} dim />
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-6 pt-3 space-y-3">
        <button
          onClick={() => navigate("/rechnungen")}
          className="w-full flex items-center justify-center gap-2 font-bold text-lg"
          style={{ height: 56, borderRadius: 12, background: "#F5970A", color: "#111" }}
        >
          <FileText className="h-5 w-5" />
          Rechnungen erstellen
        </button>
        <button
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 font-medium text-sm"
          style={{ height: 48, borderRadius: 12, background: "#222", color: "#999" }}
        >
          Zurück zum Cockpit
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  icon, label, value, sub, highlight, dim,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4" style={{ background: "#1a1a1a", borderRadius: 12 }}>
      <div className="flex items-center gap-3">
        <span style={{ color: dim ? "#666" : "#F5970A" }}>{icon}</span>
        <div>
          <span className="text-base" style={{ color: dim ? "#666" : "#ccc" }}>{label}</span>
          {sub && <p className="text-xs" style={{ color: "#666" }}>{sub}</p>}
        </div>
      </div>
      <span
        className="text-xl font-bold font-mono"
        style={{ color: highlight ? "#F5970A" : dim ? "#666" : "#fff" }}
      >
        {value}
      </span>
    </div>
  );
}
