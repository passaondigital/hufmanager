import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car, Plus, Fuel, Calendar, Shield, Edit2, Save, Loader2, Trash2,
  Wrench, Receipt, TrendingUp, AlertTriangle, Users, BarChart3, DollarSign,
  Droplets, ParkingCircle, FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

// ============= Types =============
interface Vehicle {
  id: string;
  provider_id: string;
  name: string | null;
  license_plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  fuel_type: string | null;
  photo_url: string | null;
  tuev_date: string | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  current_odometer: number | null;
  initial_odometer: number | null;
  average_consumption: number | null;
  price_per_km: number | null;
  travel_cost_flat: number | null;
  tax_yearly: number | null;
  is_primary: boolean | null;
  status: string | null;
  notes: string | null;
  assigned_employee_id: string | null;
  created_at: string;
}

interface VehicleCost {
  id: string;
  vehicle_id: string;
  provider_id: string;
  cost_type: string;
  amount: number;
  description: string | null;
  date: string;
  liters: number | null;
  price_per_liter: number | null;
  mileage_at_cost: number | null;
  is_full_tank: boolean;
  fuel_station: string | null;
  created_at: string;
}

const FUEL_TYPES = [
  { value: "benzin", label: "Benzin" },
  { value: "diesel", label: "Diesel" },
  { value: "elektro", label: "Elektro" },
  { value: "hybrid", label: "Hybrid" },
  { value: "lpg", label: "LPG/Autogas" },
];

const COST_TYPES = [
  { value: "fuel", label: "Tanken", icon: Fuel },
  { value: "repair", label: "Reparatur", icon: Wrench },
  { value: "maintenance", label: "Wartung", icon: Wrench },
  { value: "insurance", label: "Versicherung", icon: Shield },
  { value: "tax", label: "KFZ-Steuer", icon: Receipt },
  { value: "tuev", label: "TÜV/HU", icon: FileText },
  { value: "tire", label: "Reifen", icon: Car },
  { value: "wash", label: "Wäsche", icon: Droplets },
  { value: "parking", label: "Parken", icon: ParkingCircle },
  { value: "toll", label: "Maut", icon: DollarSign },
  { value: "other", label: "Sonstiges", icon: FileText },
];

// ============= Main Page =============
export default function Fuhrpark() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "vehicles";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Car className="h-7 w-7 text-primary" />
          Fuhrpark
        </h1>
        <p className="text-muted-foreground mt-1">
          Fahrzeuge, Kosten & Kilometerstand verwalten
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="vehicles" className="gap-2">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Fahrzeuge</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Tankbuch & Kosten</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Auswertung</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="costs">
          <CostsTab />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Vehicles Tab =============
function VehiclesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    fuel_type: "diesel",
    is_primary: true,
    status: "active",
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["fuhrpark-vehicles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_vehicles")
        .select("*")
        .eq("provider_id", user!.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      if (editingId) {
        const { error } = await supabase
          .from("provider_vehicles")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("provider_vehicles")
          .insert({ ...data, provider_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuhrpark-vehicles"] });
      toast({ title: "Gespeichert!" });
      resetForm();
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuhrpark-vehicles"] });
      toast({ title: "Fahrzeug gelöscht" });
    },
  });

  const resetForm = () => {
    setFormData({ fuel_type: "diesel", is_primary: vehicles.length === 0, status: "active" });
    setEditingId(null);
    setDialogOpen(false);
  };

  const startEdit = (v: Vehicle) => {
    setFormData(v);
    setEditingId(v.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{vehicles.length} Fahrzeug{vehicles.length !== 1 ? "e" : ""}</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Fahrzeug hinzufügen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Fahrzeug bearbeiten" : "Neues Fahrzeug"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Bezeichnung</Label>
                <Input placeholder="z.B. Firmen-Sprinter" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kennzeichen</Label>
                  <Input placeholder="B-HM 1234" value={formData.license_plate || ""} onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Baujahr</Label>
                  <Input type="number" min={1990} max={2030} value={formData.year || ""} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marke</Label>
                  <Input placeholder="VW" value={formData.brand || ""} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Input placeholder="Transporter T6" value={formData.model || ""} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kraftstoff</Label>
                  <Select value={formData.fuel_type || "diesel"} onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tachostand (km)</Label>
                  <Input type="number" value={formData.current_odometer || ""} onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fahrgestellnummer (VIN)</Label>
                <Input placeholder="WF0XXXGCDX..." value={formData.vin || ""} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} />
              </div>

              <Separator />
              <h4 className="text-sm font-medium">TÜV & Versicherung</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nächster TÜV</Label>
                  <Input type="date" value={formData.tuev_date || ""} onChange={(e) => setFormData({ ...formData, tuev_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Versicherung bis</Label>
                  <Input type="date" value={formData.insurance_expiry || ""} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Versicherer</Label>
                  <Input placeholder="HUK-COBURG" value={formData.insurance_company || ""} onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Policen-Nr.</Label>
                  <Input value={formData.insurance_policy_number || ""} onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })} />
                </div>
              </div>

              <Separator />
              <h4 className="text-sm font-medium">Abrechnung</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>€ pro km</Label>
                  <Input type="number" step="0.01" value={formData.price_per_km ?? 0.30} onChange={(e) => setFormData({ ...formData, price_per_km: parseFloat(e.target.value) || 0.30 })} />
                </div>
                <div className="space-y-2">
                  <Label>Anfahrt-Pauschale €</Label>
                  <Input type="number" step="0.01" value={formData.travel_cost_flat ?? 0} onChange={(e) => setFormData({ ...formData, travel_cost_flat: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea placeholder="z.B. Winterreifen im Lager..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Abbrechen</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1 gap-2">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">Noch keine Fahrzeuge</p>
            <p className="text-sm text-muted-foreground mb-6">Erfasse dein erstes Betriebsfahrzeug für km-Tracking und Kostenanalyse.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Fahrzeug hinzufügen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onEdit={() => startEdit(v)} onDelete={() => deleteMutation.mutate(v.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============= Vehicle Card =============
function VehicleCard({ vehicle: v, onEdit, onDelete }: { vehicle: Vehicle; onEdit: () => void; onDelete: () => void }) {
  const tuevDaysLeft = v.tuev_date ? differenceInDays(new Date(v.tuev_date), new Date()) : null;
  const insuranceDaysLeft = v.insurance_expiry ? differenceInDays(new Date(v.insurance_expiry), new Date()) : null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {v.name || `${v.brand || ""} ${v.model || ""}`.trim() || "Fahrzeug"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {v.license_plate && <span className="font-mono">{v.license_plate}</span>}
                {v.year && <span> • {v.year}</span>}
                {v.fuel_type && <span className="capitalize"> • {v.fuel_type}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {v.is_primary && <Badge variant="secondary">Hauptfahrzeug</Badge>}
            {v.status === "maintenance" && <Badge variant="outline" className="text-yellow-600 border-yellow-600">Werkstatt</Badge>}
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Fahrzeug bearbeiten"><Edit2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} aria-label="Fahrzeug löschen"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Tachostand</p>
            <p className="font-semibold">{v.current_odometer?.toLocaleString("de-DE") || "–"} km</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">€/km</p>
            <p className="font-semibold">{Number(v.price_per_km || 0).toFixed(2)} €</p>
          </div>
          <div className={`p-3 rounded-lg ${tuevDaysLeft !== null && tuevDaysLeft < 30 ? "bg-destructive/10" : "bg-muted/50"}`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {tuevDaysLeft !== null && tuevDaysLeft < 30 && <AlertTriangle className="h-3 w-3 text-destructive" />}
              TÜV
            </p>
            <p className="font-semibold">
              {v.tuev_date ? format(new Date(v.tuev_date), "MM/yyyy") : "–"}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${insuranceDaysLeft !== null && insuranceDaysLeft < 30 ? "bg-destructive/10" : "bg-muted/50"}`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {insuranceDaysLeft !== null && insuranceDaysLeft < 30 && <AlertTriangle className="h-3 w-3 text-destructive" />}
              Versicherung
            </p>
            <p className="font-semibold">
              {v.insurance_expiry ? format(new Date(v.insurance_expiry), "MM/yyyy") : "–"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Costs Tab (Tankbuch & Kosten) =============
function CostsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [costForm, setCostForm] = useState<Partial<VehicleCost>>({
    cost_type: "fuel",
    date: format(new Date(), "yyyy-MM-dd"),
    is_full_tank: false,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["fuhrpark-vehicles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_vehicles").select("id, name, brand, model, license_plate").eq("provider_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["fuhrpark-costs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .select("*")
        .eq("provider_id", user!.id)
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as VehicleCost[];
    },
    enabled: !!user?.id,
  });

  const saveCostMutation = useMutation({
    mutationFn: async (data: Partial<VehicleCost>) => {
      if (!data.vehicle_id) throw new Error("Bitte Fahrzeug wählen");
      if (!data.amount) throw new Error("Bitte Betrag eingeben");
      const { error } = await supabase.from("vehicle_costs").insert({
        vehicle_id: data.vehicle_id,
        cost_type: data.cost_type || "fuel",
        amount: data.amount,
        date: data.date || format(new Date(), "yyyy-MM-dd"),
        description: data.description || null,
        liters: data.liters || null,
        price_per_liter: data.price_per_liter || null,
        mileage_at_cost: data.mileage_at_cost || null,
        is_full_tank: data.is_full_tank || false,
        fuel_station: data.fuel_station || null,
        provider_id: user!.id,
        recorded_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuhrpark-costs"] });
      toast({ title: "Kosten erfasst!" });
      setDialogOpen(false);
      setCostForm({ cost_type: "fuel", date: format(new Date(), "yyyy-MM-dd"), is_full_tank: false });
    },
    onError: (e) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuhrpark-costs"] });
      toast({ title: "Eintrag gelöscht" });
    },
  });

  const getVehicleName = (id: string) => {
    const v = vehicles.find((v) => v.id === id);
    return v?.name || `${v?.brand || ""} ${v?.model || ""}`.trim() || v?.license_plate || "–";
  };

  const isFuel = costForm.cost_type === "fuel";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tankbuch & Kosten</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={vehicles.length === 0}>
              <Plus className="h-4 w-4" /> Kosten erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kosten erfassen</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveCostMutation.mutate(costForm); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Fahrzeug</Label>
                <Select value={costForm.vehicle_id || ""} onValueChange={(v) => setCostForm({ ...costForm, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Fahrzeug wählen" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name || `${v.brand || ""} ${v.model || ""}`.trim() || v.license_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kostenart</Label>
                  <Select value={costForm.cost_type || "fuel"} onValueChange={(v) => setCostForm({ ...costForm, cost_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input type="date" value={costForm.date || ""} onChange={(e) => setCostForm({ ...costForm, date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={costForm.amount || ""} onChange={(e) => setCostForm({ ...costForm, amount: parseFloat(e.target.value) || 0 })} />
              </div>

              {isFuel && (
                <>
                  <Separator />
                  <h4 className="text-sm font-medium flex items-center gap-2"><Fuel className="h-4 w-4 text-primary" /> Tankdaten</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Liter</Label>
                      <Input type="number" step="0.01" value={costForm.liters || ""} onChange={(e) => setCostForm({ ...costForm, liters: parseFloat(e.target.value) || null })} />
                    </div>
                    <div className="space-y-2">
                      <Label>€/Liter</Label>
                      <Input type="number" step="0.001" value={costForm.price_per_liter || ""} onChange={(e) => setCostForm({ ...costForm, price_per_liter: parseFloat(e.target.value) || null })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>km-Stand</Label>
                      <Input type="number" value={costForm.mileage_at_cost || ""} onChange={(e) => setCostForm({ ...costForm, mileage_at_cost: parseInt(e.target.value) || null })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tankstelle</Label>
                      <Input placeholder="Shell, Aral..." value={costForm.fuel_station || ""} onChange={(e) => setCostForm({ ...costForm, fuel_station: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Beschreibung (optional)</Label>
                <Input placeholder="z.B. Ölwechsel 10W-40..." value={costForm.description || ""} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} />
              </div>

              <Button type="submit" disabled={saveCostMutation.isPending} className="w-full gap-2">
                {saveCostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Bitte erst ein Fahrzeug anlegen.</CardContent></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : costs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Noch keine Kosten erfasst</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {costs.map((c) => {
            const ct = COST_TYPES.find((t) => t.value === c.cost_type);
            const Icon = ct?.icon || FileText;
            return (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{ct?.label || c.cost_type}</span>
                      <span className="text-xs text-muted-foreground">• {getVehicleName(c.vehicle_id)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(c.date), "dd.MM.yyyy", { locale: de })}
                      {c.description && ` – ${c.description}`}
                      {c.liters && ` • ${c.liters}L`}
                      {c.mileage_at_cost && ` • ${c.mileage_at_cost.toLocaleString("de-DE")} km`}
                    </p>
                  </div>
                  <span className="font-bold text-foreground whitespace-nowrap">
                    {Number(c.amount).toFixed(2)} €
                  </span>
                  <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0" onClick={() => deleteCostMutation.mutate(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============= Stats Tab =============
function StatsTab() {
  const { user } = useAuth();

  const { data: costs = [] } = useQuery({
    queryKey: ["fuhrpark-costs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_costs")
        .select("*")
        .eq("provider_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as VehicleCost[];
    },
    enabled: !!user?.id,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["fuhrpark-vehicles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("provider_vehicles").select("*").eq("provider_id", user!.id);
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);
  const fuelCosts = costs.filter((c) => c.cost_type === "fuel").reduce((sum, c) => sum + Number(c.amount), 0);
  const repairCosts = costs.filter((c) => ["repair", "maintenance"].includes(c.cost_type)).reduce((sum, c) => sum + Number(c.amount), 0);
  const otherCosts = totalCosts - fuelCosts - repairCosts;
  const totalLiters = costs.filter((c) => c.liters).reduce((sum, c) => sum + Number(c.liters), 0);

  // Per vehicle stats
  const vehicleStats = vehicles.map((v) => {
    const vCosts = costs.filter((c) => c.vehicle_id === v.id);
    return {
      name: v.name || `${v.brand || ""} ${v.model || ""}`.trim() || v.license_plate || "Fahrzeug",
      total: vCosts.reduce((sum, c) => sum + Number(c.amount), 0),
      fuelCount: vCosts.filter((c) => c.cost_type === "fuel").length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalCosts.toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">Gesamtkosten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Fuel className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{fuelCosts.toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">Kraftstoff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{repairCosts.toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">Reparatur/Wartung</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Droplets className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{totalLiters.toFixed(0)} L</p>
            <p className="text-xs text-muted-foreground">Getankt</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Vehicle Breakdown */}
      {vehicleStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kosten pro Fahrzeug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleStats.map((vs, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{vs.name}</p>
                    <p className="text-xs text-muted-foreground">{vs.fuelCount} Tankstopps</p>
                  </div>
                </div>
                <span className="font-bold">{vs.total.toFixed(2)} €</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {costs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Noch keine Daten für die Auswertung</p>
            <p className="text-sm text-muted-foreground mt-1">Erfasse Kosten im Tab "Tankbuch & Kosten"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
