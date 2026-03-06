import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Navigation, CheckCircle, MapPin, Clock, Route, WifiOff,
  Square, Play, Volume2, VolumeX, ChevronRight, Pause, Compass, AlertTriangle, UserX
} from "lucide-react";
import { useTurnByTurn } from "@/hooks/useTurnByTurn";
import type { TourAppointment } from "@/components/tour-manager/TourCard";
import type { RouteStep } from "@/lib/routeService";
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

/* ── Map auto-fit + bearing rotation ── */
function MapBearingController({ userPos, destPos, bearing, followMode }: { 
  userPos: [number, number] | null; destPos: [number, number] | null; bearing: number; followMode: boolean 
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (!initialFitDone.current && userPos && destPos) {
      const bounds = L.latLngBounds([userPos, destPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      initialFitDone.current = true;
    } else if (!initialFitDone.current && userPos) {
      map.setView(userPos, 14, { animate: true });
      initialFitDone.current = true;
    }
  }, [userPos, destPos, map]);

  // Follow user and rotate map with bearing
  useEffect(() => {
    if (!followMode || !userPos) return;
    map.setView(userPos, map.getZoom(), { animate: true, duration: 0.5 });
  }, [userPos, followMode, map]);

  // Apply CSS rotation for bearing
  useEffect(() => {
    const container = map.getContainer();
    if (followMode && bearing !== 0) {
      container.style.transition = "transform 0.5s ease-out";
      container.style.transform = `rotate(${-bearing}deg)`;
    } else {
      container.style.transition = "transform 0.5s ease-out";
      container.style.transform = "rotate(0deg)";
    }
    return () => {
      container.style.transform = "";
      container.style.transition = "";
    };
  }, [bearing, followMode, map]);

  return null;
}

/* ── Turn arrow mapping ── */
function getTurnArrow(type: number): string {
  switch (type) {
    case 0: return "↑"; // left
    case 1: return "↗"; // right
    case 2: return "↑"; // sharp left
    case 3: return "↗"; // sharp right
    case 4: return "↰"; // slight left
    case 5: return "↱"; // slight right
    case 6: return "↑"; // straight
    case 7: return "↻"; // enter roundabout
    case 8: return "↻"; // exit roundabout
    case 9: return "↩"; // u-turn
    case 10: return "🏁"; // goal
    case 11: return "🚀"; // depart
    case 12: return "↰"; // keep left
    case 13: return "↱"; // keep right
    default: return "↑";
  }
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
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
  routeGeometry?: GeoJSON.LineString;
  routeSteps?: RouteStep[];
  isPaused?: boolean;
  onNavigate: (lat: number, lng: number) => void;
  onArrived: (id: string) => void;
  onComplete: (id: string) => void;
  onEndTour: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReportDelay?: () => void;
  onNoShow?: (id: string) => void;
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
  routeGeometry,
  routeSteps,
  isPaused,
  onNavigate,
  onArrived,
  onComplete,
  onEndTour,
  onPause,
  onResume,
  onReportDelay,
  onNoShow,
}: CockpitUnderwayProps) {
  const [elapsed, setElapsed] = useState("00:00");
  const [bearing, setBearing] = useState(0);
  const [followMode, setFollowMode] = useState(true);
  const prevLocationRef = useRef<[number, number] | null>(null);

  // Bearing calculation from GPS movement
  useEffect(() => {
    if (!userLocation || isPaused) return;
    const prev = prevLocationRef.current;
    if (prev) {
      const [lat1, lng1] = prev;
      const [lat2, lng2] = userLocation;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const lat1Rad = (lat1 * Math.PI) / 180;
      const lat2Rad = (lat2 * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
      let deg = (Math.atan2(y, x) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      // Only update bearing if distance > 10m (avoid jitter when stationary)
      const dist = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2) * 111000;
      if (dist > 10) {
        setBearing(Math.round(deg));
      }
    }
    prevLocationRef.current = userLocation;
  }, [userLocation, isPaused]);

  // Live timer
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

  // Turn-by-turn navigation
  const routeCoords = routeGeometry?.coordinates as [number, number][] | undefined;
  const { 
    nextStep, distanceToNextTurn, speedKmh, arrived, arrivalTarget,
    resetArrival, toggleSpeech, speechEnabled
  } = useTurnByTurn(
    routeSteps,
    routeCoords,
    userLocation,
    nextPos,
    activeAppointment?.client?.full_name || null,
    routeSteps != null && routeSteps.length > 0
  );

  // Auto-arrival detection
  useEffect(() => {
    if (arrived && activeAppointment) {
      // Toast-like behavior handled by parent via arrived state
    }
  }, [arrived, activeAppointment]);

  // GeoJSON route line (convert [lng,lat] to [lat,lng] for Leaflet Polyline)
  const routeLine = useMemo(() => {
    if (!routeGeometry?.coordinates?.length) return null;
    return (routeGeometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [routeGeometry]);

  // Fallback straight line
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

      {/* ── TURN-BY-TURN BANNER ── */}
      {nextStep && !allDone && !isArrived && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#1e3a5f", color: "#fff", zIndex: 600 }}>
          <span className="text-3xl font-bold" style={{ minWidth: 40, textAlign: "center" }}>
            {getTurnArrow(nextStep.type)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{nextStep.instruction}</p>
            {distanceToNextTurn != null && (
              <p className="text-xs opacity-75">In {formatDistance(distanceToNextTurn)}</p>
            )}
          </div>
          <button onClick={toggleSpeech} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
            {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* ── Arrival Toast ── */}
      {arrived && activeAppointment && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#166534", color: "#fff", zIndex: 600 }}>
          <MapPin className="h-5 w-5 flex-shrink-0" />
          <p className="flex-1 text-sm font-bold">Angekommen bei {arrivalTarget}?</p>
          <button
            onClick={() => {
              onArrived(activeAppointment.id);
              resetArrival();
            }}
            className="px-4 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: "#22c55e", color: "#111" }}
          >
            Ja
          </button>
        </div>
      )}

      {/* ── MAP: 55vh ── */}
      <div className="relative" style={{ height: "55vh", minHeight: "55vh" }}>
        {/* Transparent stats overlay */}
        <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 pt-3 pb-6 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)" }}>
          {/* Speed display */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {speedKmh != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-2xl font-mono" style={{ color: speedKmh > 100 ? "#f97316" : "#22c55e" }}>
                  {speedKmh}
                </span>
                <span className="text-white/60 text-xs">km/h</span>
              </div>
            )}
            <span className="text-white font-bold text-xl font-mono">
              {gpsTotalKm} km
            </span>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="text-white/80 font-semibold text-sm">
              {completedCount}/{appointments.length} Termine
            </span>
            {/* North arrow / compass */}
            <button
              onClick={() => {
                setFollowMode(!followMode);
                if (followMode) setBearing(0);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              title={followMode ? "Nordausrichtung" : "Fahrtrichtung folgen"}
            >
              <Compass
                className="h-5 w-5 text-white"
                style={{
                  transform: followMode ? `rotate(${bearing}deg)` : "rotate(0deg)",
                  transition: "transform 0.5s ease-out",
                }}
              />
            </button>
          </div>
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
          <MapBearingController userPos={userLocation} destPos={nextPos} bearing={bearing} followMode={followMode} />
          {userLocation && <Marker position={userLocation} icon={userIcon} />}
          {nextPos && <Marker position={nextPos} icon={destIcon} />}
          
          {/* Real ORS route line or fallback straight line */}
          {routeLine && routeLine.length > 1 ? (
            <Polyline positions={routeLine} pathOptions={{ color: "#F5970A", weight: 6, opacity: 0.9 }} />
          ) : segment.length > 1 ? (
            <Polyline positions={segment} pathOptions={{ color: "#F5970A", weight: 5, opacity: 0.7 }} />
          ) : null}
        </MapContainer>
      </div>

      {/* ── BOTTOM PANEL: 45vh ── */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden" style={{ background: "#1a1a1a" }}>
        {allDone ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5">
            <CheckCircle className="h-14 w-14" style={{ color: "#22c55e" }} />
            <p className="text-2xl font-bold text-white text-center">Alle Termine erledigt!</p>
            <p className="text-sm text-center" style={{ color: "#999" }}>
              {gpsTotalKm} km · {elapsed} Fahrzeit
            </p>
          </div>
        ) : activeAppointment ? (
          <div className="flex-1 flex flex-col px-5 pt-4 gap-3 overflow-auto">
            <h2 className="text-2xl font-bold text-white leading-tight truncate">
              {activeAppointment.client?.full_name || "Unbekannt"}
            </h2>
            <p className="text-sm leading-snug" style={{ color: "#999" }}>
              {[
                activeAppointment.client?.street,
                activeAppointment.client?.zip,
                activeAppointment.client?.city,
              ].filter(Boolean).join(", ") || "Keine Adresse"}
              {activeAppointment.horses?.length ? ` · ${activeAppointment.horses.map(h => h.name).join(", ")}` : ""}
            </p>

            {/* Service type badge */}
            {activeAppointment.service_type && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold w-fit"
                style={{
                  background: activeAppointment.service_color ? `${activeAppointment.service_color}20` : "#333",
                  color: activeAppointment.service_color || "#F5970A",
                }}>
                <span className="w-2 h-2 rounded-full" style={{ background: activeAppointment.service_color || "#F5970A" }} />
                {activeAppointment.service_type}
              </span>
            )}

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

        {/* ── PAUSE OVERLAY ── */}
        {isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <Pause className="h-16 w-16 text-white/50" />
            <p className="text-xl font-bold text-white">Tour pausiert</p>
            <p className="text-sm text-white/60">{elapsed} · {gpsTotalKm} km</p>
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-2 font-bold text-lg px-8"
              style={{ height: 56, borderRadius: 12, background: "#F5970A", color: "#111" }}
            >
              <Play className="h-5 w-5" />
              Weiterfahren
            </button>
          </div>
        )}

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
            <>
              <div className="flex gap-3">
                {!isArrived ? (
                  activeAppointment.client?.geo_lat && activeAppointment.client?.geo_lng ? (
                    <button
                      onClick={() => onNavigate(activeAppointment.client!.geo_lat!, activeAppointment.client!.geo_lng!)}
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-base text-white"
                      style={{ height: 56, borderRadius: 12, background: "#333" }}
                    >
                      <Navigation className="h-5 w-5" />
                      GPS zentrieren
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

                {!isArrived ? (
                  <>
                    <button
                      onClick={() => onArrived(activeAppointment.id)}
                      className="flex-1 flex items-center justify-center gap-2 font-bold text-base"
                      style={{ height: 56, borderRadius: 12, background: "#F5970A", color: "#111" }}
                    >
                      <MapPin className="h-5 w-5" />
                      Angekommen
                    </button>
                    <button
                      onClick={() => onNoShow?.(activeAppointment.id)}
                      className="flex items-center justify-center gap-1.5 font-bold text-sm"
                      style={{ height: 56, borderRadius: 12, background: "#f59e0b20", color: "#f59e0b", paddingInline: 14 }}
                      title="Nicht angetroffen"
                    >
                      <UserX className="h-5 w-5" />
                    </button>
                  </>
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
              {/* Delay / Pause / End row */}
              <div className="flex gap-2">
                <button
                  onClick={onReportDelay}
                  className="flex items-center justify-center gap-1.5 font-bold text-sm"
                  style={{ height: 44, borderRadius: 10, background: "#f59e0b20", color: "#f59e0b", paddingInline: 12 }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Verspätung
                </button>
                <button
                  onClick={isPaused ? onResume : onPause}
                  className="flex-1 flex items-center justify-center gap-2 font-bold text-sm text-white"
                  style={{ height: 44, borderRadius: 10, background: isPaused ? "#F5970A" : "#333" }}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "Weiter" : "Pause"}
                </button>
                <button
                  onClick={onEndTour}
                  className="flex items-center justify-center gap-1.5 font-bold text-sm"
                  style={{ height: 44, borderRadius: 10, background: "#dc262630", color: "#dc2626", paddingInline: 12 }}
                >
                  <Square className="h-4 w-4" />
                  Ende
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
