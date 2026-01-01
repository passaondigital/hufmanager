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
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const priceTypeLabels: Record<string, string> = {
  fest: "Festpreis",
  ab: "Ab",
  auf_anfrage: "Auf Anfrage",
};

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  is_active: boolean | null;
}

const Angebote = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    price_type: "fest",
    features: "",
  });
  const queryClient = useQueryClient();

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
      const { error } = await supabase.from("offers").update(data).eq("id", id);
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

  const openCreateDialog = () => {
    setEditingOffer(null);
    setFormData({ title: "", description: "", price: "", price_type: "fest", features: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || "",
      price: offer.price?.toString() || "",
      price_type: offer.price_type || "fest",
      features: offer.features?.join(", ") || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingOffer(null);
  };

  const handleSubmit = () => {
    if (!formData.title) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen Titel ein.", variant: "destructive" });
      return;
    }
    const data = {
      title: formData.title,
      description: formData.description,
      price: formData.price_type === "auf_anfrage" ? null : Number(formData.price) || null,
      price_type: formData.price_type,
      features: formData.features.split(",").map((f) => f.trim()).filter(Boolean),
    };
    if (editingOffer) {
      updateOffer.mutate({ id: editingOffer.id, data });
    } else {
      createOffer.mutate(data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Angebote</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Service-Angebote für die Landingpage (max. 3 aktiv)
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Neues Angebot
        </Button>
      </div>

      <div className="grid gap-6">
        {offers.map((offer, index) => (
          <Card
            key={offer.id}
            className={cn("relative overflow-hidden animate-slide-up", !offer.is_active && "opacity-60")}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div className="flex items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                </div>

                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{offer.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {offer.price ? (
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
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Maximal <strong>3 Angebote</strong> können gleichzeitig aktiv sein und werden auf Ihrer Landingpage angezeigt.
          </p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Angebot bearbeiten" : "Neues Angebot"}</DialogTitle>
            <DialogDescription>
              {editingOffer ? "Bearbeiten Sie die Angebot-Details" : "Erstellen Sie ein neues Angebot"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Angebot-Titel"
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
                  <Label>Preis (€)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
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
          </div>

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
