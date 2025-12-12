import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, Scissors, Hammer, Stethoscope, Sparkles, Wrench, Shield, Package } from "lucide-react";

interface ServiceOffer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  features: string[] | null;
  is_active: boolean;
  image_url: string | null;
  sort_order: number | null;
}

const iconOptions = [
  { value: "scissors", label: "Schere", icon: Scissors },
  { value: "hammer", label: "Hammer", icon: Hammer },
  { value: "stethoscope", label: "Stethoskop", icon: Stethoscope },
  { value: "sparkles", label: "Stern", icon: Sparkles },
  { value: "wrench", label: "Werkzeug", icon: Wrench },
  { value: "shield", label: "Schild", icon: Shield },
];

const emptyOffer = {
  title: "",
  description: "",
  price: "",
  price_type: "Termin",
  features: "",
  is_active: true,
  image_url: "scissors",
};

export function LandingServicesEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [offers, setOffers] = useState<typeof emptyOffer[]>([]);

  // Fetch existing offers
  const { data: existingOffers, isLoading } = useQuery({
    queryKey: ["landing-offers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("provider_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data as ServiceOffer[];
    },
    enabled: !!user?.id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (existingOffers && existingOffers.length > 0) {
      setOffers(
        existingOffers.map((o) => ({
          title: o.title || "",
          description: o.description || "",
          price: o.price?.toString() || "",
          price_type: o.price_type || "Termin",
          features: o.features?.join("\n") || "",
          is_active: o.is_active ?? true,
          image_url: o.image_url || "scissors",
        }))
      );
    } else {
      // Start with 3 empty slots
      setOffers([emptyOffer, emptyOffer, emptyOffer]);
    }
  }, [existingOffers]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      // Delete all existing offers first
      await supabase.from("offers").delete().eq("provider_id", user.id);

      // Insert new offers (only non-empty ones)
      const validOffers = offers
        .filter((o) => o.title.trim() !== "")
        .map((o, index) => ({
          provider_id: user.id,
          title: o.title.trim(),
          description: o.description.trim() || null,
          price: o.price ? parseFloat(o.price) : null,
          price_type: o.price_type || null,
          features: o.features.trim()
            ? o.features.split("\n").filter((f) => f.trim())
            : null,
          is_active: o.is_active,
          image_url: o.image_url || null,
          sort_order: index,
        }));

      if (validOffers.length > 0) {
        const { error } = await supabase.from("offers").insert(validOffers);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-offers"] });
      toast({ title: "Gespeichert", description: "Leistungen wurden aktualisiert." });
    },
    onError: (error) => {
      console.error("Error saving offers:", error);
      toast({
        title: "Fehler",
        description: "Leistungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const updateOffer = (index: number, field: string, value: any) => {
    setOffers((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    );
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Meine Leistungen
        </CardTitle>
        <CardDescription>
          Definieren Sie bis zu 3 Dienstleistungen für Ihre Landingpage. Diese werden als Preiskarten angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {offers.slice(0, 3).map((offer, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg space-y-4 bg-muted/20"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                Leistung {index + 1}
              </h4>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Aktiv</Label>
                <Switch
                  checked={offer.is_active}
                  onCheckedChange={(checked) =>
                    updateOffer(index, "is_active", checked)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  placeholder="z.B. Barhufbearbeitung"
                  value={offer.title}
                  onChange={(e) => updateOffer(index, "title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={offer.image_url}
                  onValueChange={(val) => updateOffer(index, "image_url", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preis (€)</Label>
                <Input
                  type="number"
                  placeholder="z.B. 85"
                  value={offer.price}
                  onChange={(e) => updateOffer(index, "price", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Preistyp</Label>
                <Select
                  value={offer.price_type}
                  onValueChange={(val) => updateOffer(index, "price_type", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Termin">pro Termin</SelectItem>
                    <SelectItem value="Pferd">pro Pferd</SelectItem>
                    <SelectItem value="Stunde">pro Stunde</SelectItem>
                    <SelectItem value="pauschal">Pauschal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kurzbeschreibung</Label>
              <Textarea
                rows={2}
                placeholder="Was beinhaltet diese Leistung?"
                value={offer.description}
                onChange={(e) =>
                  updateOffer(index, "description", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Features (eine Zeile pro Feature)</Label>
              <Textarea
                rows={3}
                placeholder={`Ausschneiden\nRaspeln\nHufkontrolle`}
                value={offer.features}
                onChange={(e) =>
                  updateOffer(index, "features", e.target.value)
                }
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveMutation.isPending ? "Speichern..." : "Leistungen speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}