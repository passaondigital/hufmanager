import { useState, useCallback, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon, Play, ExternalLink, Star, RefreshCw, Clock, Gift, Package, Calculator, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/ui/HelpTip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OfferPreviewPanel } from "@/components/landing/OfferPreviewPanel";
import { OfferRecipeEditor } from "@/components/offers/OfferRecipeEditor";
import { OfferStockBadge } from "@/components/offers/OfferStockBadge";
import { useOfferMaterials } from "@/hooks/useOfferMaterials";
import { useTaxConfig } from "@/hooks/useTaxConfig";

// Extract YouTube video ID from URL
const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

const priceTypeLabels: Record<string, string> = {
  fest: "Festpreis",
  ab: "Ab",
  auf_anfrage: "Auf Anfrage",
};

const BILLING_TYPES = [
  { value: "einmalig", label: "Einmalig", icon: null },
  { value: "abo", label: "Abo", icon: <RefreshCw className="h-3 w-3" /> },
  { value: "stuendlich", label: "Stündlich", icon: <Clock className="h-3 w-3" /> },
  { value: "kostenlos", label: "Kostenlos", icon: <Gift className="h-3 w-3" /> },
];

const BILLING_COLORS: Record<string, string> = {
  einmalig: "bg-muted text-muted-foreground",
  abo: "bg-primary/10 text-primary",
  stuendlich: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  kostenlos: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  is_active: boolean | null;
  offer_type: string | null;
  display_mode: string | null;
  media_url: string | null;
  external_link: string | null;
  sort_order: number | null;
  billing_type: string | null;
  duration_minutes: number | null;
  recommended_tags: string[] | null;
  auto_deduct: boolean | null;
}

interface RecipeMaterial {
  id?: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: {
    id: string;
    product_name: string;
    brand: string | null;
    current_stock: number;
    price_sell: number | null;
    price_purchase: number | null;
    min_stock: number | null;
  };
}

const OFFER_TYPES = [
  { value: "service", label: "Service" },
  { value: "product", label: "Produkt" },
  { value: "digital", label: "Digital" },
  { value: "bundle", label: "Bundle" },
];

