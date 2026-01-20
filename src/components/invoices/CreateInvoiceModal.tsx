import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { Loader2, Car, MapPin, Plus, Trash2, Eye, Package, Info } from "lucide-react";
import { z } from "zod";
import { generateInvoicePdf } from "@/lib/invoicePdfGenerator";

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
  id: string; // Temporary ID for tracking
  inventory_item_id: string | null; // Links to inventory_items table
  title: string;
  quantity: number;
  unit_price: number;
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
  const [travelCostMode, setTravelCostMode] = useState<"kilometer" | "pauschale">("kilometer");
  const [travelKm, setTravelKm] = useState<string>("");
  const [pricePerKm, setPricePerKm] = useState<string>("0.50");
  const [flatAmount, setFlatAmount] = useState<string>("");
  const [flatDescription, setFlatDescription] = useState<string>("Anfahrtspauschale");
  const [calculatedTravelCost, setCalculatedTravelCost] = useState<number>(0);
  
  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [formData, setFormData] = useState({
    client_id: preSelectedClientId || "",
    horse_id: preSelectedHorseId || "",
    invoice_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    status: "pending" as "pending" | "paid" | "overdue",
    payment_method: "" as "" | "Überweisung" | "Bar" | "PayPal",
    customer_type: "privat" as "privat" | "gewerbe" | "kleinunternehmer",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total from line items
  const calculatedTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [lineItems]);

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
      
      // Load inventory items (including those with 0 stock for manual entries)
      const { data: inventoryData } = await supabase
        .from("inventory_items")
        .select("id, product_name, brand, current_stock, price_sell, tax_rate, min_stock")
        .eq("user_id", user.id)
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

  // Calculate travel cost when km changes or mode changes
  useEffect(() => {
    if (travelCostMode === "kilometer") {
      const km = parseFloat(travelKm) || 0;
      const perKm = parseFloat(pricePerKm) || 0;
      // Calculate: km * 2 (round trip) * price per km
      const cost = km * 2 * perKm;
      setCalculatedTravelCost(Math.round(cost * 100) / 100);
    } else {
      // Pauschale mode - just use the flat amount
      const flat = parseFloat(flatAmount) || 0;
      setCalculatedTravelCost(Math.round(flat * 100) / 100);
    }
  }, [travelKm, pricePerKm, flatAmount, travelCostMode]);

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

  const addTravelCostAsLineItem = () => {
    const title = travelCostMode === "kilometer"
      ? `Anfahrt: ${travelKm} km (Hin- und Rückfahrt)`
      : flatDescription.trim() || "Anfahrtspauschale";
    
    const newLineItem: InvoiceLineItem = {
      id: `travel-${Date.now()}`,
      inventory_item_id: null, // No inventory item for travel costs
      title,
      quantity: 1,
      unit_price: calculatedTravelCost,
    };
    setLineItems([...lineItems, newLineItem]);
    setShowTravelCost(false);
    setTravelKm("");
    setFlatAmount("");
    setFlatDescription("Anfahrtspauschale");
    toast({ title: "Fahrtkosten hinzugefügt" });
  };

  // Generate unique ID for line items
  const generateLineItemId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new empty line item
  const addEmptyLineItem = () => {
    const newLineItem: InvoiceLineItem = {
      id: generateLineItemId(),
      inventory_item_id: null,
      title: "",
      quantity: 1,
      unit_price: 0,
    };
    setLineItems([...lineItems, newLineItem]);
  };

  // Add line item from inventory selection
  const addInventoryLineItem = (inventoryItem: InventoryItem) => {
    const newLineItem: InvoiceLineItem = {
      id: generateLineItemId(),
      inventory_item_id: inventoryItem.id,
      title: inventoryItem.brand 
        ? `${inventoryItem.brand} - ${inventoryItem.product_name}` 
        : inventoryItem.product_name,
      quantity: 1,
      unit_price: inventoryItem.price_sell || 0,
    };
    setLineItems([...lineItems, newLineItem]);
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number | null) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Handle inventory selection for a line item
  const handleInventorySelect = (lineItemId: string, inventoryItemId: string) => {
    if (inventoryItemId === "custom") {
      // Clear inventory link for custom entry
      updateLineItem(lineItemId, "inventory_item_id", null);
      return;
    }
    
    const inventoryItem = inventoryItems.find(i => i.id === inventoryItemId);
    if (inventoryItem) {
      setLineItems(lineItems.map(item => 
        item.id === lineItemId 
          ? { 
              ...item, 
              inventory_item_id: inventoryItem.id,
              title: inventoryItem.brand 
                ? `${inventoryItem.brand} - ${inventoryItem.product_name}` 
                : inventoryItem.product_name,
              unit_price: inventoryItem.price_sell || 0,
            } 
          : item
      ));
    }
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Filter horses when client changes
  useEffect(() => {
    if (formData.client_id && horses.length > 0) {
      setFilteredHorses(horses.filter(h => h.owner_id === formData.client_id));
    } else {
      setFilteredHorses([]);
    }
  }, [formData.client_id, horses]);

  // Preview PDF function
  const handlePreview = async () => {
    if (!formData.client_id) {
      toast({ title: "Bitte Kunde wählen", variant: "destructive" });
      return;
    }
    if (calculatedTotal <= 0) {
      toast({ title: "Bitte Positionen hinzufügen", variant: "destructive" });
      return;
    }

    setPreviewLoading(true);
    
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const selectedHorse = filteredHorses.find(h => h.id === formData.horse_id);
      
      // Build positions notes
      const positionsText = lineItems.map(item => 
        `${item.title} (${item.quantity}x) = €${(item.quantity * item.unit_price).toFixed(2)}`
      ).join("\n");

      // Build a mock invoice for preview
      const previewInvoice = {
        id: "PREVIEW",
        invoice_number: formData.invoice_number || `VORSCHAU-${Date.now()}`,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        total_amount: calculatedTotal,
        status: formData.status,
        notes: formData.notes 
          ? `${formData.notes}\n\nPositionen:\n${positionsText}`
          : `Positionen:\n${positionsText}`,
        horse: selectedHorse ? { name: selectedHorse.name } : null,
      };
      
      const clientProfile = selectedClient ? {
        full_name: selectedClient.full_name,
        email: null,
        phone: null,
        city: null,
        zip_code: null,
        stable_street: null,
        stable_city: null,
        stable_zip: null,
        readable_id: selectedClient.readable_id,
      } : null;
      
      const pdfBlob = await generateInvoicePdf(previewInvoice, clientProfile, user?.id || "");
      
      // Open PDF in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      
      toast({ title: "Vorschau generiert", description: "PDF wurde in neuem Tab geöffnet." });
    } catch (error) {
      console.error("Preview error:", error);
      toast({ title: "Fehler bei Vorschau", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate at least one line item exists
    if (lineItems.length === 0) {
      toast({
        title: "Keine Positionen",
        description: "Bitte fügen Sie mindestens eine Rechnungsposition hinzu.",
        variant: "destructive",
      });
      return;
    }

    // Validate all line items have title and valid amounts
    const invalidItems = lineItems.filter(item => !item.title.trim() || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Ungültige Positionen",
        description: "Bitte füllen Sie alle Positionen vollständig aus.",
        variant: "destructive",
      });
      return;
    }
    
    const validationData = {
      client_id: formData.client_id,
      horse_id: formData.horse_id || undefined,
      invoice_number: formData.invoice_number || undefined,
      issue_date: formData.issue_date,
      due_date: formData.due_date || undefined,
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

    try {
      // Step 1: Create the invoice
      const { data: insertedInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          client_id: formData.client_id,
          provider_id: user?.id,
          horse_id: formData.horse_id || null,
          invoice_number: formData.invoice_number || null,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          total_amount: calculatedTotal,
          status: formData.status,
          payment_method: formData.payment_method || null,
          customer_type: formData.customer_type,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Rechnung erstellen fehlgeschlagen: ${invoiceError.message}`);
      }

      // Step 2: Create invoice_items for each line item
      const invoiceItemsToInsert = lineItems.map(item => ({
        invoice_id: insertedInvoice.id,
        inventory_item_id: item.inventory_item_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsToInsert);

      if (itemsError) {
        console.error("Failed to insert invoice items:", itemsError);
        // Don't throw - invoice was created, just log the error
        toast({
          title: "Warnung",
          description: "Rechnung erstellt, aber Positionen konnten nicht gespeichert werden.",
          variant: "destructive",
        });
      }

      // Step 3: Deduct stock for each line item with inventory_item_id
      const stockUpdates = lineItems
        .filter(item => item.inventory_item_id)
        .map(async (item) => {
          const inventoryItem = inventoryItems.find(i => i.id === item.inventory_item_id);
          if (inventoryItem) {
            const newStock = Math.max(0, inventoryItem.current_stock - item.quantity);
            return supabase
              .from("inventory_items")
              .update({ current_stock: newStock })
              .eq("id", item.inventory_item_id!);
          }
          return Promise.resolve({ error: null });
        });

      await Promise.all(stockUpdates);

      // Step 4: Send push notification to client
      try {
        const selectedClient = clients.find(c => c.id === formData.client_id);
        
        const { data: providerSettings } = await supabase
          .from("business_settings")
          .select("business_name, owner_name")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        const providerName = providerSettings?.business_name || providerSettings?.owner_name || "Ihr Hufbearbeiter";
        const formattedAmount = new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(calculatedTotal);

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
      }

      const itemsWithInventory = lineItems.filter(li => li.inventory_item_id).length;
      toast({
        title: "Erfolg",
        description: itemsWithInventory > 0 
          ? `Rechnung mit ${lineItems.length} Position${lineItems.length > 1 ? 'en' : ''} erstellt. Lagerbestand für ${itemsWithInventory} Produkt${itemsWithInventory > 1 ? 'e' : ''} aktualisiert.`
          : `Rechnung mit ${lineItems.length} Position${lineItems.length > 1 ? 'en' : ''} erstellt.`,
      });

      // Reset form
      setFormData({
        client_id: "",
        horse_id: "",
        invoice_number: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        status: "pending",
        payment_method: "",
        customer_type: "privat",
        notes: "",
      });
      setLineItems([]);
      setShowTravelCost(false);
      setTravelKm("");

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Invoice creation error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Rechnung konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Left column: Client & Details
  const renderClientDetails = () => (
    <div className="space-y-4">
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

      {/* Horse Selection */}
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

      {/* Invoice Number */}
      <div className="space-y-2">
        <Label htmlFor="invoice_number">Rechnungsnummer</Label>
        <Input
          id="invoice_number"
          value={formData.invoice_number}
          onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
          placeholder="z.B. RE-2024-001"
          maxLength={50}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issue_date">Rechnungsdatum *</Label>
          <Input
            id="issue_date"
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Fälligkeitsdatum</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Leer lassen für 'Sofort fällig'.
          </p>
        </div>
      </div>

      {/* Customer Type */}
      <div className="space-y-2">
        <Label htmlFor="customer_type">Kundentyp</Label>
        <Select
          value={formData.customer_type}
          onValueChange={(value: "privat" | "gewerbe" | "kleinunternehmer") => setFormData(prev => ({ ...prev, customer_type: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="privat">Privatkunde (inkl. 19% MwSt)</SelectItem>
            <SelectItem value="gewerbe">Gewerbekunde (Netto)</SelectItem>
            <SelectItem value="kleinunternehmer">Kleinunternehmer (§19 UStG)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status & Payment */}
      <div className="grid grid-cols-2 gap-4">
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

        <div className="space-y-2">
          <Label htmlFor="payment_method">Zahlungsart</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value: "Überweisung" | "Bar" | "PayPal") => setFormData(prev => ({ ...prev, payment_method: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Überweisung">Überweisung</SelectItem>
              <SelectItem value="Bar">Bar</SelectItem>
              <SelectItem value="PayPal">PayPal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Optionale Notizen..."
          maxLength={1000}
          rows={2}
        />
      </div>
    </div>
  );

  // Right column: Invoice Positions
  const renderInvoicePositions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Rechnungspositionen
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEmptyLineItem}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Position hinzufügen
        </Button>
      </div>

      {/* Line Items List */}
      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {lineItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Noch keine Positionen hinzugefügt</p>
            <p className="text-xs mt-1">Klicken Sie auf "+ Position hinzufügen"</p>
          </div>
        ) : (
          lineItems.map((item, index) => (
            <div key={item.id} className="p-3 bg-muted/50 rounded-lg border space-y-2">
              <div className="flex items-start gap-2">
                {/* Product Selection Dropdown */}
                <div className="flex-1 space-y-2">
                  <Select
                    value={item.inventory_item_id || "custom"}
                    onValueChange={(value) => handleInventorySelect(item.id, value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Produkt aus Lager wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <span className="text-muted-foreground">— Manueller Eintrag —</span>
                      </SelectItem>
                      {inventoryItems.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{inv.brand ? `${inv.brand} - ${inv.product_name}` : inv.product_name}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatCurrency(inv.price_sell || 0)} · {inv.current_stock} Stk.
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Editable Title */}
                  <Input
                    value={item.title}
                    onChange={(e) => updateLineItem(item.id, "title", e.target.value)}
                    placeholder="Beschreibung..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeLineItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity and Price */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0">Menge:</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="h-8 w-16 text-sm text-center"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground shrink-0">Preis €:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    className="h-8 w-24 text-sm"
                  />
                </div>

                <div className="ml-auto text-right">
                  <span className="text-sm font-semibold">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Travel Cost Section */}
      {formData.client_id && (
        <div className="p-3 rounded-lg bg-muted/30 border border-dashed space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4" />
              Fahrtkosten
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Wähle 'Kilometer' für automatische Distanzberechnung (Hin- & Rückweg) oder 'Pauschale' für feste Zonentarife.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            {!showTravelCost && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTravelCost(true);
                  if (travelCostMode === "kilometer") {
                    calculateTravelDistance();
                  }
                }}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                Hinzufügen
              </Button>
            )}
          </div>
          
          {showTravelCost && (
            <div className="space-y-3">
              {/* Mode Switcher */}
              <ToggleGroup
                type="single"
                value={travelCostMode}
                onValueChange={(value) => value && setTravelCostMode(value as "kilometer" | "pauschale")}
                className="justify-start"
              >
                <ToggleGroupItem 
                  value="kilometer" 
                  className="h-8 px-3 text-xs data-[state=on]:bg-[#F47B20] data-[state=on]:text-white"
                >
                  Kilometer
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="pauschale" 
                  className="h-8 px-3 text-xs data-[state=on]:bg-[#F47B20] data-[state=on]:text-white"
                >
                  Pauschale
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Mode A: Kilometer */}
              {travelCostMode === "kilometer" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={travelKm}
                      onChange={(e) => setTravelKm(e.target.value)}
                      placeholder="km"
                      className="w-20 h-8"
                    />
                    <span className="text-xs text-muted-foreground">km (einfach)</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={calculateTravelDistance}
                            className="h-7"
                          >
                            <MapPin className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Automatische Distanzermittlung basierend auf der Kundenadresse.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">Preis pro km:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricePerKm}
                        onChange={(e) => setPricePerKm(e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-0.5">
                      Standard: 0,30€ - 0,60€. Dieser Wert multipliziert sich mit der doppelten Strecke (Hin/Rück).
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {travelKm ? `${travelKm} km × 2 × €${pricePerKm}/km` : "Formel: Distanz × 2 × Preis/km"}
                    </span>
                    <span className="font-medium">{formatCurrency(calculatedTravelCost)}</span>
                  </div>
                </div>
              )}

              {/* Mode B: Pauschale (Flat Rate) */}
              {travelCostMode === "pauschale" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">Betrag:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={flatAmount}
                      onChange={(e) => setFlatAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Beschreibung (optional):</Label>
                    <Input
                      type="text"
                      value={flatDescription}
                      onChange={(e) => setFlatDescription(e.target.value)}
                      placeholder="Anfahrtspauschale"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {flatDescription || "Anfahrtspauschale"}
                    </span>
                    <span className="font-medium">{formatCurrency(calculatedTravelCost)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addTravelCostAsLineItem}
                  disabled={
                    (travelCostMode === "kilometer" && (!travelKm || calculatedTravelCost <= 0)) ||
                    (travelCostMode === "pauschale" && calculatedTravelCost <= 0)
                  }
                  className="flex-1 h-7 text-xs"
                >
                  Als Position hinzufügen
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTravelCost(false)}
                  className="h-7 text-xs"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Display */}
      <div className="pt-4 border-t-2 border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Gesamtbetrag:</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(calculatedTotal)}
          </span>
        </div>
        {lineItems.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {lineItems.length} Position{lineItems.length > 1 ? "en" : ""}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Neue Rechnung erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 pb-4 [&_input]:text-base [&_textarea]:text-base [&_select]:text-base">
            {/* 2-Column Layout on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Left Column: Client & Details */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 hidden md:block">
                  Kunde & Details
                </h3>
                {renderClientDetails()}
              </div>

              {/* Right Column: Invoice Positions */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 hidden md:block">
                  Positionen & Betrag
                </h3>
                {renderInvoicePositions()}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-0 flex-col sm:flex-row gap-2 sm:gap-0">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handlePreview}
                disabled={previewLoading || !formData.client_id || calculatedTotal <= 0}
              >
                {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Vorschau
              </Button>
            </div>
            <Button type="submit" disabled={loading || calculatedTotal <= 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rechnung erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
