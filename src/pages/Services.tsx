import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Edit, Clock, Euro, Info, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServicePaymentModal } from "@/components/services/ServicePaymentModal";
import { GroupPricingSection } from "@/components/services/GroupPricingSection";
import { useTaxConfig } from "@/hooks/useTaxConfig";
import { formatPriceLabel, calculateDisplayPrice, VAT_RATES } from "@/lib/taxConfig";

const categoryColors: Record<string, string> = {
  Standard: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Spezial: "bg-amber-500/10 text-amber-600",
  Zubehör: "bg-muted text-muted-foreground",
};

type BillingType = 'standard' | 'flat_rate' | 'series';
type BookingAction = 'direct_book' | 'request_only';

const billingTypeLabels: Record<BillingType, string> = {
  standard: "Standard",
  flat_rate: "Pauschal/Abo",
  series: "Serienpaket",
};

const billingTypeColors: Record<BillingType, string> = {
  standard: "bg-accent/10 text-accent",
  flat_rate: "bg-purple-500/10 text-purple-600",
  series: "bg-blue-500/10 text-blue-600",
};

const bookingActionLabels: Record<BookingAction, string> = {
  direct_book: "Direkt buchen",
  request_only: "Nur Anfrage",
};

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  duration: number | null;
  is_active: boolean | null;
  billing_type: BillingType;
  booking_action: BookingAction;
}

const Services = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [paymentModalService, setPaymentModalService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Standard",
    base_price: 0,
    duration: 60,
    billing_type: "standard" as BillingType,
    booking_action: "direct_book" as BookingAction,
  });
  const queryClient = useQueryClient();
  const taxConfig = useTaxConfig();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, base_price, duration, is_active, booking_action, provider_id, created_at, category, billing_type")
        .eq("provider_id", user.id)
        .order("created_at");
      if (error) throw error;
      return data as Service[];
    },
  });

  const createService = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("services").insert({
        ...data,
        is_active: true,
        provider_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Erfolg", description: "Service wurde erstellt." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Service konnte nicht erstellt werden.", variant: "destructive" });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const { error } = await supabase.from("services").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Erfolg", description: "Service wurde aktualisiert." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Service konnte nicht aktualisiert werden.", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData({ name: "", description: "", category: "Standard", base_price: 0, duration: 60, billing_type: "standard", booking_action: "direct_book" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category,
      base_price: service.base_price,
      duration: service.duration || 60,
      billing_type: service.billing_type || "standard",
      booking_action: service.booking_action || "direct_book",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen Namen ein.", variant: "destructive" });
      return;
    }
    if (editingService) {
      updateService.mutate({ id: editingService.id, data: formData });
    } else {
      createService.mutate(formData);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Services
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Dein Leistungskatalog. Hier legst du einmalig deine Standard-Preise an (z.B. 'Barhufbearbeitung', 'Eisen abnehmen'), um sie schnell in Rechnungen einzufügen.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre angebotenen Dienstleistungen
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Neuer Service
        </Button>
      </div>

      <div className="grid gap-4">
        {services.map((service, index) => (
          <Card
            key={service.id}
            className={cn("animate-slide-up", !service.is_active && "opacity-60")}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                    <Badge className={cn("font-medium", categoryColors[service.category])}>
                      {service.category}
                    </Badge>
                    {service.billing_type && service.billing_type !== "standard" && (
                      <Badge className={cn("font-medium", billingTypeColors[service.billing_type])}>
                        {billingTypeLabels[service.billing_type]}
                      </Badge>
                    )}
                    {service.booking_action === "request_only" && (
                      <Badge variant="outline" className="font-medium text-orange-600 border-orange-300">
                        Nur Anfrage
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <Euro className="h-4 w-4 text-primary" />
                      {formatPriceLabel(service.base_price, taxConfig)}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      ca. {service.duration} Min.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Aktiv</span>
                    <Switch
                      checked={service.is_active ?? false}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: service.id, is_active: checked })
                      }
                    />
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setPaymentModalService(service)}
                          className="text-muted-foreground hover:text-[#F47B20]"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>CopeCart-Verknüpfung</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Service bearbeiten" : "Neuer Service"}</DialogTitle>
            <DialogDescription>
              {editingService ? "Bearbeiten Sie die Service-Details" : "Erstellen Sie einen neuen Service"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Service-Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Service-Beschreibung"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Beschlag">Beschlag</SelectItem>
                    <SelectItem value="Spezial">Spezial</SelectItem>
                    <SelectItem value="Zubehör">Zubehör</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preis (€ {taxConfig.priceDisplayMode === "brutto" ? "brutto" : "netto"})</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                />
                {taxConfig.mwstPflichtig && !taxConfig.kleinunternehmer && formData.base_price > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {calculateDisplayPrice(formData.base_price, taxConfig, taxConfig.priceDisplayMode === "netto" ? "brutto" : "netto").toFixed(2)} € {taxConfig.priceDisplayMode === "netto" ? "brutto" : "netto"} ({taxConfig.vatRate}% {VAT_RATES[taxConfig.country]?.label || "MwSt"})
                  </p>
                )}
                {taxConfig.kleinunternehmer && (
                  <p className="text-xs text-muted-foreground">
                    Kleinunternehmer: Netto = Brutto (keine MwSt).
                  </p>
                )}
                {!taxConfig.kleinunternehmer && !taxConfig.mwstPflichtig && (
                  <p className="text-xs text-muted-foreground">
                    MwSt wird auf der Rechnung berechnet.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dauer (Minuten)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Abrechnungsart</Label>
                <Select
                  value={formData.billing_type}
                  onValueChange={(value: BillingType) => setFormData({ ...formData, billing_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (Preis pro Termin)</SelectItem>
                    <SelectItem value="flat_rate">Pauschal / Abo / Extern</SelectItem>
                    <SelectItem value="series">Teil eines Pakets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Buchungsoption</Label>
              <Select
                value={formData.booking_action}
                onValueChange={(value: BookingAction) => setFormData({ ...formData, booking_action: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_book">Direkt buchen (Kunde wählt Termin)</SelectItem>
                  <SelectItem value="request_only">Nur Anfrage (Kunde schickt Anfrage)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.billing_type === "flat_rate" && (
              <p className="text-sm text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                💡 Termine mit diesem Service werden automatisch auf 0,00€ gesetzt aber als "intern bezahlt" markiert.
              </p>
            )}

            {formData.billing_type === "series" && (
              <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                💡 Bei Terminen können Sie "Termin X von Y" angeben. Dies erscheint auf der Rechnung.
              </p>
            )}

            {/* Group Pricing - only for existing services */}
            {editingService && (
              <GroupPricingSection
                serviceId={editingService.id}
                basePrice={formData.base_price}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
              {editingService ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Payment Modal */}
      <ServicePaymentModal
        isOpen={!!paymentModalService}
        onClose={() => setPaymentModalService(null)}
        service={paymentModalService}
      />
    </div>
  );
};

export default Services;
