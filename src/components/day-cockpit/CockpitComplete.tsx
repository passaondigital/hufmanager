import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Route, Fuel, FileText, WifiOff, ClipboardList, Download, ArrowLeft } from "lucide-react";
import type { TourAppointment } from "@/components/tour-manager/TourCard";

interface CockpitCompleteProps {
  gpsTotalKm: number;
  tourStartTime: Date | null;
  completedCount: number;
  totalCount: number;
  livePrice: number | null;
  vehicleConsumption: number | null | undefined;
  pricePerKm: number | null | undefined;
  isOnline: boolean;
  appointments: TourAppointment[];
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
  appointments,
  onDismiss,
}: CockpitCompleteProps) {
  const navigate = useNavigate();

  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  const driveTime = useMemo(() => {
    if (!tourStartTime) return { label: "—", hours: 0, minutes: 0 };
    const diff = Date.now() - tourStartTime.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { label: `${h}h ${m}min`, hours: h, minutes: m };
  }, [tourStartTime]);

  const fuelCost = useMemo(() => {
    if (!vehicleConsumption || !livePrice || gpsTotalKm <= 0) return null;
    return Math.round(gpsTotalKm * (vehicleConsumption / 100) * livePrice * 100) / 100;
  }, [gpsTotalKm, vehicleConsumption, livePrice]);

  const flatCost = useMemo(() => {
    if (!pricePerKm) return null;
    return Math.round(gpsTotalKm * pricePerKm * 100) / 100;
  }, [gpsTotalKm, pricePerKm]);

  // Build appointment timeline
  const completedAppointments = appointments.filter(a => a.status === "completed");

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#111" }}>
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium" style={{ background: "#dc2626", color: "#fff" }}>
          <WifiOff className="h-3.5 w-3.5" /> Offline
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-5 pt-8 pb-4 gap-5">
          {/* Hero */}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>
            <CheckCircle className="h-16 w-16" style={{ color: "#22c55e" }} />
          </motion.div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Tour beendet!</h1>
          </div>

          {/* Quick Stats */}
          <div className="w-full max-w-sm space-y-2">
            <SummaryRow
              icon={<CheckCircle className="h-5 w-5" />}
              label="Termine erledigt"
              value={`${completedCount}/${totalCount}`}
            />
            <SummaryRow
              icon={<Route className="h-5 w-5" />}
              label="Gefahren (GPS)"
              value={`${gpsTotalKm} km`}
            />
            <SummaryRow
              icon={<Clock className="h-5 w-5" />}
              label="Fahrzeit"
              value={driveTime.label}
            />
            {fuelCost !== null && (
              <SummaryRow
                icon={<Fuel className="h-5 w-5" />}
                label="Spritkosten"
                value={fmt(fuelCost)}
                sub={
                  flatCost !== null
                    ? `Live ${livePrice?.toFixed(3)} €/L · Pauschale ${fmt(flatCost)}`
                    : livePrice
                    ? `${livePrice.toFixed(3)} €/L`
                    : undefined
                }
                highlight
              />
            )}
            {fuelCost === null && flatCost !== null && (
              <SummaryRow
                icon={<Fuel className="h-5 w-5" />}
                label="Pauschale"
                value={fmt(flatCost)}
                dim
              />
            )}
            <SummaryRow
              icon={<ClipboardList className="h-5 w-5" />}
              label="Fahrtenbuch"
              value="✓ gespeichert"
              highlight
            />
          </div>

          {/* Appointment Timeline */}
          {completedAppointments.length > 0 && (
            <div className="w-full max-w-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#888" }}>
                Tagesübersicht
              </h2>
              <div className="space-y-1.5">
                {appointments.map((apt, i) => (
                  <AppointmentRow key={apt.id} appointment={apt} index={i + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed CTAs */}
      <div className="shrink-0 px-5 pb-6 pt-3 space-y-2" style={{ background: "linear-gradient(to top, #111 80%, transparent)" }}>
        <button
          onClick={() => navigate("/rechnungen")}
          className="w-full flex items-center justify-center gap-2 font-bold text-lg"
          style={{ height: 56, borderRadius: 12, background: "#F5970A", color: "#111" }}
        >
          <FileText className="h-5 w-5" />
          Rechnungen erstellen
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/tour-manager?tab=fahrtenbuch")}
            className="flex-1 flex items-center justify-center gap-2 font-medium text-sm"
            style={{ height: 44, borderRadius: 12, background: "#1a1a1a", color: "#ccc" }}
          >
            <Download className="h-4 w-4" />
            Fahrtenbuch exportieren
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 flex items-center justify-center gap-2 font-medium text-sm"
            style={{ height: 44, borderRadius: 12, background: "#1a1a1a", color: "#999" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Cockpit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────── */

function SummaryRow({
  icon, label, value, sub, highlight, dim,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean; dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3.5" style={{ background: "#1a1a1a", borderRadius: 12 }}>
      <div className="flex items-center gap-3">
        <span style={{ color: dim ? "#666" : "#F5970A" }}>{icon}</span>
        <div>
          <span className="text-sm" style={{ color: dim ? "#666" : "#ccc" }}>{label}</span>
          {sub && <p className="text-xs mt-0.5" style={{ color: "#666" }}>{sub}</p>}
        </div>
      </div>
      <span
        className="text-lg font-bold font-mono"
        style={{ color: highlight ? "#F5970A" : dim ? "#666" : "#fff" }}
      >
        {value}
      </span>
    </div>
  );
}

function AppointmentRow({ appointment, index }: { appointment: TourAppointment; index: number }) {
  const isCompleted = appointment.status === "completed";
  const clientName = appointment.client?.full_name || "Unbekannt";
  const duration = appointment.estimated_minutes;

  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5"
      style={{ background: "#1a1a1a", borderRadius: 10 }}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: isCompleted ? "#22c55e22" : "#ffffff11",
          color: isCompleted ? "#22c55e" : "#666",
        }}
      >
        {isCompleted ? "✓" : index}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block" style={{ color: isCompleted ? "#ccc" : "#666" }}>
          {clientName}
        </span>
      </div>
      {isCompleted && (
        <span className="text-xs font-medium shrink-0" style={{ color: "#22c55e" }}>
          ✅ {duration ? `${duration} min` : "erledigt"}
        </span>
      )}
      {!isCompleted && appointment.status === "no_show" && (
        <span className="text-xs shrink-0" style={{ color: "#ef4444" }}>Nicht erschienen</span>
      )}
      {!isCompleted && appointment.status !== "no_show" && (
        <span className="text-xs shrink-0" style={{ color: "#666" }}>offen</span>
      )}
    </div>
  );
}
