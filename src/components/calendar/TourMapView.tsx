import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, Clock, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix Leaflet default icon issue
import "leaflet/dist/leaflet.css";

// Custom marker icons
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 12px;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const greenIcon = createMarkerIcon("hsl(142, 76%, 36%)");
const orangeIcon = createMarkerIcon("hsl(25, 95%, 53%)");
const userIcon = createMarkerIcon("hsl(217, 91%, 60%)");

interface AppointmentWithLocation {
  id: string;
  date: string;
  time: string | null;
  status: string | null;
  service_type: string | null;
  horses: { name: string } | null;
  clients: {
    first_name: string | null;
    last_name: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
  } | null;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
}

interface TourMapViewProps {
  appointments: AppointmentWithLocation[];
  selectedDate: Date;
  isLoading?: boolean;
}

// Component to fit bounds when appointments change
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [positions, map]);
  
  return null;
};

// Component to center on user location
const UserLocationMarker = ({ 
  onLocationFound 
}: { 
  onLocationFound: (lat: number, lng: number) => void 
}) => {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    map.locate({ setView: false, maxZoom: 13 });
    
    map.on("locationfound", (e) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onLocationFound(e.latlng.lat, e.latlng.lng);
    });
  }, [map, onLocationFound]);
  
  return position ? (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="text-sm font-medium">📍 Dein Standort</div>
      </Popup>
    </Marker>
  ) : null;
};

export const TourMapView = ({ 
  appointments, 
  selectedDate, 
  isLoading 
}: TourMapViewProps) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Filter appointments with valid coordinates and sort by time
  const validAppointments = useMemo(() => {
    return appointments
      .filter(apt => apt.clients?.geo_lat && apt.clients?.geo_lng)
      .sort((a, b) => {
        const timeA = a.time || "00:00";
        const timeB = b.time || "00:00";
        return timeA.localeCompare(timeB);
      });
  }, [appointments]);

  // Get positions for polyline
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    
    // Start with user location if available
    if (userLocation) {
      positions.push(userLocation);
    }
    
    // Add appointment locations in chronological order
    validAppointments.forEach(apt => {
      if (apt.clients?.geo_lat && apt.clients?.geo_lng) {
        positions.push([apt.clients.geo_lat, apt.clients.geo_lng]);
      }
    });
    
    return positions;
  }, [validAppointments, userLocation]);

  // Calculate route using OSRM
  useEffect(() => {
    const calculateRoute = async () => {
      if (routePositions.length < 2) {
        setRouteInfo(null);
        return;
      }

      setIsCalculatingRoute(true);
      
      try {
        // Build coordinates string for OSRM
        const coords = routePositions
          .map(p => `${p[1]},${p[0]}`) // OSRM uses lng,lat
          .join(";");
        
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.routes?.[0]) {
            setRouteInfo({
              distance: Math.round(data.routes[0].distance / 100) / 10, // km with 1 decimal
              duration: Math.round(data.routes[0].duration / 60), // minutes
            });
          }
        }
      } catch (error) {
        console.error("Error calculating route:", error);
      } finally {
        setIsCalculatingRoute(false);
      }
    };

    calculateRoute();
  }, [routePositions]);

  // Default center (Germany)
  const defaultCenter: [number, number] = [51.1657, 10.4515];
  
  // Calculate center based on appointments or user location
  const mapCenter = useMemo(() => {
    if (validAppointments.length > 0) {
      const first = validAppointments[0];
      if (first.clients?.geo_lat && first.clients?.geo_lng) {
        return [first.clients.geo_lat, first.clients.geo_lng] as [number, number];
      }
    }
    return userLocation || defaultCenter;
  }, [validAppointments, userLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const appointmentsWithoutCoords = appointments.filter(
    apt => !apt.clients?.geo_lat || !apt.clients?.geo_lng
  );

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Termine</div>
              <div className="font-semibold">
                {validAppointments.length} von {appointments.length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Strecke</div>
              <div className="font-semibold">
                {isCalculatingRoute ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : routeInfo ? (
                  `${routeInfo.distance} km`
                ) : (
                  "–"
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Fahrzeit</div>
              <div className="font-semibold">
                {isCalculatingRoute ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : routeInfo ? (
                  `${Math.floor(routeInfo.duration / 60)}h ${routeInfo.duration % 60}min`
                ) : (
                  "–"
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning for missing coordinates */}
      {appointmentsWithoutCoords.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {appointmentsWithoutCoords.length} Termin(e) ohne Koordinaten
            </span>
            <span className="text-muted-foreground ml-1">
              – Bitte die Kundenadresse prüfen.
            </span>
          </div>
        </div>
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[500px] md:h-[600px]">
            <MapContainer
              center={mapCenter}
              zoom={10}
              className="h-full w-full z-0"
              scrollWheelZoom={true}
            >
              {/* CartoDB Positron - clean, modern style */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Fit bounds to show all markers */}
              {routePositions.length > 0 && (
                <FitBounds positions={routePositions} />
              )}
              
              {/* User location marker */}
              <UserLocationMarker onLocationFound={(lat, lng) => setUserLocation([lat, lng])} />
              
              {/* Route polyline */}
              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: "hsl(25, 95%, 53%)", // HufManager Orange
                    weight: 4,
                    opacity: 0.8,
                    dashArray: "10, 10",
                  }}
                />
              )}
              
              {/* Appointment markers */}
              {validAppointments.map((apt, index) => {
                if (!apt.clients?.geo_lat || !apt.clients?.geo_lng) return null;
                
                const isCompleted = apt.status === "completed";
                const clientName = [apt.clients.first_name, apt.clients.last_name]
                  .filter(Boolean)
                  .join(" ") || "Unbekannt";
                
                return (
                  <Marker
                    key={apt.id}
                    position={[apt.clients.geo_lat, apt.clients.geo_lng]}
                    icon={isCompleted ? greenIcon : orangeIcon}
                  >
                    <Popup>
                      <div className="min-w-[180px] space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={isCompleted ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {index + 1}. Stopp
                          </Badge>
                          <span className="text-xs font-medium">
                            {apt.time || "–"} Uhr
                          </span>
                        </div>
                        <div className="font-semibold">{clientName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          🐴 {apt.horses?.name || "Unbekannt"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.service_type || "Termin"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TourMapView;
