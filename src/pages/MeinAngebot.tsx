import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Edit,
  Clock,
  Euro,
  Link2,
  Trash2,
  Loader2,
  DollarSign,
  ShoppingBag,
  LayoutGrid,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Tag,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ServicePaymentModal } from "@/components/services/ServicePaymentModal";
import { PRICE_GROUPS } from "@/lib/priceGroups";
import { HelpTip } from "@/components/ui/HelpTip";

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

const categoryOptions = [
  "Standard",
  "Beschlag",
  "Spezial",
  "Zubehör",
  "Beratung",
  "Diagnostik",
  "Therapie",
  "Paket",
];

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

export default function MeinAngebot({
  readOnly = false,
  variant = "provider",
}: {
  readOnly?: boolean;
  variant?: "provider" | "partner";
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [advancedPricingOpen, setAdvancedPricingOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState("preisgruppen");

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [paymentModalService, setPaymentModalService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    category: "Standard",
    base_price: 0,
    duration: 60,
    billing_type: "standard" as BillingType,
    booking_action: "direct_book" as BookingAction,
  });

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const tableName = variant === "partner" ? "partner_services" : "services";
  const idColumn = variant === "partner" ? "partner_id" : "provider_id";

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: [tableName, user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(idColumn, user.id)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order(variant === "partner" ? "name" : "created_at");
      if (error) throw error;

      if (variant === "partner") {
        return (data as any[]).map((service: any) => ({
          ...service,
          base_price: service.base_price || 0,
          billing_type: "standard" as BillingType,
          booking_action: "direct_book" as BookingAction,
          category: service.category || "Standard",
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
        .from("price_groups")
        .select("*")
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
        .from("service_price_overrides")
        .select("service_id, price_group, price")
        .eq("provider_id", user.id);
      if (error) throw error;
      return (data as PriceOverride[]) || [];
    },
    enabled: !!user,
  });

  const createService = useMutation({
    mutationFn: async (data: typeof serviceForm) => {
      if (!user) throw new Error("Nicht angemeldet");
      const payload = variant === "partner"
        ? {
            name: data.name,
            description: data.description || null,
            base_price: data.base_price || null,
            duration: data.duration || null,
            category: data.category || null,
            is_active: true,
            partner_id: user.id,
          }
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
        ? {
            name: data.name,
            description: data.description,
            base_price: data.base_price,
            duration: data.duration,
            category: data.category,
            is_active: data.is_active,
          }
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

  const createGroup = useMutation({
    mutationFn: async () => {
      if (!user || !newGroupName) return;
      const { error } = await supabase.from("price_groups").insert({
        provider_id: user.id,
        name: newGroupName,
        description: newGroupDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-groups"] });
      toast({ title: "Preisgruppe erstellt ✓" });
      setNewGroupName("");
      setNewGroupDesc("");
      setGroupDialogOpen(false);
    },
    onError: (error: any) => toast({
      title: "Fehler",
      description: error.message,
      variant: "destructive",
    }),
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

  const updateOverride = async (serviceId: string, priceGroup: string, newPrice: number) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from("service_price_overrides")
        .select("id")
        .eq("service_id", serviceId)
        .eq("price_group", priceGroup)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("service_price_overrides")
          .update({ price: newPrice })
          .eq("service_id", serviceId)
          .eq("price_group", priceGroup);
      } else {
        await supabase.from("service_price_overrides").insert({
          service_id: serviceId,
          provider_id: user.id,
          price_group: priceGroup,
          price: newPrice,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["price-overrides-all"] });
      toast({ title: "Preis gespeichert ✓" });
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
  };

  const openServiceCreate = () => {
    setEditingService(null);
    setServiceForm({
      name: "",
      description: "",
      category: "Standard",
      base_price: 0,
      duration: 60,
      billing_type: "standard",
      booking_action: "direct_book",
    });
    setServiceDialogOpen(true);
  };

  const openServiceEdit = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      category: service.category,
      base_price: service.base_price,
      duration: service.duration || 60,
      billing_type: service.billing_type || "standard",
      booking_action: service.booking_action || "direct_book",
    });
    setServiceDialogOpen(true);
  };

  const closeServiceDialog = () => {
    setServiceDialogOpen(false);
    setEditingService(null);
  };

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

  const activeServices = services.filter((service) => service.is_active);
  const inactiveServices = services.filter((service) => !service.is_active);

  const allPriceColumns = [
    ...PRICE_GROUPS,
    ...groups.map((group) => ({
      value: group.name.toLowerCase().replace(/\s/g, "_"),
      label: group.name,
      shortLabel: group.name.slice(0, 3).toUpperCase(),
    })),
  ];

  return (
    <div className="space-y-5 animate-fade-in sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 shrink-0 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Leistungen & Angebote</h1>
            <HelpTip
              title="Leistungen & Angebote"
              description="Hier pflegst du zuerst deine normalen Leistungen mit Preis und Dauer. Preisgruppen und individuelle Gruppenpreise sind erweiterte Optionen."
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Was bietest du an, wie lange dauert es und was kostet es?
          </p>
        </div>

        <div className="flex items-center gap-2">
          {readOnly ? (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" /> Nur Ansicht
            </Badge>
          ) : (
            <Button onClick={openServiceCreate} className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" /> Neue Leistung
            </Button>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Deine Leistungen</h2>
              <Badge variant="secondary">{activeServices.length} aktiv</Badge>
              {inactiveServices.length > 0 && (
                <span className="text-xs text-muted-foreground">{inactiveServices.length} inaktiv</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Diese Leistungen stehen dir bei Termin und Abrechnung zur Verfügung.
            </p>
          </div>
        </div>

        {servicesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-8 text-center">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium text-foreground">Noch keine Leistungen</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Starte mit deiner häufigsten Leistung – Name, Preis und Dauer reichen zuerst aus.
              </p>
              {!readOnly && (
                <Button onClick={openServiceCreate} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Erste Leistung anlegen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {activeServices.length > 0 && (
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
                    overrideCount={overrides.filter((override) => override.service_id === service.id).length}
                  />
                ))}
              </div>
            )}

            {inactiveServices.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <EyeOff className="h-4 w-4" />
                  Inaktive Leistungen ({inactiveServices.length})
                  <ChevronDown className="h-4 w-4" />
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
                        overrideCount={overrides.filter((override) => override.service_id === service.id).length}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </section>

      <Collapsible open={advancedPricingOpen} onOpenChange={setAdvancedPricingOpen}>
        <div className="rounded-xl border border-border bg-muted/20">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5">
            <span className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">Erweiterte Preisoptionen</span>
                  <Badge variant="outline" className="text-[10px]">Optional</Badge>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  Preisgruppen und unterschiedliche Preise pro Kundengruppe – nur öffnen, wenn du sie wirklich brauchst.
                </span>
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                advancedPricingOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="border-t border-border p-3 sm:p-5">
            <Tabs value={advancedTab} onValueChange={setAdvancedTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:min-w-[360px]">
                <TabsTrigger value="preisgruppen" className="gap-1.5">
                  <Tag className="h-4 w-4" /> Preisgruppen
                </TabsTrigger>
                <TabsTrigger value="preismatrix" className="gap-1.5">
                  <LayoutGrid className="h-4 w-4" /> Preismatrix
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preisgruppen" className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Preisgruppen</h3>
                    <p className="text-xs text-muted-foreground">
                      Nutze Gruppen nur, wenn bestimmte Kunden dauerhaft andere Preise erhalten.
                    </p>
                  </div>
                  {!readOnly && (
                    <Button onClick={() => setGroupDialogOpen(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" /> Neue Gruppe
                    </Button>
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Tag className="h-4 w-4 text-primary" />
                      Standard-Preisgruppen
                    </CardTitle>
                    <CardDescription>
                      Diese Gruppen sind immer verfügbar und können nicht gelöscht werden.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PRICE_GROUPS.map((priceGroup) => (
                        <div
                          key={priceGroup.value}
                          className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {priceGroup.shortLabel}
                            </Badge>
                            <span className="text-sm font-medium">{priceGroup.label}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">System</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Eigene Preisgruppen
                    </CardTitle>
                    <CardDescription>Zusätzliche Gruppen für spezielle Kundenmodelle.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {groupsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : groups.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground">
                        <Tag className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">Keine eigenen Gruppen angelegt</p>
                        <p className="mt-1 text-xs">Für den normalen Start brauchst du hier nichts zu ändern.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                          >
                            <div>
                              <p className="text-sm font-medium">{group.name}</p>
                              {group.label && (
                                <p className="text-xs text-muted-foreground">{group.label}</p>
                              )}
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteGroup.mutate(group.id)}
                              >
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

              <TabsContent value="preismatrix" className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Preismatrix</h3>
                  <p className="text-xs text-muted-foreground">
                    Leere Felder nutzen automatisch den Basispreis. Nur abweichende Gruppenpreise musst du eintragen.
                  </p>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      Preise pro Kundengruppe
                    </CardTitle>
                    <CardDescription>
                      {activeServices.length} aktive Leistungen × {allPriceColumns.length} Preisgruppen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeServices.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">Lege zuerst oben mindestens eine aktive Leistung an.</p>
                      </div>
                    ) : (
                      <div className="-mx-6 overflow-x-auto">
                        <div className="min-w-[600px] px-6">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[140px]">Leistung</TableHead>
                                <TableHead className="min-w-[80px] text-right">Basis €</TableHead>
                                {allPriceColumns.filter((column) => column.value !== "standard").map((column) => (
                                  <TableHead key={column.value} className="min-w-[90px] text-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="text-[10px]">
                                            {column.shortLabel}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>{column.label}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeServices.map((service) => (
                                <TableRow key={service.id}>
                                  <TableCell className="font-medium">{service.name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {service.base_price.toFixed(2)}
                                  </TableCell>
                                  {allPriceColumns.filter((column) => column.value !== "standard").map((column) => {
                                    const override = overrides.find(
                                      (item) => item.service_id === service.id && item.price_group === column.value,
                                    );
                                    return (
                                      <TableCell key={column.value} className="text-center">
                                        {readOnly ? (
                                          <span className={cn(
                                            "text-xs font-mono",
                                            override ? "font-bold text-primary" : "text-muted-foreground",
                                          )}>
                                            {override ? override.price.toFixed(2) : "–"}
                                          </span>
                                        ) : (
                                          <PriceCell
                                            currentPrice={override?.price}
                                            basePrice={service.base_price}
                                            onSave={(price) => updateOverride(service.id, column.value, price)}
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
          </CollapsibleContent>
        </div>
      </Collapsible>

      {!readOnly && (
        <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? "Leistung bearbeiten" : "Neue Leistung"}</DialogTitle>
              <DialogDescription>
                Name, Preis und Dauer reichen für den normalen Start. Weitere Einstellungen kannst du bei Bedarf ergänzen.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  className="min-h-11"
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((form) => ({ ...form, name: event.target.value }))}
                  placeholder="z.B. Barhufbearbeitung"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Basispreis (€)</Label>
                  <Input
                    className="min-h-11"
                    type="number"
                    step="0.01"
                    value={serviceForm.base_price}
                    onChange={(event) => setServiceForm((form) => ({
                      ...form,
                      base_price: Number(event.target.value),
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dauer (Min.)</Label>
                  <Input
                    className="min-h-11"
                    type="number"
                    value={serviceForm.duration}
                    onChange={(event) => setServiceForm((form) => ({
                      ...form,
                      duration: Number(event.target.value),
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))}
                  rows={2}
                  placeholder="Kurze Beschreibung für Kunden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select
                    value={serviceForm.category}
                    onValueChange={(value) => setServiceForm((form) => ({ ...form, category: value }))}
                  >
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Abrechnungsart</Label>
                  <Select
                    value={serviceForm.billing_type}
                    onValueChange={(value: BillingType) => setServiceForm((form) => ({
                      ...form,
                      billing_type: value,
                    }))}
                  >
                    <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
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
                <Select
                  value={serviceForm.booking_action}
                  onValueChange={(value: BookingAction) => setServiceForm((form) => ({
                    ...form,
                    booking_action: value,
                  }))}
                >
                  <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_book">Direkt buchbar (Kunde wählt Termin)</SelectItem>
                    <SelectItem value="request_only">Nur auf Anfrage (Kunde schickt Anfrage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {serviceForm.billing_type === "flat_rate" && (
                <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                  Termine mit diesem Service werden bei 0 € gebucht und als intern bezahlt markiert.
                </div>
              )}
              {serviceForm.billing_type === "series" && (
                <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                  Bei Terminen kannst du „Termin X von Y“ angeben. Dies erscheint auf der Rechnung.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeServiceDialog} className="w-full sm:w-auto">
                Abbrechen
              </Button>
              <Button
                onClick={handleServiceSubmit}
                disabled={createService.isPending || updateService.isPending}
                className="w-full sm:w-auto"
              >
                {(createService.isPending || updateService.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingService ? "Speichern" : "Leistung erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!readOnly && (
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Preisgruppe</DialogTitle>
              <DialogDescription>
                Nur nötig, wenn eine Kundengruppe dauerhaft einen eigenen Preis erhalten soll.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  className="min-h-11"
                  placeholder="z.B. Vereinskunden"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  className="min-h-11"
                  placeholder="z.B. Sonderpreis für Reitverein-Mitglieder"
                  value={newGroupDesc}
                  onChange={(event) => setNewGroupDesc(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setGroupDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => createGroup.mutate()}
                disabled={!newGroupName || createGroup.isPending}
                className="w-full sm:w-auto"
              >
                {createGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ServicePaymentModal
        isOpen={!!paymentModalService}
        onClose={() => setPaymentModalService(null)}
        service={paymentModalService}
      />
    </div>
  );
}

function ServiceCard({
  service,
  readOnly,
  onEdit,
  onToggle,
  onDelete,
  onPaymentLink,
  overrideCount,
}: {
  service: Service;
  readOnly: boolean;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onPaymentLink: () => void;
  overrideCount: number;
}) {
  return (
    <Card className={cn("transition-all hover:shadow-sm", !service.is_active && "opacity-50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{service.name}</p>
              <Badge className={cn(
                "shrink-0 text-[10px]",
                categoryColors[service.category] || "bg-muted text-muted-foreground",
              )}>
                {service.category}
              </Badge>
              {service.billing_type === "flat_rate" && (
                <Badge className="shrink-0 bg-violet-500/10 text-[10px] text-violet-600">Pauschal</Badge>
              )}
              {service.billing_type === "series" && (
                <Badge className="shrink-0 bg-blue-500/10 text-[10px] text-blue-600">Paket</Badge>
              )}
              {service.booking_action === "request_only" && (
                <Badge variant="outline" className="shrink-0 border-orange-300 text-[10px] text-orange-600">
                  Anfrage
                </Badge>
              )}
            </div>

            {service.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                <Euro className="h-3.5 w-3.5 text-primary" /> {service.base_price.toFixed(2)}
              </span>
              {service.duration && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {service.duration} Min.
                </span>
              )}
              {overrideCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Tag className="h-2.5 w-2.5" /> {overrideCount} Preisregeln
                </Badge>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PriceCell({
  currentPrice,
  basePrice,
  onSave,
}: {
  currentPrice?: number;
  basePrice: number;
  onSave: (price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentPrice?.toString() || "");

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed) && parsed >= 0) {
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
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleSave}
        onKeyDown={(event) => event.key === "Enter" && handleSave()}
        className="mx-auto h-7 w-20 text-center text-xs"
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(currentPrice?.toString() || basePrice.toString());
        setEditing(true);
      }}
      className="cursor-pointer rounded p-1 font-mono text-xs transition-colors hover:bg-muted"
    >
      {currentPrice != null ? (
        <span className="font-bold text-primary">{currentPrice.toFixed(2)}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )}
    </button>
  );
}
