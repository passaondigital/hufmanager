import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mail,
  Phone,
  MapPin,
  Plus,
  Save,
  Trash2,
  Edit,
  AlertTriangle,
  Navigation,
  FileText,
  Building2,
  Check,
  X,
  ChevronDown,
  Star,
  CreditCard,
  UserCheck,
  Briefcase,
  Tags,
} from "lucide-react";
import { ProviderHorseEditSheet } from "@/components/customers/ProviderHorseEditSheet";
import { ClientInvoicesSection } from "@/components/invoices/ClientInvoicesSection";
import { ClientDocumentsTab } from "@/components/customers/ClientDocumentsTab";
import { PRICE_GROUPS, getPriceGroupLabel } from "@/lib/priceGroups";
import { ClientBadges } from "@/components/customers/ClientStatusBadges";
import { AddressGeocoder } from "@/components/customers/AddressGeocoder";
import { CustomerLocationMap, CustomerLocationPlaceholder } from "@/components/customers/CustomerLocationMap";
import { CustomerQuickActions } from "@/components/customers/CustomerQuickActions";
import { CustomerHorseCards } from "@/components/customers/CustomerHorseCards";
import { CustomerGalleryPreview } from "@/components/customers/CustomerGalleryPreview";
import { GhostProfileBanner, InviteClientButton } from "@/components/customers/InviteClientButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PAYMENT_RATING_OPTIONS,
  LIFECYCLE_STATUS_OPTIONS,
  RELIABILITY_SCORE_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  PaymentRating,
  LifecycleStatus,
  ClientType,
} from "@/components/horse-detail/types";

interface Horse {
  id: string;
  name: string;
  readable_id?: string;
  breed?: string;
  equine_type?: string;
  latitude?: number;
  longitude?: number;
  owner_id?: string;
}

interface Customer {
  id: string;
  readable_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_mobile?: string;
  phone_landline?: string;
  street?: string;
  house_number?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  geo_lat?: number | null;
  geo_lng?: number | null;
  has_logged_in?: boolean;
  invited_at?: string;
  created_at?: string;
  is_business?: boolean;
  vat_id?: string;
  // New fields
  client_type?: ClientType;
  lifecycle_status?: LifecycleStatus;
  payment_rating?: PaymentRating;
  reliability_score?: number;
  working_conditions?: string;
  order_authorization?: boolean;
  price_group?: string;
  price_group_label?: string | null;
}

interface Props {
  customer: Customer | null;
  horses: Horse[];
  open: boolean;
  onClose: () => void;
  onAddHorse: (customerId: string) => void;
}

const EQUINE_TYPE_LABELS: Record<string, string> = {
  horse: "Pferd",
  pony: "Pony",
  donkey: "Esel",
  mule: "Maultier",
  zebra: "Zebra",
};

