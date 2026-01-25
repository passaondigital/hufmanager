import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface CustomerLocationMapProps {
  latitude: number;
  longitude: number;
  customerName?: string;
  className?: string;
}

export function CustomerLocationMap({ 
  latitude, 
  longitude, 
  customerName,
  className = "h-36"
}: CustomerLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add marker
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(customerName || "Kundenstandort");

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, customerName]);

  // Update map center when coords change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 14);
    }
  }, [latitude, longitude]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div 
          ref={mapRef} 
          className={`w-full rounded-lg ${className}`}
          style={{ minHeight: "144px" }}
        />
      </CardContent>
    </Card>
  );
}

export function CustomerLocationPlaceholder({ className = "h-36" }: { className?: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className={`p-0 ${className} flex items-center justify-center bg-muted/50`}>
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Kein Standort verfügbar</p>
        </div>
      </CardContent>
    </Card>
  );
}