const Angebote = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [recipeMaterials, setRecipeMaterials] = useState<RecipeMaterial[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    price_type: "fest",
    features: "",
    offer_type: "service",
    display_mode: "highlight_card",
    media_url: "",
    external_link: "",
    is_highlight: true,
    billing_type: "einmalig",
    duration_minutes: 60,
    recommended_tags: [] as string[],
    auto_deduct: true,
  });
  const queryClient = useQueryClient();
  const taxConfig = useTaxConfig();
  const { materials, setMaterials, saveMaterials } = useOfferMaterials(editingOffer?.id || null);

  // Sync materials when editing offer changes
  useEffect(() => {
    if (editingOffer) {
      setRecipeMaterials(materials);
    }
  }, [materials, editingOffer]);

  // Get YouTube preview for form
  const youtubeId = getYouTubeId(formData.media_url);
  const youtubeThumbnail = youtubeId ? getYouTubeThumbnail(youtubeId) : null;

  const { data: offers = [] } = useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("provider_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data as Offer[];
    },
  });

  const createOffer = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      price: number | null;
      price_type: string;
      features: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("offers").insert({
        ...data,
        is_active: false,
        sort_order: offers.length + 1,
        provider_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "Erfolg", description: "Angebot wurde erstellt." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Angebot konnte nicht erstellt werden.", variant: "destructive" });
    },
  });

  const updateOffer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Offer> }) => {
      const { error } = await supabase.from("offers").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "Erfolg", description: "Angebot wurde aktualisiert." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Angebot konnte nicht aktualisiert werden.", variant: "destructive" });
    },
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast({ title: "Erfolg", description: "Angebot wurde gelöscht." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Angebot konnte nicht gelöscht werden.", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // Check if we're trying to activate and already have 3 active
      if (is_active) {
        const activeCount = offers.filter((o) => o.is_active).length;
        if (activeCount >= 3) {
          throw new Error("Maximal 3 aktive Angebote erlaubt");
        }
      }
      const { error } = await supabase.from("offers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message || "Status konnte nicht geändert werden.",
        variant: "destructive",
      });
    },
  });

  // Reorder mutation for drag & drop
  const reorderOffers = useMutation({
    mutationFn: async (newOrder: { id: string; sort_order: number }[]) => {
      // Update each offer's sort_order
      const promises = newOrder.map(({ id, sort_order }) =>
        supabase.from("offers").update({ sort_order }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Reihenfolge konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOffers = [...offers];
    const [draggedItem] = newOffers.splice(draggedIndex, 1);
    newOffers.splice(dropIndex, 0, draggedItem);

    // Create new order array
    const newOrder = newOffers.map((offer, idx) => ({
      id: offer.id,
      sort_order: idx,
    }));

    reorderOffers.mutate(newOrder);
    setDraggedIndex(null);
  }, [draggedIndex, offers, reorderOffers]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const openCreateDialog = () => {
    setEditingOffer(null);
    setRecipeMaterials([]);
    setActiveTab("details");
    setFormData({ 
      title: "", 
      description: "", 
      price: "", 
      price_type: "fest", 
      features: "",
      offer_type: "service",
      display_mode: "highlight_card",
      media_url: "",
      external_link: "",
      is_highlight: true,
      billing_type: "einmalig",
      duration_minutes: 60,
      recommended_tags: [],
      auto_deduct: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setActiveTab("details");
    const isHighlight = offer.display_mode === "highlight_card" || !offer.display_mode;
    setFormData({
      title: offer.title,
      description: offer.description || "",
      price: offer.price?.toString() || "",
      price_type: offer.price_type || "fest",
      features: offer.features?.join(", ") || "",
      offer_type: offer.offer_type || "service",
      display_mode: offer.display_mode || "highlight_card",
      media_url: offer.media_url || "",
      external_link: offer.external_link || "",
      is_highlight: isHighlight,
      billing_type: offer.billing_type || "einmalig",
      duration_minutes: offer.duration_minutes || 60,
      recommended_tags: offer.recommended_tags || [],
      auto_deduct: offer.auto_deduct ?? true,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingOffer(null);
    setRecipeMaterials([]);
    setActiveTab("details");
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen Titel ein.", variant: "destructive" });
      return;
    }
    // Derive display_mode from toggle
    const displayMode = formData.is_highlight ? "highlight_card" : "list_item";
    const data = {
      title: formData.title,
      description: formData.description,
      price: formData.billing_type === "kostenlos" || formData.price_type === "auf_anfrage" ? null : Number(formData.price) || null,
      price_type: formData.price_type,
      features: formData.features.split(",").map((f) => f.trim()).filter(Boolean),
      offer_type: formData.offer_type,
      display_mode: displayMode,
      media_url: formData.media_url || null,
      external_link: formData.external_link || null,
      billing_type: formData.billing_type,
      duration_minutes: formData.duration_minutes,
      recommended_tags: formData.recommended_tags,
      auto_deduct: formData.auto_deduct,
    };
    
    if (editingOffer) {
      updateOffer.mutate({ id: editingOffer.id, data }, {
        onSuccess: async () => {
          // Save recipe materials after offer is updated
          if (recipeMaterials.length > 0 || materials.length > 0) {
            try {
              await saveMaterials(editingOffer.id, recipeMaterials);
            } catch (e) {
              console.error("Error saving materials:", e);
            }
          }
        }
      });
    } else {
      createOffer.mutate(data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Angebote
            <HelpTip id="angebote.bereich" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Service-Angebote für die Landingpage (max. 3 aktiv)
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Neues Angebot
        </Button>
      </div>

      <div className="grid gap-4">
        {offers.map((offer, index) => {
          const offerYoutubeId = offer.media_url ? getYouTubeId(offer.media_url) : null;
          const offerThumbnail = offerYoutubeId ? getYouTubeThumbnail(offerYoutubeId) : null;
          
          return (
          <Card
            key={offer.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative overflow-hidden animate-slide-up cursor-grab active:cursor-grabbing transition-all",
              !offer.is_active && "opacity-60",
              draggedIndex === index && "opacity-50 scale-[0.98] ring-2 ring-primary"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="flex items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                  {offerThumbnail ? (
                    <>
                      <img src={offerThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" fill="white" />
                      </div>
                    </>
                  ) : offer.media_url && offer.media_url.startsWith('http') ? (
                    <img 
                      src={offer.media_url} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold text-foreground">{offer.title}</h3>
                        {offer.display_mode === 'highlight_card' || !offer.display_mode ? (
                          <Badge className="text-xs gap-1 bg-primary/10 text-primary border-0">
                            <Star className="h-3 w-3" />
                            Highlight
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Liste
                          </Badge>
                        )}
                        {offer.billing_type && offer.billing_type !== 'einmalig' && (
                          <Badge className={cn("text-xs gap-1 border-0", BILLING_COLORS[offer.billing_type])}>
                            {BILLING_TYPES.find(t => t.value === offer.billing_type)?.icon}
                            {BILLING_TYPES.find(t => t.value === offer.billing_type)?.label}
                          </Badge>
                        )}
                        <OfferStockBadge offerId={offer.id} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {offer.billing_type === 'kostenlos' ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                            Gratis
                          </Badge>
                        ) : offer.price ? (
                          <span className="text-2xl font-bold text-primary">
                            {offer.price_type === "ab" && "ab "}€{offer.price}
                          </span>
                        ) : (
                          <Badge variant="secondary">{priceTypeLabels[offer.price_type || "auf_anfrage"]}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Aktiv</span>
                        <Switch
                          checked={offer.is_active ?? false}
                          onCheckedChange={(checked) =>
                            toggleActive.mutate({ id: offer.id, is_active: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4">{offer.description}</p>

                  {offer.media_url && (
                    <p className="text-xs text-muted-foreground mb-2">
                      🎬 Media: {offer.media_url.substring(0, 40)}...
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {offer.features?.map((feature) => (
                      <Badge key={feature} variant="outline" className="bg-muted/50">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(offer)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteOffer.mutate(offer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Maximal <strong>3 Angebote</strong> können gleichzeitig aktiv sein und werden auf Ihrer Landingpage angezeigt.
          </p>
        </CardContent>
      </Card>

      {/* Live Preview Panel */}
      <OfferPreviewPanel offers={offers} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl h-[92vh] sm:h-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Angebot bearbeiten" : "Neues Angebot"}</DialogTitle>
            <DialogDescription>
              {editingOffer ? "Bearbeiten Sie die Angebot-Details und das Rezept" : "Erstellen Sie ein neues Angebot"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="details" className="gap-2 text-sm">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="recipe" className="gap-2 text-sm" disabled={!editingOffer}>
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Kalkulation & Material</span>
                <span className="sm:hidden">Kalkulation</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 flex-1 overflow-hidden">
              <div className="space-y-4 h-full overflow-y-auto pr-2 pb-4 [&_input]:text-base [&_textarea]:text-base [&_select]:text-base">
                <div className="space-y-2">
                  <Label>Titel *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Angebot-Titel"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Angebotstyp</Label>
                    <Select
                      value={formData.offer_type}
                      onValueChange={(value) => setFormData({ ...formData, offer_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Abrechnungsart</Label>
                    <Select
                      value={formData.billing_type}
                      onValueChange={(value) => setFormData({ ...formData, billing_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              {type.icon}
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Simple Toggle for Highlight */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Als Haupt-Angebot hervorheben?
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Highlight-Angebote werden groß mit Bild/Video angezeigt
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_highlight}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_highlight: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Angebot-Beschreibung"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preistyp</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fest">Festpreis</SelectItem>
                        <SelectItem value="ab">Ab Preis</SelectItem>
                        <SelectItem value="auf_anfrage">Auf Anfrage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.price_type !== "auf_anfrage" && (
                    <div className="space-y-2">
                      <Label>Preis (€ netto)</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Netto-Preis. Kleinunternehmer (§19 UStG): Netto = Brutto.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Features (kommagetrennt)</Label>
                  <Textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="Beratung, Ausschneiden, Raspeln"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Media URL (YouTube oder Bild)</Label>
                  <Input
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... oder Bild-URL"
                  />
                  {youtubeThumbnail && (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                      <img
                        src={youtubeThumbnail}
                        alt="YouTube Preview"
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white ml-1" fill="white" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground p-2 bg-muted/80">
                        YouTube Video erkannt
                      </p>
                    </div>
                  )}
                  {formData.media_url && !youtubeThumbnail && formData.media_url.startsWith('http') && (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                      <img
                        src={formData.media_url}
                        alt="Bild Preview"
                        className="w-full aspect-video object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    YouTube-Videos werden automatisch eingebettet
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Externer Link (optional)</Label>
                  <Input
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://shop.beispiel.de/produkt"
                  />
                </div>

                {!editingOffer && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 Nach dem Erstellen können Sie im Tab "Kalkulation & Material" Rezepte mit Materialien aus Ihrem Lager definieren.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recipe" className="mt-4 flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2 pb-4">
                <OfferRecipeEditor
                  offerId={editingOffer?.id || null}
                  offerPrice={Number(formData.price) || null}
                  durationMinutes={formData.duration_minutes}
                  recommendedTags={formData.recommended_tags}
                  autoDeduct={formData.auto_deduct}
                  onDurationChange={(mins) => setFormData({ ...formData, duration_minutes: mins })}
                  onTagsChange={(tags) => setFormData({ ...formData, recommended_tags: tags })}
                  onAutoDeductChange={(auto) => setFormData({ ...formData, auto_deduct: auto })}
                  materials={recipeMaterials}
                  onMaterialsChange={setRecipeMaterials}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={createOffer.isPending || updateOffer.isPending}>
              {editingOffer ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Angebote;
