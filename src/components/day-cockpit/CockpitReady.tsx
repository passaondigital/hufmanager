import { motion } from "framer-motion";
import {
  Play, MapPin, Clock, Route, Fuel, Loader2, WifiOff,
  AlertTriangle, Timer, Navigation
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TourAppointment } from "@/components/tour-manager/TourCard";
import { TeamOverviewSection } from "./TeamOverviewSection";
import { HeyHufi } from "@/components/voice/HeyHufi";

interface CockpitReadyProps {
  appointments: TourAppointment[];
  isLoading: boolean;
  routeInfo: { distance: number; duration: number } | null;
  isCalculatingRoute: boolean;
  estimatedFuelCost: number | null;
  livePrice: number | null;
  isOnline: boolean;
  geocodeProgress: { current: number; total: number } | null;
  onStartTour: () => void;
  gpsConsentGiven: boolean;
  onGpsConsentChange: (v: boolean) => void;
}

export function CockpitReady({
  appointments,
  isLoading,
  routeInfo,
  isCalculatingRoute,
  estimatedFuelCost,
  livePrice,
  isOnline,
  geocodeProgress,
  onStartTour,
  gpsConsentGiven,
  onGpsConsentChange,
}: CockpitReadyProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  // Calculate total estimated duration: service + buffers + drive time
  const totalServiceMinutes = appointments.reduce((sum, a) => sum + (a.estimated_minutes || 0), 0);
  const totalBufferMinutes = appointments.reduce((sum, a) => sum + (a.buffer_minutes || 0), 0);
  const driveMinutes = routeInfo?.duration || 0;
  const totalMinutes = totalServiceMinutes + totalBufferMinutes + driveMinutes;

  // Appointments missing coordinates
  const missingCoords = appointments.filter(a => !a.client?.geo_lat || !a.client?.geo_lng);
  const isGeocoding = !!geocodeProgress;
  const canStartTour = missingCoords.length === 0 && !isGeocoding;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#111" }}>
      {/* Offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium" style={{ background: "#dc2626", color: "#fff" }}>
          <WifiOff className="h-4 w-4" />
          Offline – gecachte Daten
        </div>
      )}

      {/* Header */}
      <div className="pl-14 pr-5 pt-5 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tages-Cockpit</h1>
          <p className="text-sm mt-0.5" style={{ color: "#999" }}>
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <HeyHufi
          onWakeWord={() => {
            // Wake-word erkannt im Cockpit
          }}
        />
      </div>

      {/* Stats */}
      <div className="px-5 py-3 flex gap-2 flex-wrap">
        <Stat icon={<MapPin className="h-4 w-4" />} label={`${appointments.length} Termine`} />
        <Stat
          icon={isCalculatingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
          label={routeInfo ? `${routeInfo.distance} km` : "—"}
        />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label={totalMinutes > 0 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : (routeInfo ? `${Math.floor(routeInfo.duration / 60)}h ${routeInfo.duration % 60}m` : "—")}
        />
        {totalServiceMinutes > 0 && (
          <Stat icon={<Timer className="h-4 w-4" />} label={`${totalServiceMinutes}m Arbeit`} />
        )}
        {estimatedFuelCost !== null && (
          <Stat icon={<Fuel className="h-4 w-4" />} label={fmt(estimatedFuelCost)} />
        )}
      </div>

      {/* GPS Consent Toggle */}
      <div className="px-5 pb-2">
        <button
          onClick={() => onGpsConsentChange(!gpsConsentGiven)}
          className="flex items-center gap-2 px-3 h-8 rounded-full text-xs font-medium transition-colors"
          style={{
            background: gpsConsentGiven ? "rgba(245,151,10,0.15)" : "#1a1a1a",
            color: gpsConsentGiven ? "#F5970A" : "#666",
            border: gpsConsentGiven ? "1px solid rgba(245,151,10,0.3)" : "1px solid #333",
          }}
        >
          <Navigation className="h-3 w-3" />
          GPS {gpsConsentGiven ? "aktiv" : "aktivieren"}
        </button>
      </div>

      {/* Team overview */}
      <TeamOverviewSection />

      {/* Appointment list */}
      <ScrollArea className="flex-1 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#666" }} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-12 w-12 mx-auto mb-3" style={{ color: "#333" }} />
            <p className="text-lg" style={{ color: "#666" }}>Keine Termine heute</p>
          </div>
        ) : (
          <div className="space-y-0 pb-36">
            {appointments.map((apt, idx) => (
              <div key={apt.id}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-4"
                  style={{ background: "#1a1a1a", borderRadius: 12 }}
                >
                  {/* Number circle */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{ background: "#F5970A", color: "#111" }}
                  >
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {apt.time && (
                        <span className="text-base font-bold font-mono text-white">
                          {apt.time.substring(0, 5)}
                        </span>
                      )}
                      <span className="font-semibold truncate text-base text-white">
                        {apt.client?.full_name || "Unbekannt"}
                      </span>
                    </div>
                    {/* Service type badge */}
                    {apt.service_type && (
                      <span
                        className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                        style={{
                          background: apt.service_color ? `${apt.service_color}20` : "#333",
                          color: apt.service_color || "#999",
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: apt.service_color || "#666" }} />
                        {apt.service_type}
                      </span>
                    )}
                    {apt.horses?.length ? (
                      <p className="text-sm truncate mt-0.5" style={{ color: "#999" }}>
                        {apt.horses.map(h => h.name).join(", ")}
                      </p>
                    ) : null}
                    {(apt.client?.street || apt.client?.city) && (
                      <p className="text-xs mt-0.5" style={{ color: "#666" }}>
                        {[apt.client.street, apt.client.zip, apt.client.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {(!apt.client?.geo_lat || !apt.client?.geo_lng) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#92400e30", color: "#fbbf24" }}>
                            <MapPin className="h-4 w-4 inline" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="text-sm">Keine Koordinaten – Adresse prüfen</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {apt.is_emergency && <AlertTriangle className="h-5 w-5" style={{ color: "#dc2626" }} />}
                    {apt.status === "completed" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#22c55e20", color: "#22c55e" }}>✓</span>
                    )}
                  </div>
                </motion.div>

                {/* Buffer separator */}
                {apt.buffer_minutes != null && apt.buffer_minutes > 0 && idx < appointments.length - 1 && (
                  <div className="flex items-center gap-2 px-6 py-2">
                    <div className="flex-1 h-px" style={{ background: "#333" }} />
                    <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "#666" }}>
                      {apt.buffer_minutes} min Puffer
                    </span>
                    <div className="flex-1 h-px" style={{ background: "#333" }} />
                  </div>
                )}
                {/* Small gap when no buffer */}
                {(!apt.buffer_minutes || apt.buffer_minutes <= 0) && idx < appointments.length - 1 && (
                  <div className="h-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom CTA */}
      {appointments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4"
          style={{ background: "linear-gradient(to top, #111 60%, transparent)" }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={canStartTour ? onStartTour : undefined}
                disabled={!canStartTour}
                className="w-full flex items-center justify-center gap-3 font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ height: 64, borderRadius: 12, background: canStartTour ? "#F5970A" : "#555", color: "#111" }}
              >
                {isGeocoding ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
                Tour starten
              </button>
            </TooltipTrigger>
            {!canStartTour && (
              <TooltipContent side="top">
                <p className="text-sm">Bitte erst Adressen der Termine prüfen</p>
              </TooltipContent>
            )}
          </Tooltip>
          {livePrice && (
            <p className="text-center text-xs mt-2" style={{ color: "#666" }}>
              <Fuel className="h-3 w-3 inline mr-1" />
              Spritpreis: {livePrice.toFixed(3)} €/L
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Stat badge helper ── */
function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium"
      style={{ background: "#1a1a1a", color: "#ccc" }}>
      <span style={{ color: "#F5970A" }}>{icon}</span>
      {label}
    </div>
  );
}
