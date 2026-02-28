import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus, Edit, Clock, Euro, Info, Link2, Trash2, Loader2, DollarSign,
  ShoppingBag, LayoutGrid, ChevronDown, Lightbulb, CheckCircle2, AlertCircle,
  BookOpen, Tag, Layers, GripVertical, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ServicePaymentModal } from "@/components/services/ServicePaymentModal";
import { PRICE_GROUPS } from "@/lib/priceGroups";

// ─── Types ─────────────────────────────────────────────────────────
type BillingType = "standard" | "flat_rate" | "series";
type BookingAction = "direct_book" | "request_only";

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
  sort_order: number | null;
}

interface PriceGroup {
  id: string;
  provider_id: string;
  name: string;
  label: string;
  description?: string;
  is_default: boolean;
  sort_order: number;
}

interface PriceOverride {
  service_id: string;
  price_group: string;
  price: number;
}

// ─── Constants ─────────────────────────────────────────────────────
const categoryOptions = ["Standard", "Beschlag", "Spezial", "Zubehör", "Beratung", "Diagnostik", "Therapie", "Paket"];

const billingTypeLabels: Record<BillingType, string> = {
  standard: "Pro Termin",
  flat_rate: "Pauschal / Abo",
  series: "Serienpaket",
};

const bookingActionLabels: Record<BookingAction, string> = {
  direct_book: "Direkt buchbar",
  request_only: "Nur auf Anfrage",
};

const categoryColors: Record<string, string> = {
  Standard: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Spezial: "bg-amber-500/10 text-amber-600",
  Zubehör: "bg-muted text-muted-foreground",
  Beratung: "bg-emerald-500/10 text-emerald-600",
  Diagnostik: "bg-blue-500/10 text-blue-600",
  Therapie: "bg-violet-500/10 text-violet-600",
  Paket: "bg-rose-500/10 text-rose-600",
};

