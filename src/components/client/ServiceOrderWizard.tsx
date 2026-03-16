import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Search, Upload, CheckCircle, HelpCircle, Loader2, ClipboardList } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logHorseAction } from "@/utils/auditLog";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  horseReadableId?: string;
}

interface ProviderOption {
  id: string;
  full_name: string | null;
  readable_id: string | null;
  email: string | null;
  role: string;
  partner_type?: string | null;
  last_visit?: string | null;
}

interface HorseOption {
  id: string;
  name: string;
  readable_id: string | null;
}

const PROVIDER_TYPE_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "hoof_care", label: "Hufbearbeiter" },
  { key: "vet", label: "Tierarzt" },
  { key: "physio", label: "Physio" },
  { key: "osteo", label: "Osteopath" },
  { key: "saddler", label: "Sattler" },
  { key: "trainer", label: "Trainer" },
  { key: "other", label: "Sonstige" },
];

export function ServiceOrderWizard({ open, onClose, horseId, horseName, horseReadableId }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Step 2
  const [description, setDescription] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [selectedHorseId, setSelectedHorseId] = useState(horseId);
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Step 3
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchConnectedProviders();
      fetchHorses();
    }
  }, [open, user]);

  const fetchConnectedProviders = async () => {
    if (!user) return;
    setLoadingProviders(true);
    try {
      // Get providers via access_grants
      const { data: grants } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true);

      // Get partners via horse_partner_access
      const { data: partnerAccess } = await supabase
        .from("horse_partner_access")
        .select("partner_profile_id, partner_type")
        .eq("horse_id", horseId)
        .is("revoked_at", null);

      const providerIds = (grants || []).map(g => g.provider_id);
      const partnerIds = (partnerAccess || []).map(p => p.partner_profile_id).filter(Boolean);
      const allIds = [...new Set([...providerIds, ...partnerIds])];

      if (allIds.length === 0) {
        setProviders([]);
        setLoadingProviders(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, email")
        .in("id", allIds);

      const result: ProviderOption[] = (profiles || []).map(p => {
        const pa = partnerAccess?.find(a => a.partner_profile_id === p.id);
        return {
          ...p,
          role: providerIds.includes(p.id) ? "provider" : "partner",
          partner_type: pa?.partner_type || null,
        };
      });

      setProviders(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchHorses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("horses")
      .select("id, name, readable_id")
      .eq("owner_id", user.id)
      .is("deleted_at", null);
    setHorses((data || []) as HorseOption[]);
  };

  const searchProvider = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id, email")
        .or(`email.ilike.%${q}%,readable_id.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(5);

      if (data && data.length > 0) {
        const newProviders = data.map(p => ({
          ...p,
          role: "search",
          partner_type: null,
        }));
        setProviders(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...newProviders.filter(p => !existingIds.has(p.id))];
        });
      } else {
        toast.info("Kein Dienstleister gefunden");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else if (f) toast.error("Max. 10MB");
  };

  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 900) + 100;
    return `SO-${year}-${rand}`;
  };

  const submitOrder = async () => {
    if (!user || !selectedProvider || !description || !termsAccepted || !agbAccepted) return;
    setSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const isProvider = selectedProvider.role === "provider";

      const orderData: Record<string, unknown> = {
        order_number: orderNumber,
        horse_id: selectedHorseId,
        client_id: user.id,
        client_signed: true,
        client_signed_at: new Date().toISOString(),
        service_description: description,
        service_date: serviceDate || null,
        estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
        currency: "EUR",
        order_status: "sent",
        terms_accepted_client: true,
        terms_version: "1.0",
        provider_type: selectedProvider.partner_type || "other",
      };

      if (isProvider) {
        orderData.provider_id = selectedProvider.id;
      } else {
        orderData.partner_id = selectedProvider.id;
      }

      const { data: order, error } = await supabase
        .from("service_orders")
        .insert(orderData as any)
        .select("id")
        .single();

      if (error) throw error;

      // Upload document
      if (file && order) {
        const filePath = `service-orders/${order.id}/${file.name}`;
        await supabase.storage.from("horse-documents").upload(filePath, file);
        await supabase
          .from("service_orders")
          .update({ document_urls: [filePath] } as any)
          .eq("id", order.id);
      }

      // Audit log
      await logHorseAction(selectedHorseId, "create_appointment", {
        order_number: orderNumber,
        provider: selectedProvider.full_name,
      });

      // Notify provider/partner
      await supabase.from("notifications").insert({
        user_id: selectedProvider.id,
        title: "📋 Neuer Auftrag",
        message: `Neuer Auftrag ${orderNumber} von ${user.email} für ${horseName}. Bitte annehmen oder ablehnen.`,
        type: "service_order_received",
        link: "/anfragen",
      } as any);

      toast.success(`Auftrag ${orderNumber} erfolgreich gesendet!`);
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Erstellen des Auftrags");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProviders = providers.filter(p => {
    if (typeFilter !== "all" && p.partner_type !== typeFilter && p.role !== "provider") return false;
    if (typeFilter === "hoof_care" && p.role === "provider") return true;
    return true;
  });

  const selectedHorse = horses.find(h => h.id === selectedHorseId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Auftrag erteilen
                <HelpTip id="auftrag.bereich" />
              </DialogTitle>
            </DialogHeader>
            <Badge variant="outline">Schritt 1 von 3</Badge>
            <p className="text-sm text-muted-foreground">Wem erteilst du den Auftrag?</p>

            {/* Type filter */}
            <div className="flex flex-wrap gap-1.5">
              {PROVIDER_TYPE_FILTERS.map(f => (
                <Button
                  key={f.key}
                  variant={typeFilter === f.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(f.key)}
                  className="text-xs"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Connected providers */}
            {loadingProviders ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <RadioGroup value={selectedProvider?.id || ""} onValueChange={(id) => {
                const p = providers.find(pr => pr.id === id);
                if (p) setSelectedProvider(p);
              }}>
                {filteredProviders.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground">Bereits verbunden</p>
                )}
                {filteredProviders.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={p.id} />
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{p.full_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.full_name || "Unbekannt"}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.partner_type || p.role} · {p.readable_id}
                      </div>
                    </div>
                  </label>
                ))}
                {filteredProviders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Keine verbundenen Dienstleister gefunden</p>
                )}
              </RadioGroup>
            )}

            {/* Search */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Oder per E-Mail / ID suchen</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchProvider()}
                />
                <Button size="icon" onClick={searchProvider} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedProvider}>Weiter →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <Badge variant="outline">Schritt 2 von 3</Badge>
                <h3 className="font-semibold mt-1">Was soll gemacht werden?</h3>
              </div>
            </div>

            <div>
              <Label>Leistungsbeschreibung *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='z.B. "Reguläre Hufbearbeitung alle 4 Hufe, Barhuf korrigieren"'
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Wunschtermin (optional)</Label>
              <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Geschätzter Preis (optional, netto)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="0,00"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Netto-Preis. MwSt wird ggf. auf der Rechnung ausgewiesen.</p>
            </div>

            {/* Horse selection */}
            <div>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  <Label>Welches Pferd?</Label>
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Das Pferd für diesen Auftrag</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              <RadioGroup value={selectedHorseId} onValueChange={setSelectedHorseId} className="mt-2 space-y-1">
                {horses.map(h => (
                  <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value={h.id} />
                    <span className="font-medium">{h.name}</span>
                    {h.readable_id && <Badge variant="secondary" className="text-xs">{h.readable_id}</Badge>}
                    {h.id === horseId && <Badge variant="outline" className="text-xs">vorausgewählt</Badge>}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Document upload */}
            <div>
              <Label>Dokumente anhängen (optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center mt-1">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="order-doc" />
                <label htmlFor="order-doc" className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm">{file ? file.name : "📎 Datei hochladen"}</p>
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>← Zurück</Button>
              <Button onClick={() => setStep(3)} disabled={!description.trim()}>Weiter →</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                <Badge variant="outline">Schritt 3 von 3</Badge>
                <h3 className="font-semibold mt-1">Auftrag prüfen & absenden</h3>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auftrag an:</span>
                  <span className="font-medium">{selectedProvider?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pferd:</span>
                  <span className="font-medium">{selectedHorse?.name} {selectedHorse?.readable_id && `(${selectedHorse.readable_id})`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leistung:</span>
                  <span className="font-medium text-right max-w-[60%]">{description}</span>
                </div>
                {serviceDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Termin:</span>
                    <span className="font-medium">{format(new Date(serviceDate), "dd.MM.yyyy", { locale: de })}</span>
                  </div>
                )}
                {estimatedPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preis:</span>
                    <span className="font-medium">ca. {parseFloat(estimatedPrice).toFixed(2)} €</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Terms */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox id="terms1" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} />
                <label htmlFor="terms1" className="text-sm cursor-pointer">
                  Ich erteile diesen Auftrag verbindlich und bin damit einverstanden die vereinbarte Vergütung zu zahlen.
                </label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms2" checked={agbAccepted} onCheckedChange={(v) => setAgbAccepted(v === true)} />
                <label htmlFor="terms2" className="text-sm cursor-pointer">
                  Ich habe die AGB von HufManager gelesen. HufManager ist nicht Vertragspartei und übernimmt keine Haftung.
                </label>
                <HelpTip id="auftrag.agb" />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>← Zurück</Button>
              <Button onClick={submitOrder} disabled={!termsAccepted || !agbAccepted || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Auftrag absenden
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="font-semibold text-lg">Auftrag gesendet!</h3>
            <p className="text-sm text-muted-foreground">
              {selectedProvider?.full_name} wurde benachrichtigt und kann den Auftrag annehmen oder ablehnen.
            </p>
            <Button onClick={onClose} className="w-full">Schließen</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
