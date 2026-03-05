import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, CheckCircle, MapPin, Clock, Route, WifiOff,
  ChevronUp, ChevronDown, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TourAppointment } from "@/components/tour-manager/TourCard";
import "leaflet/dist/leaflet.css";

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="width:20px;height:20px;background:hsl(217,91%,60%);border:3px solid white;border-radius:50%;box-shadow:0 0 0 8px hsla(217,91%,60%,0.2),0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const nextMarkerIcon = L.divIcon({
  className: "next-marker",
  html: `<div style="width:32px;height:32px;background:hsl(25,95%,53%);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="hsl(25,95%,53%)"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapFollower({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom() || 14, { animate: true });
  }, [position, map]);
  return null;
}

interface CockpitUnderwayProps {
  appointments: TourAppointment[];
  activeAppointment: TourAppointment | null;
  activeIndex: number;
  userLocation: [number, number] | null;
  routePositions: [number, number][];
  gpsTotalKm: number;
  tourStartTime: Date | null;
  completedCount: number;
  isOnline: boolean;
  onNavigate: (lat: number, lng: number) => void;
  onArrived: (id: string) => void;
  onComplete: (id: string) => void;
  onEndTour: () => void;
}

export function CockpitUnderway({
  appointments,
  activeAppointment,
  activeIndex,
  userLocation,
  routePositions,
  gpsTotalKm,
  tourStartTime,
  completedCount,
  isOnline,
  onNavigate,
  onArrived,
  onComplete,
  onEndTour,
}: CockpitUnderwayProps) {
  const [elapsed, setElapsed] = useState("00:00");
  const [panelExpanded, setPanelExpanded] = useState(true);

  // Timer
  useEffect(() => {
    if (!tourStartTime) return;
    const interval = setInterval(() => {
      const diff = Date.now() - tourStartTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }, 10000);
    // Initial
    const diff = Date.now() - tourStartTime.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    return () => clearInterval(interval);
  }, [tourStartTime]);

  const defaultCenter: [number, number] = userLocation || [51.1657, 10.4515];

  const nextPos: [number, number] | null = activeAppointment?.client?.geo_lat && activeAppointment?.client?.geo_lng
    ? [activeAppointment.client.geo_lat, activeAppointment.client.geo_lng]
    : null;

  // Route segment: user → next appointment
  const segmentPositions: [number, number][] = [];
  if (userLocation) segmentPositions.push(userLocation);
  if (nextPos) segmentPositions.push(nextPos);

  const allDone = completedCount >= appointments.length && appointments.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center gap-2 text-sm font-medium z-50">
          <WifiOff className="h-4 w-4" />
          Offline – gecachte Route verfügbar
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute top-2 left-2 right-2 z-[400] flex items-center gap-1.5 pointer-events-none">
        <Badge variant="outline" className="pointer-events-auto h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs">
          <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
          {elapsed}
        </Badge>
        <Badge variant="outline" className="pointer-events-auto h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs">
          <Route className="h-3.5 w-3.5 text-primary" />
          {gpsTotalKm} km
        </Badge>
        <Badge variant="outline" className="pointer-events-auto h-8 px-2 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {completedCount}/{appointments.length}
        </Badge>
      </div>

      {/* Map - Upper Half */}
      <div className={`relative z-0 transition-all ${panelExpanded ? "h-[45vh]" : "h-[70vh]"}`}>
        <MapContainer
          center={defaultCenter}
          zoom={14}
          className="h-full w-full"
          style={{ zIndex: 0 }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFollower position={userLocation} />
          {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}
          {nextPos && <Marker position={nextPos} icon={nextMarkerIcon} />}
          {segmentPositions.length > 1 && (
            <Polyline
              positions={segmentPositions}
              pathOptions={{ color: "hsl(25, 95%, 53%)", weight: 5, opacity: 0.9 }}
            />
          )}
        </MapContainer>
      </div>

      {/* Panel toggle */}
      <button
        onClick={() => setPanelExpanded(!panelExpanded)}
        className="relative z-10 flex items-center justify-center py-1 bg-muted/80 backdrop-blur-sm border-t border-b"
      >
        {panelExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronUp className="h-5 w-5 text-muted-foreground" />}
      </button>

      {/* Bottom Panel - Active Appointment */}
      <div className={`flex-1 flex flex-col overflow-hidden ${panelExpanded ? "" : "hidden"}`}>
        {allDone ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 pb-28 gap-4">
            <CheckCircle className="h-16 w-16 text-chart-2" />
            <p className="text-2xl font-bold text-center">Alle Termine erledigt!</p>
            <p className="text-muted-foreground text-center">
              {gpsTotalKm} km gefahren · {elapsed} Fahrzeit
            </p>
          </div>
        ) : activeAppointment ? (
          <div className="flex-1 flex flex-col p-4 pb-28 gap-3 overflow-auto">
            {/* Client & Horse */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Termin {activeIndex + 1} von {appointments.length}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {activeAppointment.client?.full_name || "Unbekannt"}
              </h2>
              <p className="text-lg text-muted-foreground">
                {activeAppointment.horses?.map(h => h.name).join(", ")}
              </p>
              {activeAppointment.client?.city && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[activeAppointment.client.street, activeAppointment.client.zip, activeAppointment.client.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {/* Live stats */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono">{elapsed}</p>
                <p className="text-xs text-muted-foreground">Fahrzeit</p>
              </div>
              <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                <Route className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono">{gpsTotalKm}</p>
                <p className="text-xs text-muted-foreground">km bisher</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom action buttons - Daumen-Zone */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-background via-background to-transparent z-20">
        {allDone ? (
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-14 text-lg font-bold gap-2 rounded-2xl shadow-xl"
            onClick={onEndTour}
          >
            <Square className="h-5 w-5" />
            Tour beenden
          </Button>
        ) : activeAppointment ? (
          <div className="flex gap-3">
            {activeAppointment.client?.geo_lat && activeAppointment.client?.geo_lng && (
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-14 text-base font-bold gap-2 rounded-2xl shadow-lg"
                onClick={() => onNavigate(activeAppointment.client!.geo_lat!, activeAppointment.client!.geo_lng!)}
              >
                <Navigation className="h-5 w-5" />
                Navigieren
              </Button>
            )}
            {activeAppointment.status !== "in_progress" ? (
              <Button
                size="lg"
                className="flex-1 h-14 text-base font-bold gap-2 rounded-2xl shadow-xl"
                onClick={() => onArrived(activeAppointment.id)}
              >
                <MapPin className="h-5 w-5" />
                Angekommen
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 h-14 text-base font-bold gap-2 rounded-2xl shadow-xl bg-chart-2 hover:bg-chart-2/90 text-white"
                onClick={() => onComplete(activeAppointment.id)}
              >
                <CheckCircle className="h-5 w-5" />
                Erledigt
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
