import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  onChange: (lat: number | null, lng: number | null, name?: string) => void;
  showNavigationButton?: boolean;
  compact?: boolean;
}

export const LocationPicker = ({
  latitude,
  longitude,
  locationName,
  onChange,
  showNavigationButton = false,
  compact = false,
}: LocationPickerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(locationName || "");

  const hasLocation = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Nicht unterstützt",
        description: "GPS-Standort wird von diesem Browser nicht unterstützt.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude, name);
        toast({
          title: "Standort erfasst",
          description: "GPS-Koordinaten wurden gespeichert.",
        });
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        let message = "Standort konnte nicht ermittelt werden.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Bitte erlauben Sie den Zugriff auf Ihren Standort.";
        } else if (error.code === error.TIMEOUT) {
          message = "GPS-Abfrage dauerte zu lange. Bitte erneut versuchen.";
        }
        toast({
          title: "GPS fehlgeschlagen",
          description: `${message} Sie können ohne Standort fortfahren.`,
          variant: "default",
        });
        // Allow saving without GPS - don't block the user
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const openInMaps = () => {
    if (!hasLocation) return;
    
    // Detect iOS for Apple Maps, otherwise use Google Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${latitude},${longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    window.open(url, "_blank");
  };

  const clearLocation = () => {
    onChange(null, null, "");
    setName("");
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {hasLocation ? (
          <>
            <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-2 rounded-lg">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                {locationName || `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`}
              </span>
            </div>
            {showNavigationButton && (
              <Button variant="outline" size="sm" onClick={openInMaps}>
                <Navigation className="h-4 w-4 mr-1" />
                Route
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={getCurrentLocation} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-1" />
            )}
            Standort erfassen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Standortname (optional)</Label>
        <Input
          placeholder="z.B. Koppel am Waldrand"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (hasLocation) {
              onChange(latitude!, longitude!, e.target.value);
            }
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={hasLocation ? "outline" : "default"}
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird ermittelt...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              {hasLocation ? "Standort aktualisieren" : "GPS-Standort erfassen"}
            </>
          )}
        </Button>

        {hasLocation && showNavigationButton && (
          <Button type="button" variant="secondary" onClick={openInMaps} className="gap-2">
            <Navigation className="h-4 w-4" />
            Route starten
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}

        {hasLocation && (
          <Button type="button" variant="ghost" onClick={clearLocation}>
            Entfernen
          </Button>
        )}
      </div>

      {hasLocation && (
        <div className="p-4 bg-accent/10 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-accent mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {name || "Standort gespeichert"}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dieser Standort wird für die Navigation zum Pferd verwendet.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasLocation && (
        <p className="text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 inline mr-1" />
          Erfassen Sie den GPS-Standort der Koppel, damit der Profi direkt dorthin navigieren kann.
        </p>
      )}
    </div>
  );
};
