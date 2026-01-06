import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Car, MapPin, Plus, Package, Minus, Trash2 } from "lucide-react";
import { z } from "zod";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Client {
  id: string;
  full_name: string | null;
  readable_id: string | null;
  stable_latitude: number | null;
  stable_longitude: number | null;
}

interface Horse {
  id: string;
  name: string;
  owner_id: string;
}

interface BusinessSettings {
  address: string | null;
  travel_cost_per_km: number | null;
  travel_cost_flat: number | null;
}

interface InventoryItem {
  id: string;
  product_name: string;
  brand: string | null;
  current_stock: number;
  price_sell: number | null;
  tax_rate: number | null;
  min_stock: number | null;
}

interface InvoiceLineItem {
  inventory_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedClientId?: string | null;
  preSelectedHorseId?: string | null;
}

const invoiceSchema = z.object({
  client_id: z.string().min(1, "Bitte wählen Sie einen Kunden"),
  horse_id: z.string().optional(),
  invoice_number: z.string().max(50, "Rechnungsnummer zu lang").optional(),
  issue_date: z.string().min(1, "Bitte wählen Sie ein Datum"),
  due_date: z.string().optional(),
  total_amount: z.number().min(0.01, "Betrag muss größer als 0 sein"),
  status: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().max(1000, "Notizen zu lang").optional(),
});

