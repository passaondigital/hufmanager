import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Navigation, Clock, MapPin, AlertCircle, GripVertical, RotateCcw, Sparkles, Building2, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmergencyModeButton, QuickAddAppointmentFAB, StableGroupManager } from "@/components/tour";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { calculateRoute as calculateRouteORS } from "@/lib/routeService";

// Fix Leaflet default icon issue
import "leaflet/dist/leaflet.css";

// Dismissible warning component for coordinates
function DismissibleCoordinatesWarning({ appointments }: { appointments: AppointmentWithLocation[] }) {
  const [dismissed, setDismissed] = useState(false);
  
  if (appointments.length === 0 || dismissed) return null;
  
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
      <div className="flex-1">
        <span className="font-medium text-amber-600 dark:text-amber-400">
          {appointments.length} Termin(e) ohne Koordinaten
        </span>
        <span className="text-muted-foreground ml-1">
          – Bitte die Kundenadresse prüfen.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-500/20 rounded transition-colors"
        aria-label="Warnung schließen"
      >
        <X className="h-4 w-4 text-amber-500" />
      </button>
    </div>
  );
}

// PLZ cluster colors
const PLZ_COLORS = [
  "hsl(25, 95%, 53%)",   // Orange (primary)
  "hsl(217, 91%, 60%)",  // Blue
  "hsl(142, 76%, 36%)",  // Green
  "hsl(280, 70%, 50%)",  // Purple
  "hsl(45, 93%, 47%)",   // Yellow
  "hsl(0, 84%, 60%)",    // Red
  "hsl(180, 70%, 45%)",  // Cyan
  "hsl(330, 70%, 50%)",  // Pink
];

// Custom marker icons
const createMarkerIcon = (color: string, number?: number) => {
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
          font-size: 11px;
        ">${number !== undefined ? number : ''}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

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
    zip?: string | null;
  } | null;
}

interface RouteInfo {
  distance: number;
  duration: number;
}

interface TourMapViewProps {
  appointments: AppointmentWithLocation[];
  selectedDate: Date;
  isLoading?: boolean;
}

