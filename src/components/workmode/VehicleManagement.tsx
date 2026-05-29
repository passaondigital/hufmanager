import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Fuel, Calendar, Shield, Edit2, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { HelpTip } from "@/components/ui/HelpTip";

interface Vehicle {
  id: string;
  license_plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  current_odometer: number | null;
  fuel_type: string | null;
  average_consumption: number | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  tax_yearly: number | null;
  price_per_km: number | null;
  travel_cost_flat: number | null;
  is_primary: boolean | null;
}

const FUEL_TYPES = [
  { value: "benzin", label: "Benzin" },
  { value: "diesel", label: "Diesel" },
  { value: "elektro", label: "Elektro" },
  { value: "hybrid", label: "Hybrid" },
  { value: "lpg", label: "LPG/Autogas" },
];

export function VehicleManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    license_plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    fuel_type: "diesel",
    current_odometer: 0,
    price_per_km: 0.30,
    travel_cost_flat: 0,
    is_primary: true,
  });

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["provider-vehicle", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_vehicles")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return data as Vehicle | null;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      if (vehicle?.id) {
        const { error } = await supabase
          .from("provider_vehicles")
          .update(data)
          .eq("id", vehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("provider_vehicles")
          .insert({ ...data, provider_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-vehicle"] });
      toast({ title: "Gespeichert", description: "Fahrzeugdaten wurden aktualisiert." });
      setEditMode(false);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const startEdit = () => {
    if (vehicle) {
      setFormData(vehicle);
    }
    setEditMode(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!vehicle && !editMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Betriebsfahrzeug
          </CardTitle>
          <CardDescription>
            Erfasse dein Fahrzeug für km-Tracking und Kostenabrechnung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Car className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">Noch kein Fahrzeug hinterlegt</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Fahrzeug hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Fahrzeug erfassen</DialogTitle>
                </DialogHeader>
                <VehicleForm 
                  formData={formData} 
                  setFormData={setFormData} 
                  onSubmit={handleSubmit}
                  isLoading={saveMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Fahrzeug bearbeiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleSubmit}
            isLoading={saveMutation.isPending}
            onCancel={() => setEditMode(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Mein Fahrzeug
          </CardTitle>
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vehicle Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-muted-foreground text-sm">
              {vehicle.license_plate} • {vehicle.year}
            </p>
          </div>
          {vehicle.is_primary && (
            <Badge variant="secondary" className="ml-auto">Hauptfahrzeug</Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Fuel className="h-3 w-3" />
              Kraftstoff
            </div>
            <p className="font-medium capitalize">{vehicle.fuel_type || "-"}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Tachostand</div>
            <p className="font-medium">
              {vehicle.current_odometer?.toLocaleString("de-DE")} km
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">€ pro km</div>
            <p className="font-medium">
              {Number(vehicle.price_per_km || 0).toFixed(2)} €
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Anfahrt-Pauschale</div>
            <p className="font-medium">
              {Number(vehicle.travel_cost_flat || 0).toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Insurance Info */}
        {vehicle.insurance_company && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Shield className="h-4 w-4 text-green-500" />
              Versicherung
            </div>
            <p className="text-sm">{vehicle.insurance_company}</p>
            {vehicle.insurance_expiry && (
              <p className="text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Gültig bis: {format(new Date(vehicle.insurance_expiry), "dd.MM.yyyy")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface VehicleFormProps {
  formData: Partial<Vehicle>;
  setFormData: (data: Partial<Vehicle>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onCancel?: () => void;
}

function VehicleForm({ formData, setFormData, onSubmit, isLoading, onCancel }: VehicleFormProps) {
  const updateField = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kennzeichen</Label>
          <Input
            placeholder="B-HM 1234"
            value={formData.license_plate || ""}
            onChange={(e) => updateField("license_plate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Baujahr</Label>
          <Input
            type="number"
            min={1990}
            max={2030}
            value={formData.year || ""}
            onChange={(e) => updateField("year", parseInt(e.target.value) || null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marke</Label>
          <Input
            placeholder="VW"
            value={formData.brand || ""}
            onChange={(e) => updateField("brand", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Modell</Label>
          <Input
            placeholder="Transporter T6"
            value={formData.model || ""}
            onChange={(e) => updateField("model", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kraftstoff</Label>
          <Select
            value={formData.fuel_type || "diesel"}
            onValueChange={(v) => updateField("fuel_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUEL_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Aktueller Tachostand (km)</Label>
          <Input
            type="number"
            value={formData.current_odometer || ""}
            onChange={(e) => updateField("current_odometer", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Abrechnungseinstellungen</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>€ pro Kilometer</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.price_per_km || 0.30}
              onChange={(e) => updateField("price_per_km", parseFloat(e.target.value) || 0.30)}
            />
          </div>
          <div className="space-y-2">
            <Label>Anfahrt-Pauschale (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.travel_cost_flat || 0}
              onChange={(e) => updateField("travel_cost_flat", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          Anhänger
          <HelpTip id="fahrzeug.anhaenger" />
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="hasTrailer"
              checked={(formData as any).has_trailer || false}
              onCheckedChange={(checked) => setFormData({ ...formData, has_trailer: !!checked } as any)}
            />
            <Label htmlFor="hasTrailer" className="cursor-pointer">
              Ich fahre mit Anhänger
            </Label>
          </div>
          
          {(formData as any).has_trailer && (
            <div className="grid grid-cols-3 gap-3 ml-6">
              <div className="space-y-1">
                <Label className="text-xs">Höhe (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={(formData as any).trailer_height_cm || ""}
                  onChange={(e) => setFormData({ ...formData, trailer_height_cm: parseInt(e.target.value) || null } as any)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gewicht (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={(formData as any).trailer_weight_kg || ""}
                  onChange={(e) => setFormData({ ...formData, trailer_weight_kg: parseInt(e.target.value) || null } as any)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Länge (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1500}
                  value={(formData as any).trailer_length_cm || ""}
                  onChange={(e) => setFormData({ ...formData, trailer_length_cm: parseInt(e.target.value) || null } as any)}
                />
              </div>
              <p className="col-span-3 text-xs text-muted-foreground">
                Mit Anhänger plant Hufi deine Route ohne Unterführungen und Höhenbeschränkungen.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-3">Versicherung (optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Versicherung</Label>
            <Input
              placeholder="ADAC"
              value={formData.insurance_company || ""}
              onChange={(e) => updateField("insurance_company", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ablaufdatum</Label>
            <Input
              type="date"
              value={formData.insurance_expiry || ""}
              onChange={(e) => updateField("insurance_expiry", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </form>
  );
}