export function CustomerDetailModal({ customer, horses, open, onClose, onAddHorse }: Props) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [horseToDelete, setHorseToDelete] = useState<Horse | null>(null);
  const [horseToEditId, setHorseToEditId] = useState<string | null>(null);
  const [contactData, setContactData] = useState<{ is_business: boolean; vat_id: string } | null>(null);
  const [businessInfoOpen, setBusinessInfoOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    phone_mobile: "",
    phone_landline: "",
    street: "",
    house_number: "",
    zip_code: "",
    city: "",
    state: "",
    geo_lat: null as number | null,
    geo_lng: null as number | null,
    is_business: false,
    vat_id: "",
    // New fields
    client_type: "" as ClientType | "",
    lifecycle_status: "" as LifecycleStatus | "",
    payment_rating: "" as PaymentRating | "",
    reliability_score: null as number | null,
    working_conditions: "",
    order_authorization: false,
    price_group: "standard",
  });

  // Load contact business info when modal opens
  useEffect(() => {
    if (open && customer?.id) {
      supabase
        .from("contacts")
        .select("is_business, vat_id")
        .eq("profile_id", customer.id)
        .maybeSingle()
        .then(({ data }) => {
          setContactData(data ? { is_business: data.is_business || false, vat_id: data.vat_id || "" } : null);
        });
    }
  }, [open, customer?.id]);

  // Initialize edit form when customer changes
  const initEditForm = async () => {
    if (customer) {
      // Fetch is_business + vat_id from contacts table
      let contactBiz = false;
      let contactVat = "";
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("is_business, vat_id")
        .eq("profile_id", customer.id)
        .maybeSingle();
      if (contactRow) {
        contactBiz = contactRow.is_business || false;
        contactVat = contactRow.vat_id || "";
      }

      setEditForm({
        full_name: customer.full_name || "",
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        phone_mobile: customer.phone_mobile || "",
        phone_landline: customer.phone_landline || "",
        street: customer.street || "",
        house_number: customer.house_number || "",
        zip_code: customer.zip_code || "",
        city: customer.city || "",
        state: customer.state || "",
        geo_lat: customer.geo_lat || null,
        geo_lng: customer.geo_lng || null,
        is_business: contactBiz,
        vat_id: contactVat,
        client_type: customer.client_type || "",
        lifecycle_status: customer.lifecycle_status || "",
        payment_rating: customer.payment_rating || "",
        reliability_score: customer.reliability_score || null,
        working_conditions: customer.working_conditions || "",
        order_authorization: customer.order_authorization || false,
        price_group: customer.price_group || "standard",
      });
    }
  };

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: async (data: typeof editForm & { id: string }) => {
      // Update profile (without is_business/vat_id — those live on contacts)
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          email: data.email || null,
          phone: data.phone || null,
          phone_mobile: data.phone_mobile || null,
          phone_landline: data.phone_landline || null,
          street: data.street || null,
          house_number: data.house_number || null,
          zip_code: data.zip_code || null,
          city: data.city || null,
          state: data.state || null,
          latitude: data.geo_lat,
          longitude: data.geo_lng,
          client_type: data.client_type || null,
          lifecycle_status: data.lifecycle_status || null,
          payment_rating: data.payment_rating || null,
          reliability_score: data.reliability_score,
          working_conditions: data.working_conditions || null,
          order_authorization: data.order_authorization,
          price_group: data.price_group || "standard",
        })
        .eq("id", data.id);
      if (error) throw error;

      // Update is_business + vat_id on contacts table (if a contact record exists)
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("id")
        .eq("profile_id", data.id)
        .maybeSingle();

      if (contactRow) {
        await supabase
          .from("contacts")
          .update({
            is_business: data.is_business,
            vat_id: data.vat_id || null,
          })
          .eq("id", contactRow.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      toast({ title: "Kunde aktualisiert" });
      setIsEditing(false);
    },
    onError: (err: any) => {
      console.error("Customer update error:", err);
      toast({ title: "Fehler beim Speichern", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
    },
  });

  // Cascade delete customer mutation (uses RPC for proper cleanup)
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase.rpc("delete_client_cascade", {
        _client_id: customerId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
      toast({ 
        title: "Kunde gelöscht", 
        description: "Kunde, Pferde und zukünftige Termine wurden entfernt." 
      });
      onClose();
    },
    onError: (err: any) => {
      toast({ 
        title: "Fehler beim Löschen", 
        description: err?.message || "Unbekannter Fehler",
        variant: "destructive" 
      });
    },
  });

  // Safe delete horse mutation (uses RPC for proper cleanup)
  const deleteHorse = useMutation({
    mutationFn: async (horseId: string) => {
      const { error } = await supabase.rpc("delete_horse_safe", {
        _horse_id: horseId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
      queryClient.invalidateQueries({ queryKey: ["horses"] });
      toast({ title: "Pferd gelöscht", description: "Zukünftige Termine wurden abgesagt." });
      setHorseToDelete(null);
    },
    onError: (err: any) => {
      toast({
        title: "Fehler beim Löschen",
        description: err?.message || "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!customer) return;
    updateCustomer.mutate({
      id: customer.id,
      ...editForm,
    });
  };

  const handleDelete = () => {
    if (!customer) return;
    deleteCustomer.mutate(customer.id);
    setShowDeleteConfirm(false);
  };

  const openNavigation = (lat: number, lng: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Open navigation using address (street, zip, city)
  const openAddressNavigation = (street: string, zip: string, city: string) => {
    const address = encodeURIComponent(`${street}, ${zip} ${city}`);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${address}`
      : `https://www.google.com/maps/dir/?api=1&destination=${address}`;
    window.open(url, "_blank");
  };

  // Check if customer has a complete address for navigation
  const hasCompleteAddress = customer?.street && customer?.zip_code && customer?.city;

  if (!customer) return null;

  // Get payment rating info
  const paymentRatingInfo = PAYMENT_RATING_OPTIONS.find(o => o.value === customer.payment_rating);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[520px] max-h-[90vh] overflow-y-auto p-0 border-border bg-background">
          {/* Premium Header with gradient */}
          <div className="bg-gradient-to-br from-card to-background p-6 border-b border-border">
            <DialogHeader className="pb-0">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-primary/15 ring-2 ring-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {(customer.full_name || "K").substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-bold text-foreground truncate">
                    {customer.full_name || "Kunde"}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    {customer.readable_id && (
                      <span className="inline-flex items-center bg-secondary rounded-full px-2 py-0.5 text-xs text-muted-foreground font-mono">
                        #{customer.readable_id}
                      </span>
                    )}
                    {customer.city && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {customer.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Payment Rating Dots */}
            {customer.payment_rating && paymentRatingInfo && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground">Zahlungsmoral: {customer.payment_rating}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((dot) => {
                    const rating = customer.payment_rating === 'A' ? 5 : customer.payment_rating === 'B' ? 4 : customer.payment_rating === 'C' ? 3 : customer.payment_rating === 'D' ? 2 : 1;
                    const filled = dot <= rating;
                    const color = rating >= 4 ? "bg-green-400" : rating === 3 ? "bg-amber-400" : "bg-red-400";
                    return (
                      <div 
                        key={dot} 
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          filled ? color : "bg-muted"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <DialogDescription className="sr-only">
              Kunden-Dashboard mit allen Kontaktdaten und Pferden
            </DialogDescription>
          </div>

          <div className="space-y-4 p-6 pt-4">
            {/* Location Map */}
            {customer.geo_lat && customer.geo_lng ? (
              <CustomerLocationMap 
                latitude={customer.geo_lat} 
                longitude={customer.geo_lng}
                customerName={customer.full_name || "Kunde"}
              />
            ) : (
              <CustomerLocationPlaceholder />
            )}

            {/* Quick Actions - 4 große Buttons */}
            <CustomerQuickActions
              phone={customer.phone_mobile || customer.phone}
              email={customer.email}
              latitude={customer.geo_lat}
              longitude={customer.geo_lng}
              street={customer.street}
              zipCode={customer.zip_code}
              city={customer.city}
              customerName={customer.full_name}
            />

            {/* Ghost Profile Banner - shown for non-registered clients */}
            {!customer.has_logged_in && (
              <GhostProfileBanner
                clientId={customer.id}
                clientName={customer.full_name}
                clientPhone={customer.phone_mobile || customer.phone}
                clientEmail={customer.email}
                horseName={horses[0]?.name}
              />
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Stammdaten</h3>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      initEditForm();
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Abbrechen
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateCustomer.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid gap-4">
                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Vorname</Label>
                      <Input
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        placeholder="Max"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nachname</Label>
                      <Input
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        placeholder="Mustermann"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Anzeigename</Label>
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </div>

                  {/* Kontakt */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-Mail</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon (Mobil)</Label>
                      <Input
                        value={editForm.phone_mobile || editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone_mobile: e.target.value, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon (Festnetz)</Label>
                    <Input
                      value={editForm.phone_landline}
                      onChange={(e) => setEditForm({ ...editForm, phone_landline: e.target.value })}
                    />
                  </div>

                  {/* Adresse */}
                  <AddressGeocoder
                    street={editForm.street}
                    zipCode={editForm.zip_code}
                    city={editForm.city}
                    geoLat={editForm.geo_lat}
                    geoLng={editForm.geo_lng}
                    onStreetChange={(value) => setEditForm({ ...editForm, street: value })}
                    onZipCodeChange={(value) => setEditForm({ ...editForm, zip_code: value })}
                    onCityChange={(value) => setEditForm({ ...editForm, city: value })}
                    onGeoChange={(lat, lng) => setEditForm({ ...editForm, geo_lat: lat, geo_lng: lng })}
                    showMiniMap={true}
                  />
                  
                  {/* Business-Infos (Collapsible) */}
                  <Collapsible open={businessInfoOpen} onOpenChange={setBusinessInfoOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Business-Infos
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${businessInfoOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                      {/* Kundentyp & Status */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            Kundentyp
                          </Label>
                          <Select
                            value={editForm.client_type}
                            onValueChange={(v) => setEditForm({ ...editForm, client_type: v as ClientType })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLIENT_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Kundenstatus</Label>
                          <Select
                            value={editForm.lifecycle_status}
                            onValueChange={(v) => setEditForm({ ...editForm, lifecycle_status: v as LifecycleStatus })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {LIFECYCLE_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Zahlungsmoral & Zuverlässigkeit */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Zahlungsmoral
                          </Label>
                          <Select
                            value={editForm.payment_rating}
                            onValueChange={(v) => setEditForm({ ...editForm, payment_rating: v as PaymentRating })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auswählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_RATING_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className={opt.textColor}>{opt.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Zuverlässigkeit
                          </Label>
                          <Select
                            value={editForm.reliability_score?.toString() || ""}
                            onValueChange={(v) => setEditForm({ ...editForm, reliability_score: v ? parseInt(v) : null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Bewerten" />
                            </SelectTrigger>
                            <SelectContent>
                              {RELIABILITY_SCORE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Preisgruppe */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Tags className="h-3 w-3" />
                          Kundenpreisgruppe
                        </Label>
                        <Select
                          value={editForm.price_group}
                          onValueChange={(v) => setEditForm({ ...editForm, price_group: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_GROUPS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Arbeitsbedingungen */}
                      <div className="space-y-2">
                        <Label>Arbeitsbedingungen vor Ort</Label>
                        <Textarea
                          placeholder="z.B. Gut beleuchtet, befestigter Untergrund, matschig bei Regen..."
                          value={editForm.working_conditions}
                          onChange={(e) => setEditForm({ ...editForm, working_conditions: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Auftragserteilung */}
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <input
                          type="checkbox"
                          id="order_auth"
                          checked={editForm.order_authorization}
                          onChange={(e) => setEditForm({ ...editForm, order_authorization: e.target.checked })}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="order_auth" className="cursor-pointer">
                          Auftragserteilung liegt vor
                        </Label>
                      </div>
                      
                      {/* Business Customer Toggle */}
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="is_business"
                            checked={editForm.is_business}
                            onChange={(e) => setEditForm({ ...editForm, is_business: e.target.checked })}
                            className="h-4 w-4 rounded border-border"
                          />
                          <Label htmlFor="is_business" className="cursor-pointer flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Geschäftskunde (B2B)
                          </Label>
                        </div>
                        
                        {editForm.is_business && (
                          <div className="space-y-2 pl-7">
                            <Label>USt-IdNr.</Label>
                            <Input
                              placeholder="DE123456789"
                              value={editForm.vat_id}
                              onChange={(e) => setEditForm({ ...editForm, vat_id: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Kontakt */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {customer.email}
                      </span>
                    )}
                    {(customer.phone_mobile || customer.phone) && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {customer.phone_mobile || customer.phone}
                      </span>
                    )}
                    {customer.phone_landline && (
                      <span className="flex items-center gap-1 text-xs">
                        (Festnetz: {customer.phone_landline})
                      </span>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <ClientBadges 
                      paymentRating={customer.payment_rating}
                      lifecycleStatus={customer.lifecycle_status}
                      size="sm"
                    />
                    {customer.reliability_score && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" />
                        {RELIABILITY_SCORE_OPTIONS.find(o => o.value === customer.reliability_score)?.label || `${customer.reliability_score}/5`}
                      </Badge>
                    )}
                    {customer.order_authorization && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                        <Check className="h-3 w-3" />
                        Auftragserteilung
                      </Badge>
                    )}
                    {contactData?.is_business && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        B2B
                        {contactData.vat_id && <span className="ml-1 font-mono text-xs">({contactData.vat_id})</span>}
                      </Badge>
                    )}
                  </div>

                  {/* Arbeitsbedingungen */}
                  {customer.working_conditions && (
                    <div className="text-sm p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Arbeitsbedingungen:</span>{" "}
                      {customer.working_conditions}
                    </div>
                  )}
                  
                  {/* Address display with navigation & GPS status */}
                  {(customer.street || customer.zip_code || customer.city) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[
                            customer.street && customer.house_number 
                              ? `${customer.street} ${customer.house_number}` 
                              : customer.street,
                            `${customer.zip_code || ''} ${customer.city || ''}`.trim(),
                            customer.state
                          ].filter(Boolean).join(', ')}
                        </span>
                        {hasCompleteAddress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-primary"
                            onClick={() => openAddressNavigation(customer.street!, customer.zip_code!, customer.city!)}
                          >
                            <Navigation className="h-3.5 w-3.5 mr-1" />
                            Route
                          </Button>
                        )}
                      </div>
                      {/* GPS Status indicator */}
                      <div className="flex items-center gap-2">
                        {customer.geo_lat && customer.geo_lng ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30">
                              <Check className="h-2.5 w-2.5 text-green-600" />
                            </div>
                            <span className="text-green-600">GPS verfügbar</span>
                            <span className="text-muted-foreground font-mono">
                              ({customer.geo_lat.toFixed(4)}, {customer.geo_lng.toFixed(4)})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
                              <X className="h-2.5 w-2.5 text-amber-600" />
                            </div>
                            <span className="text-amber-600">Kein GPS - Bearbeiten zum Ermitteln</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Die Kunden-ID <strong className="font-mono">#{customer.readable_id}</strong> ist unveränderbar und eindeutig.
              </p>
            </div>

            {/* Tabs for Horses, Invoices, and Documents */}
            <Tabs defaultValue="horses" className="w-full">
              <TabsList className="w-full border-b border-border bg-transparent p-0 h-auto rounded-none">
                <TabsTrigger value="horses" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-4 py-2">
                  🐴 Pferde ({horses.length})
                </TabsTrigger>
                <TabsTrigger value="invoices" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-4 py-2">
                  <FileText className="h-4 w-4 mr-1" />
                  Rechnungen
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-4 py-2">
                  <FileText className="h-4 w-4 mr-1" />
                  Dokumente
                </TabsTrigger>
              </TabsList>

              <TabsContent value="horses" className="space-y-4 mt-4">
                <CustomerHorseCards 
                  horses={horses.map(h => ({
                    ...h,
                    photo_url: undefined, // Add if available
                    last_appointment_date: undefined, // Add if available
                    shoeing_interval: undefined, // Add if available
                    hoof_details: undefined, // Add if available
                  }))}
                  onAddHorse={() => onAddHorse(customer.id)}
                  onEditHorse={(horseId) => setHorseToEditId(horseId)}
                />
                
                {/* Gallery Preview */}
                {horses.length > 0 && (
                  <CustomerGalleryPreview horseIds={horses.map(h => h.id)} />
                )}
              </TabsContent>

              <TabsContent value="invoices" className="mt-4">
                <ClientInvoicesSection 
                  clientId={customer.id}
                  clientName={customer.full_name}
                  horses={horses.map(h => ({ id: h.id, name: h.name }))}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ClientDocumentsTab 
                  clientId={customer.id}
                  clientName={customer.full_name}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Kunde löschen
            </Button>
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Kunde löschen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Der Kunde <strong className="text-foreground">{customer.full_name}</strong> wird gelöscht (Soft-Delete).
                </p>
                <div className="bg-muted/60 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium text-foreground">Was passiert beim Löschen?</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Alle Pferde des Kunden werden archiviert (Soft-Delete)</li>
                    <li>Zukünftige Termine werden automatisch storniert</li>
                    <li>Zugangsberechtigungen werden deaktiviert</li>
                    <li>Vergangene Termine & Rechnungen bleiben erhalten</li>
                    <li>Daten können 90 Tage lang wiederhergestellt werden</li>
                  </ul>
                </div>
                <p className="text-destructive font-medium text-sm">
                  Die ID #{customer.readable_id} wird für 30 Tage gesperrt.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                  <p className="text-foreground font-medium mb-1">💡 Alternativen zum Löschen:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong>Archivieren:</strong> Kundenstatus auf „Inaktiv" setzen</li>
                    <li><strong>Übergeben:</strong> Kunde an Kollegen übertragen (per #PID oder E-Mail)</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Horse Confirmation Dialog */}
      <AlertDialog open={!!horseToDelete} onOpenChange={() => setHorseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Pferd löschen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Das Pferd <strong className="text-foreground">{horseToDelete?.name}</strong> wird gelöscht (Soft-Delete).
                </p>
                <div className="bg-muted/60 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium text-foreground">Was passiert?</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Zukünftige Termine werden storniert</li>
                    <li>Behandlungshistorie bleibt erhalten</li>
                    <li>Daten können 90 Tage lang wiederhergestellt werden</li>
                  </ul>
                </div>
                <p className="text-destructive font-medium text-sm">
                  Die ID #{horseToDelete?.readable_id} wird für 90 Tage gesperrt.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => horseToDelete && deleteHorse.mutate(horseToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProviderHorseEditSheet
        open={!!horseToEditId}
        horseId={horseToEditId}
        onClose={() => setHorseToEditId(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
          queryClient.invalidateQueries({ queryKey: ["horses"] });
        }}
      />
    </>
  );
}