// Sortable appointment item
const SortableAppointmentItem = ({ 
  apt, 
  index,
  plzColor,
}: { 
  apt: AppointmentWithLocation; 
  index: number;
  plzColor: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: apt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = apt.status === "completed";
  const clientName = [apt.clients?.first_name, apt.clients?.last_name]
    .filter(Boolean)
    .join(" ") || "Unbekannt";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg scale-105",
        isCompleted && "opacity-60"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: plzColor }}
      >
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{clientName}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>🐴 {apt.horses?.name || "?"}</span>
          <span>•</span>
          <span>{apt.time || "–"}</span>
        </div>
      </div>
      
      {isCompleted && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">✓</Badge>
      )}
    </div>
  );
};

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
    if (!("geolocation" in navigator)) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        onLocationFound(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
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
  const [showPlzClusters, setShowPlzClusters] = useState(true);
  
  // Custom order state
  const [orderedAppointments, setOrderedAppointments] = useState<AppointmentWithLocation[]>([]);
  const [hasCustomOrder, setHasCustomOrder] = useState(false);

  // Initialize ordered appointments when appointments change
  useEffect(() => {
    const validApts = appointments
      .filter(apt => apt.clients?.geo_lat && apt.clients?.geo_lng)
      .sort((a, b) => {
        const timeA = a.time || "00:00";
        const timeB = b.time || "00:00";
        return timeA.localeCompare(timeB);
      });
    setOrderedAppointments(validApts);
    setHasCustomOrder(false);
  }, [appointments]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedAppointments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasCustomOrder(true);
    }
  }, []);

  // Reset to time-based order
  const resetOrder = useCallback(() => {
    const sorted = [...orderedAppointments].sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
    setOrderedAppointments(sorted);
    setHasCustomOrder(false);
  }, [orderedAppointments]);

  // Calculate PLZ clusters
  const plzClusters = useMemo(() => {
    const clusters: Record<string, { 
      plz: string; 
      appointments: AppointmentWithLocation[];
      center: [number, number];
      color: string;
    }> = {};

    orderedAppointments.forEach((apt) => {
      if (!apt.clients?.geo_lat || !apt.clients?.geo_lng) return;
      
      // Extract first 2 digits of ZIP code (PLZ area)
      const zip = apt.clients.zip || "";
      const plzArea = zip.substring(0, 2) || "??";
      
      if (!clusters[plzArea]) {
        const colorIndex = Object.keys(clusters).length % PLZ_COLORS.length;
        clusters[plzArea] = {
          plz: plzArea,
          appointments: [],
          center: [0, 0],
          color: PLZ_COLORS[colorIndex],
        };
      }
      
      clusters[plzArea].appointments.push(apt);
    });

    // Calculate center for each cluster
    Object.values(clusters).forEach((cluster) => {
      const lats = cluster.appointments.map(a => a.clients!.geo_lat!);
      const lngs = cluster.appointments.map(a => a.clients!.geo_lng!);
      cluster.center = [
        lats.reduce((a, b) => a + b, 0) / lats.length,
        lngs.reduce((a, b) => a + b, 0) / lngs.length,
      ];
    });

    return clusters;
  }, [orderedAppointments]);

  // Get PLZ color for an appointment
  const getPlzColor = useCallback((apt: AppointmentWithLocation): string => {
    const zip = apt.clients?.zip || "";
    const plzArea = zip.substring(0, 2) || "??";
    return plzClusters[plzArea]?.color || PLZ_COLORS[0];
  }, [plzClusters]);

  // Get positions for polyline
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    
    if (userLocation) {
      positions.push(userLocation);
    }
    
    orderedAppointments.forEach(apt => {
      if (apt.clients?.geo_lat && apt.clients?.geo_lng) {
        positions.push([apt.clients.geo_lat, apt.clients.geo_lng]);
      }
    });
    
    return positions;
  }, [orderedAppointments, userLocation]);

  // Calculate route using OpenRouteService
  useEffect(() => {
    const doCalculateRoute = async () => {
      if (routePositions.length < 2) {
        setRouteInfo(null);
        return;
      }

      setIsCalculatingRoute(true);
      
      try {
        const result = await calculateRouteORS(routePositions);
        if (result) {
          setRouteInfo(result);
        }
      } catch (error) {
        console.error("Error calculating route:", error);
      } finally {
        setIsCalculatingRoute(false);
      }
    };

    doCalculateRoute();
  }, [routePositions]);

  const defaultCenter: [number, number] = [51.1657, 10.4515];
  
  const mapCenter = useMemo(() => {
    if (orderedAppointments.length > 0) {
      const first = orderedAppointments[0];
      if (first.clients?.geo_lat && first.clients?.geo_lng) {
        return [first.clients.geo_lat, first.clients.geo_lng] as [number, number];
      }
    }
    return userLocation || defaultCenter;
  }, [orderedAppointments, userLocation]);

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
      {/* Tour Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stats Cards */}
        <Card className="flex-1 min-w-[100px]">
          <CardContent className="p-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Termine</div>
              <div className="font-semibold">
                {orderedAppointments.length} von {appointments.length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[100px]">
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
        
        <Card className="flex-1 min-w-[100px]">
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Emergency Mode Button */}
        <EmergencyModeButton
          tourDate={selectedDate}
          appointmentIds={orderedAppointments.map(a => a.id)}
        />
      </div>

      {/* Sammeltermine Tab Section */}
      <Tabs defaultValue="tour" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="tour" className="gap-2">
            <Navigation className="h-4 w-4" />
            Tour-Ansicht
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Building2 className="h-4 w-4" />
            Sammeltermine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <StableGroupManager selectedDate={selectedDate} />
        </TabsContent>

        <TabsContent value="tour" className="mt-4 space-y-4">

      {/* Dismissible Warning for missing coordinates */}
      <DismissibleCoordinatesWarning appointments={appointmentsWithoutCoords} />

      {/* Main Layout: Sidebar + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sortable Appointments Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tour-Reihenfolge</CardTitle>
              {hasCustomOrder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetOrder}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ziehe die Termine, um die Route zu optimieren
            </p>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <ScrollArea className="h-[450px] pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedAppointments.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedAppointments.map((apt, index) => (
                      <SortableAppointmentItem
                        key={apt.id}
                        apt={apt}
                        index={index}
                        plzColor={getPlzColor(apt)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Karte</CardTitle>
            <Button
              variant={showPlzClusters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowPlzClusters(!showPlzClusters)}
              className="h-7 px-2 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              PLZ-Cluster
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px]">
              <MapContainer
                center={mapCenter}
                zoom={10}
                className="h-full w-full z-0"
                scrollWheelZoom={true}
              >
                {/* Fallback: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
                />
                
                {routePositions.length > 0 && (
                  <FitBounds positions={routePositions} />
                )}
                
                <UserLocationMarker onLocationFound={(lat, lng) => setUserLocation([lat, lng])} />
                
                {/* PLZ Cluster circles */}
                {showPlzClusters && Object.values(plzClusters).map((cluster) => (
                  <Circle
                    key={cluster.plz}
                    center={cluster.center}
                    radius={3000}
                    pathOptions={{
                      color: cluster.color,
                      fillColor: cluster.color,
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: "5, 5",
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">PLZ-Gebiet {cluster.plz}xxx</div>
                        <div className="text-muted-foreground">
                          {cluster.appointments.length} Termin(e)
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
                
                {/* Route polyline */}
                {routePositions.length > 1 && (
                  <Polyline
                    positions={routePositions}
                    pathOptions={{
                      color: "hsl(25, 95%, 53%)",
                      weight: 4,
                      opacity: 0.8,
                      dashArray: "10, 10",
                    }}
                  />
                )}
                
                {/* Appointment markers with numbers */}
                {orderedAppointments.map((apt, index) => {
                  if (!apt.clients?.geo_lat || !apt.clients?.geo_lng) return null;
                  
                  const isCompleted = apt.status === "completed";
                  const clientName = [apt.clients.first_name, apt.clients.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unbekannt";
                  
                  const markerColor = isCompleted 
                    ? "hsl(142, 76%, 36%)" 
                    : getPlzColor(apt);
                  
                  return (
                    <Marker
                      key={apt.id}
                      position={[apt.clients.geo_lat, apt.clients.geo_lng]}
                      icon={createMarkerIcon(markerColor, index + 1)}
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

      {/* PLZ Legend */}
      {showPlzClusters && Object.keys(plzClusters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.values(plzClusters).map((cluster) => (
            <Badge
              key={cluster.plz}
              variant="outline"
              className="text-xs gap-1"
              style={{ borderColor: cluster.color, color: cluster.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cluster.color }}
              />
              PLZ {cluster.plz}xxx ({cluster.appointments.length})
            </Badge>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>

      {/* Quick Add FAB */}
      <QuickAddAppointmentFAB
        tourDate={selectedDate}
        currentAppointmentCount={appointments.length}
      />
    </div>
  );
};

export default TourMapView;
