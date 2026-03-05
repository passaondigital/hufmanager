import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  MapPin, Plus, Trash2, Navigation, Star, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface ClientLocation {
  id: string;
  name: string;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  notes: string | null;
}

export function ClientLocationsManager() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    zip_code: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
    notes: "",
  });

  const fetchLocations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("client_locations")
      .select("id, name, address, zip_code, city, lat, lng, is_default, notes")
      .eq("client_id", user.id)
      .order("is_default", { ascending: false })
      .order("name");
    setLocations((data as ClientLocation[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLocations();
  }, [user]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS wird nicht unterstützt");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        toast.success("GPS-Standort erfasst!");
      },
      () => toast.error("GPS-Zugriff verweigert"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);

    const isFirst = locations.length === 0;
    const { error } = await supabase.from("client_locations").insert({
      client_id: user.id,
      name: form.name.trim(),
      address: form.address || null,
      zip_code: form.zip_code || null,
      city: form.city || null,
      lat: form.lat,
      lng: form.lng,
      is_default: isFirst,
      notes: form.notes || null,
    });

    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Standort hinzugefügt!");
      setShowAddDialog(false);
      setForm({ name: "", address: "", zip_code: "", city: "", lat: null, lng: null, notes: "" });
      fetchLocations();
    }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    // Unset all defaults
    await supabase
      .from("client_locations")
      .update({ is_default: false })
      .eq("client_id", user.id);
    // Set new default
    await supabase
      .from("client_locations")
      .update({ is_default: true })
      .eq("id", id);
    fetchLocations();
    toast.success("Hauptstandort aktualisiert");
  };

  const deleteLocation = async (id: string) => {
    await supabase.from("client_locations").delete().eq("id", id);
    fetchLocations();
    toast.success("Standort gelöscht");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-32" />
            <div className="h-16 bg-muted rounded" />
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
          Meine Standorte
          <HelpTip id="client.standorte" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Standorte hinterlegt. Füge deinen Stall hinzu!
          </p>
        )}

        {locations.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
          >
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{loc.name}</span>
                {loc.is_default && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Standard
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {[loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ") ||
                  "Keine Adresse"}
              </p>
              {loc.lat && loc.lng && (
                <div className="flex items-center gap-1 text-[10px] text-green-600 mt-0.5">
                  <Check className="h-3 w-3" />
                  GPS hinterlegt
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {!loc.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDefault(loc.id)}
                  title="Als Standard setzen"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteLocation(loc.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Standort hinzufügen
        </Button>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Standort hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  placeholder="z.B. Stall Müller"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Straße</Label>
                <Input
                  placeholder="Musterweg 5"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>PLZ</Label>
                  <Input
                    placeholder="12345"
                    value={form.zip_code}
                    onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label>Ort</Label>
                  <Input
                    placeholder="Musterstadt"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Notizen</Label>
                <Input
                  placeholder="z.B. Hintereingang nutzen"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <Button variant="outline" className="w-full" onClick={captureGps}>
                <Navigation className="h-4 w-4 mr-2" />
                {form.lat ? "GPS aktualisieren" : "GPS-Standort erfassen"}
              </Button>
              {form.lat && form.lng && (
                <p className="text-xs text-center text-muted-foreground">
                  📍 {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAdd} disabled={saving || !form.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
