import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Eye, MapPin, Save, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PARTNER_TYPE_OPTIONS } from "@/lib/partnerTypes";
import { cn } from "@/lib/utils";

export function ProviderDiscoverySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["provider-discovery-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_discoverable, bio, city, zip_code, service_radius_km, service_types, specializations")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setIsDiscoverable(profile.is_discoverable || false);
      setBio(profile.bio || "");
      setCity(profile.city || "");
      setZipCode(profile.zip_code || "");
      setRadiusKm(profile.service_radius_km || 50);
      setSelectedTypes(profile.service_types || []);
      setSpecializations((profile.specializations || []).join(", "));
    }
  }, [profile]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_discoverable: isDiscoverable,
          bio,
          city,
          zip_code: zipCode,
          service_radius_km: radiusKm,
          service_types: selectedTypes,
          specializations: specializations.split(",").map(s => s.trim()).filter(Boolean),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Einstellungen gespeichert");
      queryClient.invalidateQueries({ queryKey: ["provider-discovery-profile", user.id] });
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Sichtbarkeit in der Dienstleister-Suche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium">In der Suche sichtbar</p>
            <p className="text-xs text-muted-foreground">
              Wenn aktiv, können Pferdebesitzer dich in der Suche finden und für ihre Pferde einladen.
            </p>
          </div>
          <Switch checked={isDiscoverable} onCheckedChange={setIsDiscoverable} />
        </div>

        {isDiscoverable && (
          <>
            <div>
              <Label>Fachrichtungen</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {PARTNER_TYPE_OPTIONS.map((opt) => {
                  const active = selectedTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleType(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        active
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "text-muted-foreground border-border hover:bg-secondary"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stadt</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Düsseldorf" />
              </div>
              <div>
                <Label>PLZ</Label>
                <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="40211" />
              </div>
            </div>
            <div>
              <Label>Umkreis (km)</Label>
              <Input type="number" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} min={5} max={200} />
            </div>
            <div>
              <Label>Spezialisierungen (kommagetrennt)</Label>
              <Input value={specializations} onChange={(e) => setSpecializations(e.target.value)} placeholder="Sportpferde, ISG, Reha..." />
            </div>
            <div>
              <Label>Kurzvorstellung</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Erfahrener Osteopath mit Schwerpunkt..." rows={3} />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Speichern
        </Button>
      </CardContent>
    </Card>
  );
}
