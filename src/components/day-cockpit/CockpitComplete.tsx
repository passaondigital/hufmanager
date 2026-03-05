import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, Route, Fuel, FileText, WifiOff, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const totalDriveTime = useMemo(() => {
    if (!tourStartTime) return "—";
    const diff = Date.now() - tourStartTime.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [tourStartTime]);

  const realFuelCost = useMemo(() => {
    if (!vehicleConsumption || !livePrice || gpsTotalKm <= 0) return null;
    return Math.round(gpsTotalKm * (vehicleConsumption / 100) * livePrice * 100) / 100;
  }, [gpsTotalKm, vehicleConsumption, livePrice]);

  const flatCost = useMemo(() => {
    if (!pricePerKm) return null;
    return Math.round(gpsTotalKm * pricePerKm * 100) / 100;
  }, [gpsTotalKm, pricePerKm]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          Offline
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <CheckCircle className="h-20 w-20 text-chart-2" />
        </motion.div>

        <div className="text-center">
          <h1 className="text-3xl font-bold">Tour beendet!</h1>
          <p className="text-muted-foreground mt-1">
            {completedCount}/{totalCount} Termine erledigt
          </p>
        </div>

        {/* Summary cards */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Route className="h-5 w-5 text-primary" />
              <span className="text-base">Gesamt-km</span>
            </div>
            <span className="text-xl font-bold font-mono">{gpsTotalKm} km</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-base">Fahrzeit</span>
            </div>
            <span className="text-xl font-bold font-mono">{totalDriveTime}</span>
          </div>

          {realFuelCost !== null && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <Fuel className="h-5 w-5 text-primary" />
                <div>
                  <span className="text-base">Spritkosten</span>
                  {livePrice && (
                    <p className="text-xs text-muted-foreground">
                      {livePrice.toFixed(3)} €/L Live-Preis
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xl font-bold text-primary">{formatCurrency(realFuelCost)}</span>
            </div>
          )}

          {flatCost !== null && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-muted-foreground" />
                <span className="text-base text-muted-foreground">Pauschale</span>
              </div>
              <span className="text-lg font-semibold text-muted-foreground">{formatCurrency(flatCost)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 pb-6 space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold gap-2 rounded-2xl shadow-xl"
          onClick={() => navigate("/rechnungen")}
        >
          <FileText className="h-5 w-5" />
          Rechnung erstellen
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-12 text-base gap-2 rounded-2xl"
          onClick={onDismiss}
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück zum Cockpit
        </Button>
      </div>
    </div>
  );
}