// ─── Mini Guide Component ──────────────────────────────────────────
function MiniGuide({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer group">
        <Lightbulb className="h-3.5 w-3.5" />
        <span className="group-hover:underline">{title}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function MeinAngebot({ readOnly = false, variant = "provider" }: { readOnly?: boolean; variant?: "provider" | "partner" }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("leistungen");

  // ─── Service State ─────────────────────────────────────────────
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [paymentModalService, setPaymentModalService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", category: "Standard",
    base_price: 0, duration: 60,
    billing_type: "standard" as BillingType,
    booking_action: "direct_book" as BookingAction,
  });

  // ─── Price Group State ─────────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // ─── Data Queries ──────────────────────────────────────────────
  const tableName = variant === "partner" ? "partner_services" : "services";
  const idColumn = variant === "partner" ? "partner_id" : "provider_id";

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: [tableName, user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");
      const { data, error } = await supabase
        .from(tableName as any).select("*")
        .eq(idColumn, user.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order(variant === "partner" ? "name" : "created_at");
      if (error) throw error;
      // Normalize partner_services to match Service interface
      if (variant === "partner") {
        return (data as any[]).map((s: any) => ({
          ...s,
          base_price: s.base_price || 0,
          billing_type: "standard" as BillingType,
          booking_action: "direct_book" as BookingAction,
          category: s.category || "Standard",
        })) as Service[];
      }
      return data as unknown as Service[];
    },
    enabled: !!user,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["price-groups"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("price_groups").select("*")
        .eq("provider_id", user.id);
      if (error) throw error;
      return (data as PriceGroup[]) || [];
    },
    enabled: !!user,
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["price-overrides-all"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("service_price_overrides").select("service_id, price_group, price")
        .eq("provider_id", user.id);
      if (error) throw error;
      return (data as PriceOverride[]) || [];
    },
    enabled: !!user,
  });

  // ─── Service Mutations ────────────────────────────────────────
  const createService = useMutation({
    mutationFn: async (data: typeof serviceForm) => {
      if (!user) throw new Error("Nicht angemeldet");
      const payload = variant === "partner"
        ? { name: data.name, description: data.description || null, base_price: data.base_price || null, duration: data.duration || null, category: data.category || null, is_active: true, partner_id: user.id }
        : { ...data, is_active: true, provider_id: user.id };
      const { error } = await supabase.from(tableName as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast({ title: "Leistung erstellt ✓" });
      closeServiceDialog();
    },
    onError: () => toast({ title: "Fehler beim Erstellen", variant: "destructive" }),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const updateData = variant === "partner"
        ? { name: data.name, description: data.description, base_price: data.base_price, duration: data.duration, category: data.category, is_active: data.is_active }
        : data;
      const { error } = await supabase.from(tableName as any).update(updateData as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast({ title: "Leistung aktualisiert ✓" });
      closeServiceDialog();
    },
    onError: () => toast({ title: "Fehler beim Aktualisieren", variant: "destructive" }),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast({ title: "Leistung gelöscht" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from(tableName as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [tableName] }),
  });

  // ─── Price Group Mutations ────────────────────────────────────
  const createGroup = useMutation({
    mutationFn: async () => {
      if (!user || !newGroupName) return;
      const { error } = await supabase.from("price_groups").insert({
        provider_id: user.id, name: newGroupName, description: newGroupDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-groups"] });
      toast({ title: "Preisgruppe erstellt ✓" });
      setNewGroupName(""); setNewGroupDesc(""); setGroupDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-groups"] });
      toast({ title: "Preisgruppe gelöscht" });
    },
  });

  // ─── Price Override Mutation ───────────────────────────────────
  const updateOverride = async (serviceId: string, priceGroup: string, newPrice: number) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from("service_price_overrides").select("id")
        .eq("service_id", serviceId).eq("price_group", priceGroup).maybeSingle();

      if (existing) {
        await supabase.from("service_price_overrides")
          .update({ price: newPrice }).eq("service_id", serviceId).eq("price_group", priceGroup);
      } else {
        await supabase.from("service_price_overrides").insert({
          service_id: serviceId, provider_id: user.id,
          price_group: priceGroup, price: newPrice,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["price-overrides-all"] });
      toast({ title: "Preis gespeichert ✓" });
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const openServiceCreate = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", category: "Standard", base_price: 0, duration: 60, billing_type: "standard", booking_action: "direct_book" });
    setServiceDialogOpen(true);
  };

  const openServiceEdit = (s: Service) => {
    setEditingService(s);
    setServiceForm({
      name: s.name, description: s.description || "", category: s.category,
      base_price: s.base_price, duration: s.duration || 60,
      billing_type: s.billing_type || "standard",
      booking_action: s.booking_action || "direct_book",
    });
    setServiceDialogOpen(true);
  };

  const closeServiceDialog = () => { setServiceDialogOpen(false); setEditingService(null); };

  const handleServiceSubmit = () => {
    if (!serviceForm.name) {
      toast({ title: "Bitte Name eingeben", variant: "destructive" });
      return;
    }
    if (editingService) {
      updateService.mutate({ id: editingService.id, data: serviceForm });
    } else {
      createService.mutate(serviceForm);
    }
  };

  const activeServices = services.filter(s => s.is_active);
  const inactiveServices = services.filter(s => !s.is_active);

  // ─── All price group columns (standard + custom) ──────────────
  const allPriceColumns = [
    ...PRICE_GROUPS,
    ...groups.map(g => ({ value: g.name.toLowerCase().replace(/\s/g, "_"), label: g.name, shortLabel: g.name.slice(0, 3).toUpperCase() })),
  ];

  // ─── Stats ────────────────────────────────────────────────────
  const stats = [
    { label: "Leistungen", value: services.length, icon: ShoppingBag },
    { label: "Aktiv", value: activeServices.length, icon: CheckCircle2 },
    { label: "Preisgruppen", value: PRICE_GROUPS.length + groups.length, icon: Tag },
    { label: "Preisregeln", value: overrides.length, icon: Layers },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Mein Angebot
          </h1>
          <p className="text-muted-foreground mt-1">
            Leistungen, Preisgruppen & Preismatrix – alles an einem Ort
          </p>
        </div>
        {readOnly && (
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" /> Nur Ansicht
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Mini Guide */}
      <MiniGuide title="Wie funktioniert 'Mein Angebot'?">
        <p><strong>1. Leistungen</strong> – Lege alle Dienstleistungen an, die du anbietest (z.B. Barhufbearbeitung, Erstberatung). Jede bekommt einen Basispreis.</p>
        <p><strong>2. Preisgruppen</strong> – Erstelle Kundengruppen (z.B. VIP, Großstall) für unterschiedliche Preise. Kunden werden dann einer Gruppe zugeordnet.</p>
        <p><strong>3. Preismatrix</strong> – Die Übersicht: Welche Leistung kostet wieviel für welche Kundengruppe? Klick auf ein Feld, um den Preis anzupassen.</p>
        <p className="text-primary font-medium mt-1">→ Bei Terminbuchung wird automatisch der richtige Preis angewendet!</p>
      </MiniGuide>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leistungen" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Leistungen</span>
            <span className="sm:hidden">Services</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{services.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="preisgruppen" className="gap-1.5 text-xs sm:text-sm">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Preisgruppen</span>
            <span className="sm:hidden">Gruppen</span>
          </TabsTrigger>
          <TabsTrigger value="preismatrix" className="gap-1.5 text-xs sm:text-sm">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Preismatrix</span>
            <span className="sm:hidden">Matrix</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: LEISTUNGEN ═══════════ */}
        <TabsContent value="leistungen" className="space-y-4">
          <div className="flex items-center justify-between">
            <MiniGuide title="Tipps: Leistungen anlegen">
              <p>• Verwende klare Namen die auch der Kunde versteht</p>
              <p>• Kategorien helfen dir bei der Filterung auf der Rechnung</p>
              <p>• "Nur Anfrage" = Kunde muss erst anfragen statt direkt zu buchen</p>
              <p>• "Pauschal/Abo" = Termin wird bei 0€ gebucht, da extern bezahlt</p>
            </MiniGuide>
            {!readOnly && (
              <Button onClick={openServiceCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Neue Leistung
              </Button>
            )}
          </div>

          {servicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium text-foreground">Noch keine Leistungen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Erstelle deine erste Leistung – z.B. "Barhufbearbeitung" mit Preis und Dauer.
                </p>
                {!readOnly && (
                  <Button onClick={openServiceCreate} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Erste Leistung anlegen
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Active Services */}
              {activeServices.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Aktive Leistungen ({activeServices.length})
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        readOnly={readOnly}
                        onEdit={() => openServiceEdit(service)}
                        onToggle={(active) => toggleActive.mutate({ id: service.id, is_active: active })}
                        onDelete={() => deleteService.mutate(service.id)}
                        onPaymentLink={() => setPaymentModalService(service)}
                        overrideCount={overrides.filter(o => o.service_id === service.id).length}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Services */}
              {inactiveServices.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <EyeOff className="h-3 w-3" />
                    Inaktive Leistungen ({inactiveServices.length})
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      {inactiveServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          readOnly={readOnly}
                          onEdit={() => openServiceEdit(service)}
                          onToggle={(active) => toggleActive.mutate({ id: service.id, is_active: active })}
                          onDelete={() => deleteService.mutate(service.id)}
                          onPaymentLink={() => setPaymentModalService(service)}
                          overrideCount={overrides.filter(o => o.service_id === service.id).length}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ TAB 2: PREISGRUPPEN ═══════════ */}
        <TabsContent value="preisgruppen" className="space-y-4">
          <div className="flex items-center justify-between">
            <MiniGuide title="Wozu Preisgruppen?">
              <p>• Verschiedene Kunden = verschiedene Preise (z.B. Großstall-Rabatt)</p>
              <p>• Standard-Gruppen (VIP, Großstall, Individuell) sind vordefiniert</p>
              <p>• Du kannst eigene Gruppen erstellen (z.B. "Vereinskunden")</p>
              <p>• Kunden werden in der Kundenakte einer Gruppe zugeordnet</p>
              <p className="text-primary font-medium">→ In der Preismatrix legst du dann die Preise pro Gruppe fest</p>
            </MiniGuide>
            {!readOnly && (
              <Button onClick={() => setGroupDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Neue Gruppe
              </Button>
            )}
          </div>

          {/* Standard Groups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Standard-Preisgruppen
              </CardTitle>
              <CardDescription>Diese Gruppen sind immer verfügbar und können nicht gelöscht werden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRICE_GROUPS.map(pg => (
                  <div key={pg.value} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{pg.shortLabel}</Badge>
                      <span className="font-medium text-sm">{pg.label}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">System</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Groups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Eigene Preisgruppen
              </CardTitle>
              <CardDescription>Erstelle individuelle Gruppen für deine Kunden</CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : groups.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Noch keine eigenen Gruppen</p>
                  <p className="text-xs mt-1">Die Standard-Gruppen reichen für die meisten Fälle aus.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        {g.label && <p className="text-xs text-muted-foreground">{g.label}</p>}
                      </div>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => deleteGroup.mutate(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 3: PREISMATRIX ═══════════ */}
        <TabsContent value="preismatrix" className="space-y-4">
          <MiniGuide title="So funktioniert die Preismatrix">
            <p>• Jede Zeile = eine Leistung, jede Spalte = eine Preisgruppe</p>
            <p>• <strong>Klick auf ein Feld</strong> um den Preis für diese Kombination zu setzen</p>
            <p>• Leere Felder = es gilt der Basispreis (Standard)</p>
            <p>• Orange markierte Preise = angepasster Gruppenpreis</p>
            <p className="text-primary font-medium">→ Bei Terminbuchung erkennt das System die Kundengruppe und wählt den richtigen Preis!</p>
          </MiniGuide>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Preismatrix
              </CardTitle>
              <CardDescription>
                {activeServices.length} aktive Leistungen × {allPriceColumns.length} Preisgruppen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Erstelle zuerst Leistungen im Tab "Leistungen"</p>
                  <Button variant="link" onClick={() => setActiveTab("leistungen")} className="mt-2">
                    → Zum Leistungs-Tab
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <div className="min-w-[600px] px-6">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Leistung</TableHead>
                          <TableHead className="text-right min-w-[80px]">Basis €</TableHead>
                          {allPriceColumns.filter(c => c.value !== "standard").map(col => (
                            <TableHead key={col.value} className="text-center min-w-[90px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-[10px]">{col.shortLabel}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>{col.label}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeServices.map(service => (
                          <TableRow key={service.id}>
                            <TableCell className="font-medium">{service.name}</TableCell>
                            <TableCell className="text-right font-mono">{service.base_price.toFixed(2)}</TableCell>
                            {allPriceColumns.filter(c => c.value !== "standard").map(col => {
                              const override = overrides.find(
                                o => o.service_id === service.id && o.price_group === col.value
                              );
                              return (
                                <TableCell key={col.value} className="text-center">
                                  {readOnly ? (
                                    <span className={cn("text-xs font-mono", override ? "text-primary font-bold" : "text-muted-foreground")}>
                                      {override ? `${override.price.toFixed(2)}` : "–"}
                                    </span>
                                  ) : (
                                    <PriceCell
                                      currentPrice={override?.price}
                                      basePrice={service.base_price}
                                      onSave={(price) => updateOverride(service.id, col.value, price)}
                                    />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════ SERVICE DIALOG ═══════════ */}
      {!readOnly && (
        <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? "Leistung bearbeiten" : "Neue Leistung"}</DialogTitle>
              <DialogDescription>
                {editingService ? "Ändere die Details deiner Leistung" : "Definiere eine neue Dienstleistung mit Preis und Einstellungen"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Barhufbearbeitung" />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Kurze Beschreibung für Kunden" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={serviceForm.category} onValueChange={v => setServiceForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Basispreis (€)</Label>
                  <Input type="number" step="0.01" value={serviceForm.base_price} onChange={e => setServiceForm(f => ({ ...f, base_price: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Dauer (Min.)</Label>
                  <Input type="number" value={serviceForm.duration} onChange={e => setServiceForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Abrechnungsart</Label>
                  <Select value={serviceForm.billing_type} onValueChange={(v: BillingType) => setServiceForm(f => ({ ...f, billing_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Pro Termin</SelectItem>
                      <SelectItem value="flat_rate">Pauschal / Abo / Extern</SelectItem>
                      <SelectItem value="series">Teil eines Pakets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Buchungsoption</Label>
                <Select value={serviceForm.booking_action} onValueChange={(v: BookingAction) => setServiceForm(f => ({ ...f, booking_action: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_book">Direkt buchbar (Kunde wählt Termin)</SelectItem>
                    <SelectItem value="request_only">Nur auf Anfrage (Kunde schickt Anfrage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {serviceForm.billing_type === "flat_rate" && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                  💡 Termine mit diesem Service werden bei 0€ gebucht und als "intern bezahlt" markiert.
                </div>
              )}
              {serviceForm.billing_type === "series" && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                  💡 Bei Terminen kannst du "Termin X von Y" angeben. Dies erscheint auf der Rechnung.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeServiceDialog}>Abbrechen</Button>
              <Button onClick={handleServiceSubmit} disabled={createService.isPending || updateService.isPending}>
                {(createService.isPending || updateService.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingService ? "Speichern" : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Group Dialog */}
      {!readOnly && (
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Preisgruppe</DialogTitle>
              <DialogDescription>Erstelle eine eigene Kundengruppe mit individuellem Pricing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="z.B. Vereinskunden" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input placeholder="z.B. 10% Rabatt für Reitverein-Mitglieder" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={() => createGroup.mutate()} disabled={!newGroupName || createGroup.isPending}>
                {createGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Modal */}
      <ServicePaymentModal
        isOpen={!!paymentModalService}
        onClose={() => setPaymentModalService(null)}
        service={paymentModalService}
      />
    </div>
  );
}

// ─── Service Card Component ────────────────────────────────────────
function ServiceCard({ service, readOnly, onEdit, onToggle, onDelete, onPaymentLink, overrideCount }: {
  service: Service;
  readOnly: boolean;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onPaymentLink: () => void;
  overrideCount: number;
}) {
  return (
    <Card className={cn("hover:shadow-sm transition-all", !service.is_active && "opacity-50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate">{service.name}</p>
              <Badge className={cn("text-[10px] shrink-0", categoryColors[service.category] || "bg-muted text-muted-foreground")}>
                {service.category}
              </Badge>
              {service.billing_type === "flat_rate" && (
                <Badge className="text-[10px] bg-violet-500/10 text-violet-600 shrink-0">Pauschal</Badge>
              )}
              {service.billing_type === "series" && (
                <Badge className="text-[10px] bg-blue-500/10 text-blue-600 shrink-0">Paket</Badge>
              )}
              {service.booking_action === "request_only" && (
                <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300 shrink-0">Anfrage</Badge>
              )}
            </div>
            {service.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                <Euro className="h-3.5 w-3.5 text-primary" /> {service.base_price.toFixed(2)}
              </span>
              {service.duration && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {service.duration} Min.
                </span>
              )}
              {overrideCount > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Tag className="h-2.5 w-2.5" /> {overrideCount} Preisregeln
                </Badge>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={service.is_active ?? false}
                onCheckedChange={onToggle}
                className="scale-90"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPaymentLink}>
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inline Price Edit Cell ────────────────────────────────────────
function PriceCell({ currentPrice, basePrice, onSave }: {
  currentPrice?: number;
  basePrice: number;
  onSave: (price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentPrice?.toString() || "");

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === "Enter" && handleSave()}
        className="h-7 w-20 text-xs text-center mx-auto"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setValue(currentPrice?.toString() || basePrice.toString()); setEditing(true); }}
      className="text-xs font-mono p-1 hover:bg-muted rounded transition-colors cursor-pointer"
    >
      {currentPrice != null ? (
        <span className="text-primary font-bold">{currentPrice.toFixed(2)}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )}
    </button>
  );
}
