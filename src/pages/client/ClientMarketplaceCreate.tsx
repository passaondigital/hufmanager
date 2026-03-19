import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LISTING_TYPES = [
  { value: "einstellplatz", label: "Einstellplatz" },
  { value: "kurs", label: "Kurs / Workshop" },
  { value: "dienstleistung", label: "Dienstleistung" },
  { value: "produkt", label: "Produkt" },
  { value: "gesuch", label: "Gesuch (Ich suche…)" },
  { value: "sonstiges", label: "Sonstiges" },
];

const CATEGORIES: Record<string, string[]> = {
  einstellplatz: ["Offenstall", "Box", "Paddockbox", "Laufstall", "Weideplatz", "Bewegungsstall", "Aktivstall"],
  kurs: ["Reitkurs", "Bodenarbeit", "Hufpflege-Kurs", "Erste Hilfe Pferd", "Sattelkunde", "Longe", "Sonstiges"],
  dienstleistung: ["Beritt", "Reitbeteiligung", "Pferdetransport", "Stallhilfe", "Fütterung", "Pferdepflege"],
  produkt: ["Futter", "Einstreu", "Zubehör", "Sattel", "Trense", "Decken", "Sonstiges"],
  gesuch: ["Einstellplatz gesucht", "Reitbeteiligung gesucht", "Pflegepferd gesucht", "Dienstleister gesucht"],
  sonstiges: ["Sonstiges"],
};

export default function ClientMarketplaceCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    listing_type: "",
    title: "",
    description: "",
    category: "",
    location_name: "",
    location_plz: "",
    price_amount: "",
    price_label: "",
    capacity: "",
    contact_email: "",
    contact_phone: "",
    available_from: "",
    available_until: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.listing_type || !form.title) throw new Error("Pflichtfelder fehlen");

      const { error } = await supabase.from("client_marketplace_listings").insert({
        owner_id: user!.id,
        listing_type: form.listing_type as any,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        location_name: form.location_name || null,
        location_plz: form.location_plz || null,
        price_amount: form.price_amount ? parseFloat(form.price_amount) : null,
        price_label: form.price_label || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
        tags,
        status: "active" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Inserat erstellt!", description: "Dein Inserat ist jetzt im Pferdemarkt sichtbar." });
      navigate("/client-marketplace");
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const cats = CATEGORIES[form.listing_type] || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/client-marketplace")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Zurück zum Markt
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Neues Inserat erstellen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type */}
          <div className="space-y-1">
            <Label>Art des Inserats *</Label>
            <Select value={form.listing_type} onValueChange={(v) => update("listing_type", v)}>
              <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
              <SelectContent>
                {LISTING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label>Titel *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="z. B. Paddockbox in 85xxx frei" />
          </div>

          {/* Category */}
          {cats.length > 0 && (
            <div className="space-y-1">
              <Label>Kategorie</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <Label>Beschreibung</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Details zum Angebot…" />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>PLZ</Label>
              <Input value={form.location_plz} onChange={(e) => update("location_plz", e.target.value)} maxLength={5} placeholder="z. B. 80331" />
            </div>
            <div className="space-y-1">
              <Label>Ort</Label>
              <Input value={form.location_name} onChange={(e) => update("location_name", e.target.value)} placeholder="z. B. München" />
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Preis (€)</Label>
              <Input type="number" value={form.price_amount} onChange={(e) => update("price_amount", e.target.value)} placeholder="z. B. 350" />
            </div>
            <div className="space-y-1">
              <Label>Preiszusatz</Label>
              <Input value={form.price_label} onChange={(e) => update("price_label", e.target.value)} placeholder="z. B. pro Monat" />
            </div>
          </div>

          {/* Capacity */}
          {form.listing_type === "einstellplatz" && (
            <div className="space-y-1">
              <Label>Verfügbare Plätze</Label>
              <Input type="number" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} />
            </div>
          )}

          {/* Tags */}
          <div className="space-y-1">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Tag eingeben + Enter"
              />
              <Button type="button" size="icon" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kontakt E-Mail</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Kontakt Telefon</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Verfügbar ab</Label>
              <Input type="date" value={form.available_from} onChange={(e) => update("available_from", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Verfügbar bis</Label>
              <Input type="date" value={form.available_until} onChange={(e) => update("available_until", e.target.value)} />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!form.listing_type || !form.title || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Wird erstellt…" : "Inserat veröffentlichen"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
