import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  DragEndEvent 
} from "@dnd-kit/core";
import { 
  SortableContext, 
  arrayMove, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, AlertCircle, History, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { TourCard, type TourAppointment } from "./TourCard";
import { TourControls } from "./TourControls";
import { BreadcrumbsReplay, BreadcrumbsLayer } from "./BreadcrumbsReplay";
import { TourPdfExport } from "./TourPdfExport";
import { NearbyCustomersPanel, NearbyCustomersMarkers } from "./NearbyCustomersLayer";
import { StableGroupPanel } from "./StableGroupPanel";
import { QuickAddAppointmentFAB } from "@/components/tour/QuickAddAppointmentFAB";
import { EmergencyModeButton } from "@/components/tour/EmergencyModeButton";

import "leaflet/dist/leaflet.css";

// Dismissible warning component
function DismissibleWarning({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(false);
  
  if (count === 0 || dismissed) return null;
  
  return (
    <div className="absolute top-20 left-4 right-4 z-[1000] pointer-events-none">
      <div className="bg-amber-500/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg max-w-md mx-auto pointer-events-auto">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">{count} Termin(e) ohne Koordinaten</span>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Warnung schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
const createMarkerIcon = (color: string, number: number, isCompleted: boolean) => {
  const bgColor = isCompleted ? 'hsl(var(--chart-2))' : color;
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${bgColor};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid hsl(var(--background));
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        color: hsl(var(--primary-foreground));
      ">${number}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: hsl(217, 91%, 60%);
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 8px hsla(217, 91%, 60%, 0.2), 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to handle map bounds
const MapBoundsHandler = ({ 
  positions, 
  userLocation 
}: { 
  positions: [number, number][]; 
  userLocation: [number, number] | null;
}) => {
  const map = useMap();
  
  useEffect(() => {
    const allPositions = userLocation ? [userLocation, ...positions] : positions;
    if (allPositions.length > 0) {
      const bounds = L.latLngBounds(allPositions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }
  }, [positions, userLocation, map]);
  
  return null;
};

// User location tracker
const UserLocationTracker = ({ 
  onLocationFound 
}: { 
  onLocationFound: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        onLocationFound(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, onLocationFound]);
  
  return position ? (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>
        <div className="text-sm font-medium">📍 Mein Standort</div>
      </Popup>
    </Marker>
  ) : null;
};

export function TourManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [orderedAppointments, setOrderedAppointments] = useState<TourAppointment[]>([]);
  const [hasCustomOrder, setHasCustomOrder] = useState(false);
  const [showBreadcrumbsReplay, setShowBreadcrumbsReplay] = useState(false);
  const [replayBreadcrumbs, setReplayBreadcrumbs] = useState<{ id: string; latitude: number; longitude: number; timestamp: string; accuracy: number | null }[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  
  // Nearby customers layer state
  const [nearbyCustomers, setNearbyCustomers] = useState<{ id: string; full_name: string; geo_lat: number; geo_lng: number; horse_count: number; street?: string; city?: string }[]>([]);
  // Collapsible panel state for mobile
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [companyLocation, setCompanyLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(30);
  const [showNearbyRadius, setShowNearbyRadius] = useState(true);
  
  // Handler for breadcrumbs replay changes
  const handleBreadcrumbsChange = (breadcrumbs: typeof replayBreadcrumbs, index: number) => {
    setReplayBreadcrumbs(breadcrumbs);
    setReplayIndex(index);
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Fetch appointments for the selected date
  const { data: appointmentsData = [], isLoading, refetch } = useQuery({
    queryKey: ["tour-appointments", format(selectedDate, "yyyy-MM-dd"), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Fetch appointments with horses and contacts
      const { data: aptData, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          status,
          service_type,
          is_emergency,
          tour_order,
          horses!inner(
            id, 
            name, 
            owner_id,
            latitude,
            longitude
          )
        `)
        .eq("date", dateStr)
        .eq("provider_id", user.id)
        .neq("status", "cancelled")
        .order("tour_order", { ascending: true, nullsFirst: false })
        .order("time", { ascending: true });
      
      if (error || !aptData) return [];

      // Get unique owner IDs
      const ownerIds = [...new Set(
        aptData.map(apt => apt.horses?.owner_id).filter((id): id is string => !!id)
      )];

      // Fetch contacts for these owners
      const { data: contacts } = ownerIds.length > 0 
        ? await supabase
            .from("contacts")
            .select("id, profile_id, full_name, street, zip_code, city")
            .eq("provider_id", user.id)
            .in("profile_id", ownerIds)
        : { data: [] };
      
      // Fetch profiles as fallback
      const { data: profiles } = ownerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, readable_id")
            .in("id", ownerIds)
        : { data: [] };

      const contactMap = Object.fromEntries(
        (contacts || []).map(c => [c.profile_id, c])
      );
      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.id, p])
      );

      // Group horses by appointment
      const groupedByApt: Record<string, TourAppointment> = {};
      
      aptData.forEach(apt => {
        const horse = apt.horses;
        const contact = horse?.owner_id ? contactMap[horse.owner_id] : null;
        const profile = horse?.owner_id ? profileMap[horse.owner_id] : null;
        
        if (!groupedByApt[apt.id]) {
          groupedByApt[apt.id] = {
            id: apt.id,
            date: apt.date,
            time: apt.time,
            status: apt.status,
            service_type: apt.service_type,
            is_emergency: apt.is_emergency,
            horses: [],
            horse_count: 0,
            client: horse?.owner_id ? {
              id: horse.owner_id,
              readable_id: profile?.readable_id || undefined,
              full_name: contact?.full_name || profile?.full_name || "Unbekannt",
              geo_lat: horse.latitude || null,
              geo_lng: horse.longitude || null,
              street: contact?.street || null,
              zip: contact?.zip_code || null,
              city: contact?.city || null,
            } : null,
          };
        }
        
        if (horse) {
          groupedByApt[apt.id].horses?.push({
            id: horse.id,
            name: horse.name,
            owner_id: horse.owner_id,
          });
          groupedByApt[apt.id].horse_count = (groupedByApt[apt.id].horse_count || 0) + 1;
        }
      });
      
      return Object.values(groupedByApt);
    },
    enabled: !!user?.id,
  });

  // Initialize ordered appointments when data changes
  useEffect(() => {
    setOrderedAppointments(appointmentsData);
    setHasCustomOrder(false);
  }, [appointmentsData]);

  // Calculate route positions
  const routePositions = useMemo(() => {
    const positions: [number, number][] = [];
    
    if (userLocation) {
      positions.push(userLocation);
    }
    
    orderedAppointments.forEach(apt => {
      if (apt.client?.geo_lat && apt.client?.geo_lng) {
        positions.push([apt.client.geo_lat, apt.client.geo_lng]);
      }
    });
    
    return positions;
  }, [orderedAppointments, userLocation]);

  // Calculate route using OSRM
  useEffect(() => {
    const calculateRoute = async () => {
      if (routePositions.length < 2) {
        setRouteInfo(null);
        return;
      }

      setIsCalculatingRoute(true);
      
      try {
        const coords = routePositions.map(p => `${p[1]},${p[0]}`).join(";");
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.routes?.[0]) {
            setRouteInfo({
              distance: Math.round(data.routes[0].distance / 100) / 10,
              duration: Math.round(data.routes[0].duration / 60),
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

  // Optimize route (nearest neighbor)
  const handleOptimizeRoute = useCallback(() => {
    if (!userLocation || orderedAppointments.length < 2) return;
    
    const appointmentsWithCoords = orderedAppointments.filter(
      a => a.client?.geo_lat && a.client?.geo_lng
    );
    
    if (appointmentsWithCoords.length < 2) return;
    
    // Nearest neighbor algorithm
    const optimized: TourAppointment[] = [];
    const remaining = [...appointmentsWithCoords];
    let currentPos = userLocation;
    
    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      
      remaining.forEach((apt, idx) => {
        const dist = calculateDistance(
          currentPos[0], currentPos[1],
          apt.client!.geo_lat!, apt.client!.geo_lng!
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });
      
      const nearest = remaining.splice(nearestIdx, 1)[0];
      optimized.push(nearest);
      currentPos = [nearest.client!.geo_lat!, nearest.client!.geo_lng!];
    }
    
    // Add back appointments without coords at the end
    const withoutCoords = orderedAppointments.filter(
      a => !a.client?.geo_lat || !a.client?.geo_lng
    );
    
    setOrderedAppointments([...optimized, ...withoutCoords]);
    setHasCustomOrder(true);
  }, [userLocation, orderedAppointments]);

  // Reset to time-based order
  const handleResetOrder = useCallback(() => {
    const sorted = [...orderedAppointments].sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
    setOrderedAppointments(sorted);
    setHasCustomOrder(false);
  }, [orderedAppointments]);

  // Navigate date
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Open chat with client
  const handleOpenChat = (clientId: string) => {
    navigate(`/chat?startWith=${clientId}`);
  };

  const defaultCenter: [number, number] = [51.1657, 10.4515]; // Germany center
  
  const appointmentsWithCoords = orderedAppointments.filter(
    a => a.client?.geo_lat && a.client?.geo_lng
  );
  const appointmentsWithoutCoords = orderedAppointments.filter(
    a => !a.client?.geo_lat || !a.client?.geo_lng
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Full-screen Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={7}
          className="h-full w-full z-0"
          scrollWheelZoom={true}
          zoomControl={false}
        >
          {/* Fallback: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
          />
          
          {routePositions.length > 0 && (
            <MapBoundsHandler 
              positions={routePositions.filter((_, i) => i > 0) as [number, number][]} 
              userLocation={userLocation}
            />
          )}
          
          <UserLocationTracker 
            onLocationFound={(lat, lng) => setUserLocation([lat, lng])} 
          />
          
          {/* Route polyline */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "hsl(25, 95%, 53%)",
                weight: 4,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}
          
          {/* Appointment markers */}
          {appointmentsWithCoords.map((apt, index) => {
            const isCompleted = apt.status === "completed";
            return (
              <Marker
                key={apt.id}
                position={[apt.client!.geo_lat!, apt.client!.geo_lng!]}
                icon={createMarkerIcon("hsl(25, 95%, 53%)", index + 1, isCompleted)}
              >
                <Popup>
                  <div className="min-w-[150px] space-y-1">
                    <div className="font-semibold">{apt.client?.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {apt.time || "--:--"} • 🐴 {apt.horse_count} Pferd(e)
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Breadcrumbs Layer for Replay */}
          {showBreadcrumbsReplay && replayBreadcrumbs.length > 0 && (
            <BreadcrumbsLayer 
              breadcrumbs={replayBreadcrumbs} 
              currentIndex={replayIndex} 
            />
          )}
          
          {/* Nearby Customers Layer */}
          <NearbyCustomersMarkers
            customers={nearbyCustomers}
            companyLocation={companyLocation}
            radiusKm={nearbyRadiusKm}
            showRadius={showNearbyRadius}
          />
        </MapContainer>

        {/* Tour Controls Overlay */}
        {user && (
          <TourControls
            tourDate={selectedDate}
            userId={user.id}
            appointments={orderedAppointments}
            userLocation={userLocation}
            routeInfo={routeInfo}
            isCalculatingRoute={isCalculatingRoute}
            onOptimizeRoute={handleOptimizeRoute}
            onResetOrder={handleResetOrder}
            hasCustomOrder={hasCustomOrder}
          />
        )}
        
        {/* Back Button - Top Left safe zone */}
        {user && (
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
              onClick={() => navigate("/dashboard")}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        )}
        
        {/* Emergency & PDF Export - Top Right safe zone (moved away from back button) */}
        {user && (
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
            <TourPdfExport
              tourDate={selectedDate}
              userId={user.id}
              appointments={orderedAppointments}
              routeInfo={routeInfo}
            />
            <EmergencyModeButton
              tourDate={selectedDate}
              appointmentIds={orderedAppointments
                .filter(a => a.status !== "completed")
                .map(a => a.id)
              }
              onEmergencyStart={() => refetch()}
              onEmergencyEnd={() => refetch()}
            />
          </div>
        )}
        
        {/* Nearby Customers Panel */}
        {user && (
          <NearbyCustomersPanel
            userId={user.id}
            userLocation={userLocation}
            excludeAppointmentClientIds={orderedAppointments.map(a => a.client?.id).filter((id): id is string => !!id)}
            onCustomersChange={setNearbyCustomers}
            onCompanyLocationChange={setCompanyLocation}
            onRadiusChange={setNearbyRadiusKm}
            onShowRadiusChange={setShowNearbyRadius}
          />
        )}
        
        {/* Stable Group Panel */}
        {user && (
          <StableGroupPanel
            tourDate={selectedDate}
            userId={user.id}
            appointments={orderedAppointments}
            onRefetch={() => refetch()}
          />
        )}

        {/* Date Navigation */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full shadow-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 gap-2">
                <CalendarDays className="h-4 w-4" />
                {format(selectedDate, "EEE, dd. MMM", { locale: de })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={de}
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* History Button */}
          <Button 
            variant={showBreadcrumbsReplay ? "secondary" : "ghost"} 
            size="icon" 
            className="h-8 w-8 ml-1" 
            onClick={() => setShowBreadcrumbsReplay(!showBreadcrumbsReplay)}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>

        {/* Dismissible Warning for appointments without coordinates */}
        <DismissibleWarning count={appointmentsWithoutCoords.length} />
      </div>

      {/* Tour Cards Panel (Bottom on mobile, Left sidebar on desktop) - COLLAPSIBLE */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: isPanelCollapsed ? 'calc(100% - 48px)' : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          "absolute z-[1000]",
          // Mobile: bottom panel
          "bottom-0 left-0 right-0",
          isPanelCollapsed ? "max-h-12" : "max-h-[45vh]",
          // Desktop: left sidebar
          "lg:top-24 lg:bottom-4 lg:left-4 lg:right-auto lg:w-96 lg:max-h-none",
          isPanelCollapsed && "lg:max-h-12 lg:top-auto lg:bottom-4"
        )}
      >
        <div className={cn(
          "bg-background/80 backdrop-blur-xl rounded-t-2xl lg:rounded-2xl shadow-2xl border-t lg:border",
          "flex flex-col h-full"
        )}>
          {/* Collapsible Header with toggle */}
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="w-full px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isPanelCollapsed ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <h2 className="font-semibold text-sm">
                {orderedAppointments.length} Termine
              </h2>
            </div>
            {!isPanelCollapsed && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </button>

          {/* Sortable Cards - Hidden when collapsed */}
          {!isPanelCollapsed && (
            <ScrollArea className="flex-1 px-3 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : orderedAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Keine Termine für diesen Tag
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedAppointments.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 pb-4">
                      <AnimatePresence>
                        {orderedAppointments.map((apt, index) => (
                          <TourCard
                            key={apt.id}
                            appointment={apt}
                            index={index}
                            userId={user?.id || ""}
                            onOpenChat={handleOpenChat}
                            onStatusChange={() => refetch()}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </ScrollArea>
          )}
        </div>
      </motion.div>

      {/* Breadcrumbs Replay Panel */}
      {user && (
        <BreadcrumbsReplay
          tourDate={selectedDate}
          userId={user.id}
          isOpen={showBreadcrumbsReplay}
          onClose={() => setShowBreadcrumbsReplay(false)}
          onBreadcrumbsChange={handleBreadcrumbsChange}
        />
      )}

      {/* Quick Add FAB */}
      <QuickAddAppointmentFAB
        tourDate={selectedDate}
        currentAppointmentCount={orderedAppointments.length}
        onAppointmentAdded={() => refetch()}
      />
    </div>
  );
}

// Haversine distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
