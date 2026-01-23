import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Check, X, Loader2, RefreshCw } from "lucide-react";
import { useGeocode, GeocodeResult } from "@/hooks/useGeocode";
import { cn } from "@/lib/utils";

interface AddressGeocoderProps {
  street: string;
  zipCode: string;
  city: string;
  geoLat?: number | null;
  geoLng?: number | null;
  onStreetChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onGeoChange: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
  showMiniMap?: boolean;
}

export function AddressGeocoder({
  street,
  zipCode,
  city,
  geoLat,
  geoLng,
  onStreetChange,
  onZipCodeChange,
  onCityChange,
  onGeoChange,
  disabled = false,
  showMiniMap = true,
}: AddressGeocoderProps) {
  const { geocode, isLoading, status, result } = useGeocode();
  const [hasAttemptedGeocode, setHasAttemptedGeocode] = useState(false);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState("");

  // Check if we have valid coordinates
  const hasValidCoords = geoLat != null && geoLng != null && !isNaN(geoLat) && !isNaN(geoLng);

  // Build current address string for comparison
  const currentAddress = [street?.trim(), zipCode?.trim(), city?.trim()].filter(Boolean).join(", ");

  // Determine geo status for UI
  const geoStatus: "success" | "error" | "loading" | "idle" = 
    isLoading ? "loading" :
    hasValidCoords ? "success" :
    (hasAttemptedGeocode && !hasValidCoords) ? "error" :
    "idle";

  // Debounced geocoding on blur
  const handleAddressBlur = useCallback(async () => {
    // Only geocode if address has changed since last attempt
    if (currentAddress === lastGeocodedAddress) return;
    if (!city?.trim() && !zipCode?.trim()) return;

    setHasAttemptedGeocode(true);
    setLastGeocodedAddress(currentAddress);

    const result = await geocode(street, zipCode, city);
    if (result) {
      onGeoChange(result.lat, result.lng);
    } else {
      onGeoChange(null, null);
    }
  }, [street, zipCode, city, currentAddress, lastGeocodedAddress, geocode, onGeoChange]);

  // Manual retry button
  const handleRetryGeocode = async () => {
    setHasAttemptedGeocode(true);
    setLastGeocodedAddress(currentAddress);
    
    const result = await geocode(street, zipCode, city);
    if (result) {
      onGeoChange(result.lat, result.lng);
    } else {
      onGeoChange(null, null);
    }
  };

  // Status indicator component
  const StatusIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Suche...</span>
        </div>
      );
    }

    if (geoStatus === "success") {
      return (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10">
            <Check className="h-3 w-3" />
          </div>
          <span className="text-xs">GPS gefunden</span>
        </div>
      );
    }

    if (geoStatus === "error") {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-destructive">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive/10">
              <X className="h-3 w-3" />
            </div>
            <span className="text-xs">Nicht gefunden</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleRetryGeocode}
            disabled={disabled || isLoading}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Erneut
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span className="text-xs">GPS wird bei Speichern ermittelt</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Street */}
      <div className="space-y-2">
        <Label htmlFor="street">Straße & Hausnummer</Label>
        <Input
          id="street"
          placeholder="Musterstraße 123"
          value={street}
          onChange={(e) => onStreetChange(e.target.value)}
          onBlur={handleAddressBlur}
          disabled={disabled}
        />
      </div>

      {/* ZIP & City */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zipCode">PLZ</Label>
          <Input
            id="zipCode"
            placeholder="12345"
            value={zipCode}
            onChange={(e) => onZipCodeChange(e.target.value)}
            onBlur={handleAddressBlur}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ort</Label>
          <Input
            id="city"
            placeholder="Musterstadt"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            onBlur={handleAddressBlur}
            disabled={disabled}
          />
        </div>
      </div>

      {/* GPS Status & Mini Map */}
      <div className={cn(
        "rounded-lg border p-3 space-y-3",
        geoStatus === "success" ? "bg-green-500/5 border-green-500/20" :
        geoStatus === "error" ? "bg-destructive/5 border-destructive/20" :
        "bg-muted/30"
      )}>
        <div className="flex items-center justify-between">
          <StatusIndicator />
          {hasValidCoords && (
            <span className="text-xs text-muted-foreground font-mono">
              {geoLat?.toFixed(5)}, {geoLng?.toFixed(5)}
            </span>
          )}
        </div>

        {/* Mini Map Preview */}
        {showMiniMap && hasValidCoords && (
          <div className="relative rounded-md overflow-hidden border aspect-video max-h-32">
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${geoLat},${geoLng}&zoom=14&size=400x150&markers=${geoLat},${geoLng},red-pushpin`}
              alt="Kartenvorschau"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <MapPin className="h-6 w-6 text-red-600 drop-shadow-lg" />
            </div>
          </div>
        )}

        {geoStatus === "error" && (
          <p className="text-xs text-destructive">
            Bitte überprüfen Sie die Adresse oder geben Sie die Koordinaten manuell ein.
          </p>
        )}
      </div>
    </div>
  );
}
