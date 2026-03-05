import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Navigation, CheckCircle, MapPin, Clock, Route, WifiOff,
  Square, Play
} from "lucide-react";
import type { TourAppointment } from "@/components/tour-manager/TourCard";
import "leaflet/dist/leaflet.css";

/* ── Leaflet Icons ── */
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#F5970A;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="#F5970A"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/* ── Map auto-fit ── */
function MapAutoFit({ userPos, destPos }: { userPos: [number, number] | null; destPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (userPos && destPos) {
      const bounds = L.latLngBounds([userPos, destPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (userPos) {
      map.setView(userPos, 14, { animate: true });
    }
  }, [userPos, destPos, map]);
  return null;
}

/* ── Props ── */
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

  // Live timer — update every second for responsiveness
  useEffect(() => {
    if (!tourStartTime) return;
    const tick = () => {
      const diff = Date.now() - tourStartTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tourStartTime]);

  const center: [number, number] = userLocation || [51.1657, 10.4515];

  const nextPos: [number, number] | null =
    activeAppointment?.client?.geo_lat && activeAppointment?.client?.geo_lng
      ? [activeAppointment.client.geo_lat, activeAppointment.client.geo_lng]
      : null;

  const segment: [number, number][] = [];
  if (userLocation) segment.push(userLocation);
  if (nextPos) segment.push(nextPos);

  const allDone = completedCount >= appointments.length && appointments.length > 0;
  const isArrived = activeAppointment?.status === "in_progress";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "#111111" }}>
      {/* Offline strip */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium" style={{ background: "#dc2626", color: "#fff" }}>
          <WifiOff className="h-3.5 w-3.5" />
          Offline – gecachte Karte verfügbar
        </div>
      )}

      {/* ── MAP: 55vh ── */}
      <div className="relative" style={{ height: "55vh", minHeight: "55vh" }}>
        {/* Transparent stats overlay */}
        <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 pt-3 pb-6 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)" }}>
          <span className="text-white font-bold text-xl font-mono pointer-events-auto">
            {gpsTotalKm} km
          </span>
          <span className="text-white/80 font-semibold text-sm pointer-events-auto">
            {completedCount}/{appointments.length} Termine
          </span>
        </div>

        <MapContainer
          center={center}
          zoom={14}
          className="h-full w-full"
          style={{ zIndex: 0 }}
          scrollWheelZoom
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapAutoFit userPos={userLocation} destPos={nextPos} />
          {userLocation && <Marker position={userLocation} icon={userIcon} />}
          {nextPos && <Marker position={nextPos} icon={destIcon} />}
          {segment.length > 1 && (
            <Polyline positions={segment} pathOptions={{ color: "#F5970A", weight: 5, opacity: 0.9 }} />
          )}
        </MapContainer>
      </div>

      {/* ── BOTTOM PANEL: 45vh ── */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden" style={{ background: "#1a1a1a" }}>
        {allDone ? (
          /* All done state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
            <CheckCircle className="h-14 w-14" style={{ color: "#22c55e" }} />
            <p className="text-2xl font-bold text-white text-center">Alle Termine erledigt!</p>
            <p className="text-sm text-center" style={{ color: "#999" }}>
              {gpsTotalKm} km · {elapsed} Fahrzeit
            </p>
          </div>
        ) : activeAppointment ? (
          /* Active appointment info */
          <div className="flex-1 flex flex-col px-5 pt-4 gap-3 overflow-auto">
            {/* Client name */}
            <h2 className="text-2xl font-bold text-white leading-tight truncate">
              {activeAppointment.client?.full_name || "Unbekannt"}
            </h2>
            {/* Address + horse */}
            <p className="text-sm leading-snug" style={{ color: "#999" }}>
              {[
                activeAppointment.client?.street,
                activeAppointment.client?.zip,
                activeAppointment.client?.city,
              ].filter(Boolean).join(", ") || "Keine Adresse"}
              {activeAppointment.horses?.length ? ` · ${activeAppointment.horses.map(h => h.name).join(", ")}` : ""}
            </p>

            {/* Stats cards */}
            <div className="flex gap-3 mt-1">
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "#222" }}>
                <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: "#F5970A" }} />
                <p className="text-xl font-bold font-mono text-white">{elapsed}</p>
                <p className="text-xs" style={{ color: "#999" }}>Fahrzeit</p>
              </div>
              <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "#222" }}>
                <Route className="h-5 w-5 mx-auto mb-1" style={{ color: "#F5970A" }} />
                <p className="text-xl font-bold font-mono text-white">{gpsTotalKm}</p>
                <p className="text-xs" style={{ color: "#999" }}>km bisher</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── ACTION BUTTONS — Daumen-Zone ── */}
        <div className="px-4 pb-6 pt-3 space-y-3">
          {allDone ? (
            <button
              onClick={onEndTour}
              className="w-full flex items-center justify-center gap-2 font-bold text-lg text-white"
              style={{ height: 56, borderRadius: 12, background: "#dc2626" }}
            >
              <Square className="h-5 w-5" />
              Tour beenden
            </button>
          ) : activeAppointment ? (
            <div className="flex gap-3">
              {/* Left button */}
              {!isArrived ? (
                activeAppointment.client?.geo_lat && activeAppointment.client?.geo_lng ? (
                  <button
                    onClick={() => onNavigate(activeAppointment.client!.geo_lat!, activeAppointment.client!.geo_lng!)}
                    className="flex-1 flex items-center justify-center gap-2 font-bold text-base text-white"
                    style={{ height: 56, borderRadius: 12, background: "#333" }}
                  >
                    <Navigation className="h-5 w-5" />
                    Navigieren
                  </button>
                ) : null
              ) : (
                <button
                  onClick={() => onArrived(activeAppointment.id)}
                  className="flex-1 flex items-center justify-center gap-2 font-bold text-base text-white"
                  style={{ height: 56, borderRadius: 12, background: "#333" }}
                >
                  <Play className="h-5 w-5" />
                  Termin starten
                </button>
              )}

              {/* Right button — primary action */}
              {!isArrived ? (
                <button
                  onClick={() => onArrived(activeAppointment.id)}
                  className="flex-1 flex items-center justify-center gap-2 font-bold text-base"
                  style={{ height: 56, borderRadius: 12, background: "#F5970A", color: "#111" }}
                >
                  <MapPin className="h-5 w-5" />
                  Angekommen
                </button>
              ) : (
                <button
                  onClick={() => onComplete(activeAppointment.id)}
                  className="flex-1 flex items-center justify-center gap-2 font-bold text-base"
                  style={{ height: 56, borderRadius: 12, background: "#22c55e", color: "#111" }}
                >
                  <CheckCircle className="h-5 w-5" />
                  Erledigt
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
