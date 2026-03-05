import { motion } from "framer-motion";
import { 
  Play, MapPin, Clock, Route, Fuel, Loader2, WifiOff, 
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TourAppointment } from "@/components/tour-manager/TourCard";

interface CockpitReadyProps {
  appointments: TourAppointment[];
  isLoading: boolean;
  routeInfo: { distance: number; duration: number } | null;
  isCalculatingRoute: boolean;
  estimatedFuelCost: number | null;
  livePrice: number | null;
  isOnline: boolean;
  onStartTour: () => void;
}

export function CockpitReady({
  appointments,
  isLoading,
  routeInfo,
  isCalculatingRoute,
  estimatedFuelCost,
  livePrice,
  isOnline,
  onStartTour,
}: CockpitReadyProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          Offline – gecachte Daten verfügbar
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Tages-Cockpit</h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats Row */}
      <div className="px-4 pb-3 flex gap-2">
        <Badge variant="outline" className="h-9 px-3 gap-1.5 text-sm bg-muted/50">
          <MapPin className="h-4 w-4 text-primary" />
          {appointments.length} Termine
        </Badge>
        <Badge variant="outline" className="h-9 px-3 gap-1.5 text-sm bg-muted/50">
          {isCalculatingRoute ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Route className="h-4 w-4 text-primary" />
          )}
          {routeInfo ? `${routeInfo.distance} km` : "—"}
        </Badge>
        <Badge variant="outline" className="h-9 px-3 gap-1.5 text-sm bg-muted/50">
          <Clock className="h-4 w-4 text-primary" />
          {routeInfo
            ? `${Math.floor(routeInfo.duration / 60)}h ${routeInfo.duration % 60}m`
            : "—"
          }
        </Badge>
        {estimatedFuelCost !== null && (
          <Badge variant="outline" className="h-9 px-3 gap-1.5 text-sm bg-muted/50">
            <Fuel className="h-4 w-4 text-primary" />
            {formatCurrency(estimatedFuelCost)}
          </Badge>
        )}
      </div>

      {/* Appointment List */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">Keine Termine heute</p>
          </div>
        ) : (
          <div className="space-y-2 pb-32">
            {appointments.map((apt, idx) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-sm"
              >
                {/* Number */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {apt.time && (
                      <span className="text-lg font-bold font-mono">
                        {apt.time.substring(0, 5)}
                      </span>
                    )}
                    <span className="font-semibold truncate text-base">
                      {apt.client?.full_name || "Unbekannt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground truncate">
                      {apt.horses?.map(h => h.name).join(", ")}
                    </span>
                  </div>
                  {apt.client?.city && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[apt.client.street, apt.client.zip, apt.client.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>

                {/* Status */}
                {apt.is_emergency && (
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                {apt.status === "completed" && (
                  <Badge variant="secondary" className="text-xs bg-chart-2/10 text-chart-2">✓</Badge>
                )}
                {!apt.client?.geo_lat && (
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                    Keine Koord.
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom CTA - Daumen-Zone */}
      {appointments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            size="lg"
            className="w-full h-16 text-xl font-bold gap-3 rounded-2xl shadow-xl"
            onClick={onStartTour}
          >
            <Play className="h-6 w-6" />
            Tour starten
          </Button>
          {livePrice && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              <Fuel className="h-3 w-3 inline mr-1" />
              Aktueller Spritpreis: {livePrice.toFixed(3)} €/L
            </p>
          )}
        </div>
      )}
    </div>
  );
}
