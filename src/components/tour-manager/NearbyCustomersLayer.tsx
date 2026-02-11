import { useState, useEffect } from "react";
import { Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { MapPin, Users, Eye, EyeOff, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface NearbyCustomer {
  id: string;
  full_name: string;
  street?: string;
  city?: string;
  geo_lat: number;
  geo_lng: number;
  horse_count: number;
}

interface CompanyLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface NearbyCustomersLayerProps {
  userId: string;
  userLocation: [number, number] | null;
  excludeAppointmentClientIds?: string[];
}

// White marker for nearby customers
const nearbyCustomerIcon = L.divIcon({
  className: "nearby-customer-marker",
  html: `
    <div style="
      background: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid hsl(var(--muted-foreground));
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Company location marker
const companyIcon = L.divIcon({
  className: "company-marker",
  html: `
    <div style="
      background: hsl(var(--primary));
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Markers component (for map)
export function NearbyCustomersMarkers({
  customers,
  companyLocation,
  radiusKm,
  showRadius,
}: {
  customers: NearbyCustomer[];
  companyLocation: CompanyLocation | null;
  radiusKm: number;
  showRadius: boolean;
}) {
  return (
    <>
      {/* Company location marker and radius */}
      {companyLocation && (
        <>
          <Marker 
            position={[companyLocation.lat, companyLocation.lng]} 
            icon={companyIcon}
          >
            <Popup>
              <div className="min-w-[120px]">
                <div className="font-semibold flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Firmenstandort
                </div>
                {companyLocation.address && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {companyLocation.address}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
          
          {showRadius && (
            <Circle
              center={[companyLocation.lat, companyLocation.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "hsl(var(--primary))",
                fillColor: "hsl(var(--primary))",
                fillOpacity: 0.08,
                weight: 2,
                dashArray: "8, 8",
              }}
            />
          )}
        </>
      )}

      {/* Nearby customer markers */}
      {customers.map((customer) => (
        <Marker
          key={customer.id}
          position={[customer.geo_lat, customer.geo_lng]}
          icon={nearbyCustomerIcon}
        >
          <Popup>
            <div className="min-w-[140px] space-y-1">
              <div className="font-semibold">{customer.full_name}</div>
              <div className="text-xs text-muted-foreground">
                🐴 {customer.horse_count} Pferd{customer.horse_count !== 1 ? "e" : ""}
              </div>
              {customer.city && (
                <div className="text-xs text-muted-foreground">
                  {[customer.street, customer.city].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// Control panel component
export function NearbyCustomersPanel({
  userId,
  userLocation,
  excludeAppointmentClientIds = [],
  onCustomersChange,
  onCompanyLocationChange,
  onRadiusChange,
  onShowRadiusChange,
}: NearbyCustomersLayerProps & {
  onCustomersChange: (customers: NearbyCustomer[]) => void;
  onCompanyLocationChange: (location: CompanyLocation | null) => void;
  onRadiusChange: (radius: number) => void;
  onShowRadiusChange: (show: boolean) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [radiusKm, setRadiusKm] = useState(30);
  const [showRadius, setShowRadius] = useState(true);

  // Fetch company location from profiles (stable_latitude/stable_longitude) or business_settings address
  const { data: companyLocation, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["company-location", userId],
    queryFn: async () => {
      // First try profiles for stable location
      const { data: profile } = await supabase
        .from("profiles")
        .select("stable_latitude, stable_longitude, stable_street, stable_city")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.stable_latitude && profile?.stable_longitude) {
        return {
          lat: profile.stable_latitude,
          lng: profile.stable_longitude,
          address: [profile.stable_street, profile.stable_city].filter(Boolean).join(", ") || undefined,
        } as CompanyLocation;
      }

      // Fallback to business_settings address (no coords but shows we have a location)
      const { data: bs } = await supabase
        .from("business_settings")
        .select("address")
        .eq("user_id", userId)
        .maybeSingle();

      // If there's an address but no coords, we can't show it on the map
      return null;
    },
    enabled: !!userId,
  });

  // Fetch nearby customers based on horses with coordinates
  const { data: nearbyCustomers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["nearby-customers", userId, userLocation, radiusKm, isVisible],
    queryFn: async () => {
      if (!userLocation) return [];

      // Fetch horses with coordinates and their owners
      const { data: horses, error } = await supabase
        .from("horses")
        .select(`
          id,
          name,
          owner_id,
          latitude,
          longitude,
          location_name
        `)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .is("deleted_at", null);

      if (error || !horses) return [];

      // Get unique owners from horses that have access grants with this provider
      const { data: accessGrants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", userId)
        .eq("is_active", true);

      const clientIds = new Set((accessGrants || []).map(ag => ag.client_id));
      
      // Filter horses to only those belonging to provider's clients
      const clientHorses = horses.filter(h => h.owner_id && clientIds.has(h.owner_id));

      // Group by owner and calculate nearest horse location
      const ownerMap = new Map<string, { 
        horses: typeof horses;
        nearestLat: number;
        nearestLng: number;
        minDistance: number;
      }>();

      for (const horse of clientHorses) {
        if (!horse.latitude || !horse.longitude || !horse.owner_id) continue;
        if (excludeAppointmentClientIds.includes(horse.owner_id)) continue;

        const distance = haversineDistance(
          userLocation[0],
          userLocation[1],
          horse.latitude,
          horse.longitude
        );

        if (distance <= radiusKm) {
          const existing = ownerMap.get(horse.owner_id);
          if (!existing || distance < existing.minDistance) {
            ownerMap.set(horse.owner_id, {
              horses: existing ? [...existing.horses, horse] : [horse],
              nearestLat: horse.latitude,
              nearestLng: horse.longitude,
              minDistance: distance,
            });
          } else {
            existing.horses.push(horse);
          }
        }
      }

      // Fetch profile names for these owners
      const ownerIds = Array.from(ownerMap.keys());
      if (ownerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Also fetch contacts for additional info
      const { data: contacts } = await supabase
        .from("contacts")
        .select("profile_id, full_name, street, city")
        .eq("provider_id", userId)
        .in("profile_id", ownerIds);

      const contactMap = new Map((contacts || []).map(c => [c.profile_id, c]));

      // Build result
      const result: NearbyCustomer[] = [];
      for (const [ownerId, data] of ownerMap.entries()) {
        const profile = profileMap.get(ownerId);
        const contact = contactMap.get(ownerId);
        
        result.push({
          id: ownerId,
          full_name: contact?.full_name || profile?.full_name || "Unbekannt",
          street: contact?.street || undefined,
          city: contact?.city || undefined,
          geo_lat: data.nearestLat,
          geo_lng: data.nearestLng,
          horse_count: data.horses.length,
        });
      }

      return result;
    },
    enabled: isVisible && !!userId && !!userLocation,
  });

  // Notify parent of changes
  useEffect(() => {
    if (isVisible) {
      onCustomersChange(nearbyCustomers);
      onCompanyLocationChange(companyLocation || null);
      onRadiusChange(radiusKm);
      onShowRadiusChange(showRadius);
    } else {
      onCustomersChange([]);
    }
  }, [isVisible, nearbyCustomers, companyLocation, radiusKm, showRadius, onCustomersChange, onCompanyLocationChange, onRadiusChange, onShowRadiusChange]);

  const isLoading = isLoadingCompany || isLoadingCustomers;

  return (
    <div className="absolute top-16 right-4 z-[300]">
      {/* Toggle Button */}
      <Button
        variant={isVisible ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "h-10 gap-2 bg-background/90 backdrop-blur-sm shadow-lg",
          isVisible && "ring-2 ring-primary"
        )}
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Users className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Kunden</span>
        {isVisible && nearbyCustomers.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {nearbyCustomers.length}
          </Badge>
        )}
      </Button>

      {/* Settings Panel */}
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-12 right-0 w-64 bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Kunden in der Nähe</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Radius</Label>
              <span className="text-muted-foreground">{radiusKm} km</span>
            </div>
            <Slider
              value={[radiusKm]}
              min={5}
              max={100}
              step={5}
              onValueChange={(value) => setRadiusKm(value[0])}
            />
          </div>

          {/* Show Radius Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-radius" className="text-sm">
              Radius anzeigen
            </Label>
            <Switch
              id="show-radius"
              checked={showRadius}
              onCheckedChange={setShowRadius}
            />
          </div>

          {/* Stats */}
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Gefunden:</span>
              <span className="font-medium">{nearbyCustomers.length} Kunden</span>
            </div>
            {companyLocation && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>Firmenstandort aktiv</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Use shared utility
import { haversineDistance } from "@/lib/geo";
