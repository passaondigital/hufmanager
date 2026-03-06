import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/ui/HelpTip";
import { ClientBottomNav } from "@/components/client/ClientBottomNav";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin, Plus, Trash2, Star, Loader2, Check, Navigation, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { geocodeAddress } from "@/lib/geocode";

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

const emptyForm = { name: "", address: "", zip_code: "", city: "", notes: "", lat: null as number | null, lng: null as number | null };

export default function ClientLocations() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

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

  useEffect(() => { fetchLocations(); }, [user]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowDialog(true);
  };

  const openEdit = (loc: ClientLocation) => {
    setEditId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address || "",
      zip_code: loc.zip_code || "",
      city: loc.city || "",
      notes: loc.notes || "",
      lat: loc.lat,
      lng: loc.lng,
    });
    setShowDialog(true);
  };

  const handleGeocode = async () => {
    if (!form.address && !form.zip_code && !form.city) {
      toast.error("Bitte Adresse eingeben");
      return;
    }
    setGeocoding(true);
    const result = await geocodeAddress(form.address, form.zip_code, form.city);
    setGeocoding(false);
    if (result) {
      setForm((f) => ({ ...f, lat: result.lat, lng: result.lng }));
      toast.success("Standort gefunden!");
    } else {
      toast.error("Adresse nicht gefunden");
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS wird nicht unterstützt");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success("GPS-Standort erfasst!");
      },
      () => toast.error("GPS-Zugriff verweigert"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);

    const payload = {
      client_id: user.id,
      name: form.name.trim(),
      address: form.address || null,
      zip_code: form.zip_code || null,
      city: form.city || null,
      lat: form.lat,
      lng: form.lng,
      notes: form.notes || null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("client_locations").update(payload).eq("id", editId));
    } else {
      const isFirst = locations.length === 0;
      ({ error } = await supabase.from("client_locations").insert({ ...payload, is_default: isFirst }));
    }

    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success(editId ? "Standort aktualisiert!" : "Standort hinzugefügt!");
      setShowDialog(false);
      fetchLocations();
    }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("client_locations").update({ is_default: false }).eq("client_id", user.id);
    await supabase.from("client_locations").update({ is_default: true }).eq("id", id);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Meine Ställe</h1>
          <HelpTip id="client.locations" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {locations.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Noch keine Ställe hinterlegt.</p>
            <p className="text-xs text-muted-foreground mt-1">Füge deinen Stall hinzu!</p>
          </div>
        )}

        {locations.map((loc) => (
          <Card key={loc.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Map preview placeholder */}
                <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                  {loc.lat && loc.lng ? (
                    <img
                      src={`https://staticmap.openstreetmap.de/staticmap.php?center=${loc.lat},${loc.lng}&zoom=14&size=112x112&maptype=mapnik&markers=${loc.lat},${loc.lng},ol-marker`}
                      alt="Karte"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <MapPin className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{loc.name}</span>
                    {loc.is_default && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> Standard
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[loc.address, loc.zip_code, loc.city].filter(Boolean).join(", ") || "Keine Adresse"}
                  </p>
                  {loc.lat && loc.lng && (
                    <div className="flex items-center gap-1 text-[10px] text-green-600 mt-0.5">
                      <Check className="h-3 w-3" /> GPS hinterlegt
                    </div>
                  )}
                  {loc.notes && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">📝 {loc.notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!loc.is_default && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(loc.id)} title="Als Standard">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLocation(loc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full h-12" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Stall hinzufügen
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Stall bearbeiten" : "Neuen Stall hinzufügen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input placeholder="z.B. Stall Müller" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Straße</Label>
              <Input placeholder="Musterweg 5" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PLZ</Label>
                <Input placeholder="12345" value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} maxLength={5} />
              </div>
              <div>
                <Label>Ort</Label>
                <Input placeholder="Musterstadt" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notizen</Label>
              <Input placeholder="z.B. Hintereingang nutzen" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={handleGeocode} disabled={geocoding}>
                {geocoding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                Adresse → GPS
              </Button>
              <Button variant="outline" className="w-full" onClick={captureGps}>
                <Navigation className="h-4 w-4 mr-2" />
                GPS erfassen
              </Button>
            </div>

            {form.lat && form.lng && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">📍 {form.lat.toFixed(6)}, {form.lng.toFixed(6)}</p>
                <img
                  src={`https://staticmap.openstreetmap.de/staticmap.php?center=${form.lat},${form.lng}&zoom=15&size=400x150&maptype=mapnik&markers=${form.lat},${form.lng},ol-marker`}
                  alt="Vorschau"
                  className="w-full h-24 object-cover rounded-lg mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientBottomNav />
    </div>
  );
}