export function CreateInvoiceModal({ 
  open, 
  onClose, 
  onSuccess, 
  preSelectedClientId,
  preSelectedHorseId 
}: CreateInvoiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [filteredHorses, setFilteredHorses] = useState<Horse[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [showTravelCost, setShowTravelCost] = useState(false);
  const [travelKm, setTravelKm] = useState<string>("");
  const [calculatedTravelCost, setCalculatedTravelCost] = useState<number>(0);
  
  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

  const [formData, setFormData] = useState({
    client_id: preSelectedClientId || "",
    horse_id: preSelectedHorseId || "",
    invoice_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    total_amount: "",
    status: "pending" as "pending" | "paid" | "overdue",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens with new preselected values
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        client_id: preSelectedClientId || "",
        horse_id: preSelectedHorseId || "",
      }));
    }
  }, [open, preSelectedClientId, preSelectedHorseId]);

  // Load data only once when modal first opens
  useEffect(() => {
    if (!open || !user || dataLoaded) return;

    const fetchData = async () => {
      // Load business settings for travel costs
      const { data: settings } = await supabase
        .from("business_settings")
        .select("address, travel_cost_per_km, travel_cost_flat")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setBusinessSettings(settings);

      // Lade ALLE Kunden (Profile mit Rolle 'client') aus der Datenbank
      const { data: clientRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      let allClients: Client[] = [];

      if (clientRoles && clientRoles.length > 0) {
        const clientIds = clientRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, readable_id, stable_latitude, stable_longitude")
          .in("id", clientIds)
          .is("deleted_at", null)
          .order("full_name");

        if (profiles) {
          allClients = profiles.filter(p => p.full_name);
        }
      }

      // Fallback: Auch Profile laden, die vom Provider erstellt wurden
      const { data: createdProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, stable_latitude, stable_longitude")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null);

      if (createdProfiles) {
        const existingIds = new Set(allClients.map(c => c.id));
        createdProfiles.forEach(p => {
          if (!existingIds.has(p.id) && p.full_name) {
            allClients.push(p);
          }
        });
      }

      setClients(allClients);

      // Pferde laden
      const { data: horsesData } = await supabase
        .from("horses")
        .select("id, name, owner_id")
        .is("deleted_at", null);

      setHorses(horsesData || []);
      
      // Load inventory items
      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("id, product_name, brand, current_stock, price_sell, tax_rate, min_stock")
        .eq("user_id", user.id)
        .gt("current_stock", 0)
        .order("product_name");
      
      setInventoryItems((inventoryData || []) as InventoryItem[]);
      setDataLoaded(true);
    };

    fetchData();
  }, [open, user, dataLoaded]);

  // Reset dataLoaded when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid flash on next open
      const timer = setTimeout(() => setDataLoaded(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Calculate travel cost when km changes or client changes
  useEffect(() => {
    if (!businessSettings) return;
    
    const km = parseFloat(travelKm) || 0;
    const perKm = businessSettings.travel_cost_per_km || 0;
    const flat = businessSettings.travel_cost_flat || 0;
    
    // Calculate: flat fee + (km * cost per km) - round trip = km * 2
    const cost = flat + (km * 2 * perKm);
    setCalculatedTravelCost(Math.round(cost * 100) / 100);
  }, [travelKm, businessSettings]);

  // Auto-calculate distance when client is selected
  const calculateTravelDistance = () => {
    const selectedClient = clients.find(c => c.id === formData.client_id);
    
    if (!selectedClient?.stable_latitude || !selectedClient?.stable_longitude) {
      toast({
        title: "Keine Koordinaten",
        description: "Für diesen Kunden sind keine Standortdaten hinterlegt. Bitte KM manuell eingeben.",
        variant: "destructive",
      });
      return;
    }
    
    // For now, use Nuremberg as default business location if not set
    // In production, this would come from geocoding the business address
    // Using approximate center of Germany as fallback
    const businessLat = 49.45; // Nuremberg
    const businessLon = 11.08;
    
    const distance = calculateDistance(
      businessLat,
      businessLon,
      selectedClient.stable_latitude,
      selectedClient.stable_longitude
    );
    
    setTravelKm(Math.round(distance).toString());
    setShowTravelCost(true);
  };

  const addTravelCostToAmount = () => {
    const currentAmount = parseFloat(formData.total_amount) || 0;
    const newAmount = currentAmount + calculatedTravelCost;
    setFormData(prev => ({ ...prev, total_amount: newAmount.toFixed(2) }));
    
    // Add to notes
    const travelNote = `Anfahrt: ${travelKm} km (Hin- und Rückfahrt) = €${calculatedTravelCost.toFixed(2)}`;
    const currentNotes = formData.notes;
    setFormData(prev => ({
      ...prev,
      notes: currentNotes ? `${currentNotes}\n${travelNote}` : travelNote
    }));
    
    setShowTravelCost(false);
    toast({ title: "Fahrtkosten hinzugefügt", description: `€${calculatedTravelCost.toFixed(2)} wurden zum Betrag addiert.` });
  };

  // Inventory line item functions
  const addInventoryItem = (item: InventoryItem) => {
    const existingIndex = lineItems.findIndex(li => li.inventory_id === item.id);
    
    if (existingIndex >= 0) {
      // Increase quantity if already added
      const updated = [...lineItems];
      if (updated[existingIndex].quantity < item.current_stock) {
        updated[existingIndex].quantity += 1;
        setLineItems(updated);
      } else {
        toast({ title: "Maximale Menge erreicht", description: "Nicht genügend Bestand vorhanden.", variant: "destructive" });
      }
    } else {
      // Add new line item
      setLineItems([...lineItems, {
        inventory_id: item.id,
        name: item.brand ? `${item.brand} - ${item.product_name}` : item.product_name,
        quantity: 1,
        unit_price: item.price_sell || 0,
        tax_rate: item.tax_rate || 19,
      }]);
    }
    setShowInventoryPicker(false);
  };

  const updateLineItemQuantity = (index: number, delta: number) => {
    const updated = [...lineItems];
    const newQty = updated[index].quantity + delta;
    const inventoryItem = inventoryItems.find(i => i.id === updated[index].inventory_id);
    
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else if (inventoryItem && newQty <= inventoryItem.current_stock) {
      updated[index].quantity = newQty;
    } else {
      toast({ title: "Maximale Menge erreicht", variant: "destructive" });
      return;
    }
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // Filter horses when client changes
  useEffect(() => {
    if (formData.client_id && horses.length > 0) {
      setFilteredHorses(horses.filter(h => h.owner_id === formData.client_id));
    } else {
      setFilteredHorses([]);
    }
  }, [formData.client_id, horses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const amount = parseFloat(formData.total_amount);
    
    const validationData = {
      client_id: formData.client_id,
      horse_id: formData.horse_id || undefined,
      invoice_number: formData.invoice_number || undefined,
      issue_date: formData.issue_date,
      due_date: formData.due_date || undefined,
      total_amount: isNaN(amount) ? 0 : amount,
      status: formData.status,
      notes: formData.notes || undefined,
    };

    const result = invoiceSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { data: insertedInvoice, error } = await supabase.from("invoices").insert({
      client_id: formData.client_id,
      provider_id: user?.id,
      horse_id: formData.horse_id || null,
      invoice_number: formData.invoice_number || null,
      issue_date: formData.issue_date,
      due_date: formData.due_date || null,
      total_amount: amount,
      status: formData.status,
      notes: formData.notes || null,
    }).select().single();

    setLoading(false);

    if (error) {
      toast({
        title: "Fehler",
        description: "Rechnung konnte nicht erstellt werden. " + error.message,
        variant: "destructive",
      });
      return;
    }

    // Send push notification to client
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const clientName = selectedClient?.full_name || "Kunde";
      
      // Get provider business name for notification
      const { data: businessSettings } = await supabase
        .from("business_settings")
        .select("business_name, owner_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const providerName = businessSettings?.business_name || businessSettings?.owner_name || "Ihr Hufbearbeiter";
      const formattedAmount = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(amount);

      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: formData.client_id,
          title: "Neue Rechnung erhalten",
          body: `${providerName} hat Ihnen eine Rechnung über ${formattedAmount} gestellt.`,
          url: "/client-invoices",
        },
      });
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't show error to user, invoice was still created successfully
    }

    toast({
      title: "Erfolg",
      description: "Rechnung wurde erstellt.",
    });

    setFormData({
      client_id: "",
      horse_id: "",
      invoice_number: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      total_amount: "",
      status: "pending",
      notes: "",
    });

    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Rechnung erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Kunde *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Keine Kunden gefunden</div>
                ) : (
                    clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                        {client.full_name || "Unbekannt"}
                        {client.readable_id && ` (${client.readable_id})`}
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
          </div>

          {/* Pferd Auswahl nur anzeigen, wenn Kunde gewählt */}
          {formData.client_id && (
            <div className="space-y-2">
              <Label htmlFor="horse_id">Pferd (optional)</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, horse_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pferd auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredHorses.length === 0 ? (
                     <div className="p-2 text-sm text-muted-foreground">Keine Pferde für diesen Kunden</div>
                  ) : (
                    filteredHorses.map(horse => (
                        <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                        </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invoice_number">Rechnungsnummer</Label>
            <Input
              id="invoice_number"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="z.B. RE-2024-001"
              maxLength={50}
            />
            {errors.invoice_number && <p className="text-sm text-destructive">{errors.invoice_number}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Rechnungsdatum *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              />
              {errors.issue_date && <p className="text-sm text-destructive">{errors.issue_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Fälligkeitsdatum</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Betrag (€) *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                placeholder="0.00"
              />
              {errors.total_amount && <p className="text-sm text-destructive">{errors.total_amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "pending" | "paid" | "overdue") => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Offen</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Travel Cost Section */}
          {formData.client_id && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Fahrtkosten
                </Label>
                {!showTravelCost && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTravelCost(true);
                      calculateTravelDistance();
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Anfahrt berechnen
                  </Button>
                )}
              </div>
              
              {showTravelCost && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Entfernung (einfache Strecke)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={travelKm}
                          onChange={(e) => setTravelKm(e.target.value)}
                          placeholder="km"
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">km</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={calculateTravelDistance}
                          title="Distanz berechnen"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {travelKm ? `${travelKm} km × 2 (Hin+Zurück) × €${businessSettings?.travel_cost_per_km || 0.50}/km` : ""}
                      {businessSettings?.travel_cost_flat ? ` + €${businessSettings.travel_cost_flat} Pauschale` : ""}
                    </span>
                    <span className="font-semibold text-primary">
                      = €{calculatedTravelCost.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addTravelCostToAmount}
                      disabled={!travelKm || calculatedTravelCost <= 0}
                      className="flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Zum Betrag hinzufügen
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTravelCost(false)}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inventory / Product Line Items Section */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produkte aus Lager
              </Label>
              {inventoryItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInventoryPicker(!showInventoryPicker)}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Produkt hinzufügen
                </Button>
              )}
            </div>

            {/* Inventory Picker */}
            {showInventoryPicker && (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-background">
                {inventoryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addInventoryItem(item)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{item.price_sell?.toFixed(2) || "0.00"} €</p>
                      <p className="text-xs text-muted-foreground">Bestand: {item.current_stock}</p>
                    </div>
                  </button>
                ))}
                {inventoryItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">Keine Produkte im Lager</p>
                )}
              </div>
            )}

            {/* Added Line Items */}
            {lineItems.length > 0 && (
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={item.inventory_id} className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit_price.toFixed(2)} € × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateLineItemQuantity(index, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="min-w-[28px] justify-center">
                        {item.quantity}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateLineItemQuantity(index, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold w-20 text-right">
                      {(item.quantity * item.unit_price).toFixed(2)} €
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Produkte Gesamt:</span>
                  <span className="font-bold text-primary">{lineItemsTotal.toFixed(2)} €</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const currentAmount = parseFloat(formData.total_amount) || 0;
                    setFormData(prev => ({ ...prev, total_amount: (currentAmount + lineItemsTotal).toFixed(2) }));
                    
                    // Add to notes
                    const productNotes = lineItems.map(li => `${li.name} (${li.quantity}x) = €${(li.quantity * li.unit_price).toFixed(2)}`).join("\n");
                    const currentNotes = formData.notes;
                    setFormData(prev => ({
                      ...prev,
                      notes: currentNotes ? `${currentNotes}\n\nProdukte:\n${productNotes}` : `Produkte:\n${productNotes}`
                    }));
                    
                    setLineItems([]);
                    toast({ title: "Produkte hinzugefügt", description: `€${lineItemsTotal.toFixed(2)} wurden zum Betrag addiert.` });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Zum Betrag hinzufügen
                </Button>
              </div>
            )}

            {inventoryItems.length === 0 && lineItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Keine Produkte im Lager. Füge Produkte unter "Material / Lager" hinzu.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionale Notizen..."
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rechnung erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
