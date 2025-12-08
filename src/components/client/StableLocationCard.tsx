import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, AlertTriangle, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StableLocationCardProps {
  userId: string;
  stableStreet: string | null;
  stableZip: string | null;
  stableCity: string | null;
  stableLatitude: number | null;
  stableLongitude: number | null;
  onUpdate: () => void;
}

export function StableLocationCard({
  userId,
  stableStreet,
  stableZip,
  stableCity,
  stableLatitude,
  stableLongitude,
  onUpdate,
}: StableLocationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [formData, setFormData] = useState({
    stable_street: stableStreet || "",
    stable_zip: stableZip || "",
    stable_city: stableCity || "",
    stable_latitude: stableLatitude,
    stable_longitude: stableLongitude,
  });

  const hasAddress = stableStreet || (stableLatitude && stableLongitude);
  const hasGps = stableLatitude && stableLongitude;

  const captureGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS wird von deinem Browser nicht unterstützt");
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          stable_latitude: position.coords.latitude,
          stable_longitude: position.coords.longitude,
        }));
        setIsCapturingGps(false);
        toast.success("GPS-Standort erfasst!");
      },
      (error) => {
        setIsCapturingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("GPS-Zugriff verweigert. Bitte erlaube den Standortzugriff.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Standort nicht verfügbar. Bitte versuche es draußen.");
            break;
          case error.TIMEOUT:
            toast.error("Zeitüberschreitung beim GPS-Abruf.");
            break;
          default:
            toast.error("GPS-Fehler aufgetreten.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        stable_street: formData.stable_street || null,
        stable_zip: formData.stable_zip || null,
        stable_city: formData.stable_city || null,
        stable_latitude: formData.stable_latitude,
        stable_longitude: formData.stable_longitude,
      })
      .eq("id", userId);

    setIsSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Stall-Standort gespeichert!");
      setIsEditing(false);
      onUpdate();
    }
  };

  const openNavigation = () => {
    if (stableLatitude && stableLongitude) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const url = isIOS
        ? `maps://maps.apple.com/?daddr=${stableLatitude},${stableLongitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${stableLatitude},${stableLongitude}`;
      window.open(url, "_blank");
    }
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Stall-Standort
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasAddress && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Kein Standort hinterlegt!</p>
                <p className="text-muted-foreground">
                  Der Hufbearbeiter findet dich sonst nicht!
                </p>
              </div>
            </div>
          )}

          {hasAddress && (
            <div className="space-y-2">
              {stableStreet && (
                <p className="text-sm">
                  {stableStreet}
                  <br />
                  {stableZip} {stableCity}
                </p>
              )}
              {hasGps && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  GPS-Koordinaten hinterlegt
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex-1"
            >
              {hasAddress ? "Bearbeiten" : "Standort hinzufügen"}
            </Button>
            {hasGps && (
              <Button
                variant="outline"
                size="sm"
                onClick={openNavigation}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Stall-Standort bearbeiten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="stable_street">Straße & Hausnummer</Label>
            <Input
              id="stable_street"
              value={formData.stable_street}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, stable_street: e.target.value }))
              }
              placeholder="Musterweg 5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="stable_zip">PLZ</Label>
              <Input
                id="stable_zip"
                value={formData.stable_zip}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stable_zip: e.target.value }))
                }
                placeholder="12345"
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="stable_city">Ort</Label>
              <Input
                id="stable_city"
                value={formData.stable_city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stable_city: e.target.value }))
                }
                placeholder="Musterstadt"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={captureGpsLocation}
            disabled={isCapturingGps}
          >
            {isCapturingGps ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                GPS wird erfasst...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                {formData.stable_latitude
                  ? "GPS-Standort aktualisieren"
                  : "Aktuellen Stall-Standort speichern"}
              </>
            )}
          </Button>
          {formData.stable_latitude && formData.stable_longitude && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              📍 {formData.stable_latitude.toFixed(6)}, {formData.stable_longitude.toFixed(6)}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsEditing(false)}
          >
            Abbrechen
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Speichern"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
