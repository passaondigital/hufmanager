import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, Info, Loader2, CreditCard, Copy, Check, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PaymentSettings {
  id: string;
  user_id: string;
  copecart_vendor_id: string | null;
  copecart_webhook_secret: string | null;
  default_payment_method: string | null;
}

const WEBHOOK_URL = "https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/copecart-webhook";

const PAYMENT_METHODS = [
  { value: "Überweisung", label: "Überweisung" },
  { value: "Bar", label: "Bar" },
  { value: "CopeCart", label: "CopeCart" },
  { value: "PayPal", label: "PayPal" },
];

export function PaymentSettingsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    copecart_vendor_id: "",
    copecart_webhook_secret: "",
    default_payment_method: "Überweisung",
  });
  const [copied, setCopied] = useState(false);

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      setCopied(true);
      toast({ title: "Kopiert!", description: "Webhook-URL wurde in die Zwischenablage kopiert." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Fehler", description: "URL konnte nicht kopiert werden.", variant: "destructive" });
    }
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ["provider-payment-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("provider_payment_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentSettings | null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        copecart_vendor_id: settings.copecart_vendor_id || "",
        copecart_webhook_secret: settings.copecart_webhook_secret || "",
        default_payment_method: settings.default_payment_method || "Überweisung",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Nicht angemeldet");
      
      const payload = {
        user_id: user.id,
        copecart_vendor_id: formData.copecart_vendor_id || null,
        copecart_webhook_secret: formData.copecart_webhook_secret || null,
        default_payment_method: formData.default_payment_method,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("provider_payment_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("provider_payment_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-payment-settings"] });
      toast({ title: "Gespeichert", description: "Zahlungseinstellungen wurden aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Zahlungseinstellungen
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Konfiguriere deine Standard-Zahlungsmethode und CopeCart-Integration für automatische Zahlungsabwicklung.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Standard-Zahlungsmethode und Zahlungsanbieter-Integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="default-payment">Standard-Zahlungsmethode</Label>
          <Select
            value={formData.default_payment_method}
            onValueChange={(value) => setFormData({ ...formData, default_payment_method: value })}
          >
            <SelectTrigger id="default-payment">
              <SelectValue placeholder="Zahlungsmethode wählen" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Diese Methode wird standardmäßig für neue Rechnungen verwendet.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="copecart-vendor">CopeCart Vendor ID</Label>
          <Input
            id="copecart-vendor"
            placeholder="Ihre CopeCart Vendor ID"
            value={formData.copecart_vendor_id}
            onChange={(e) => setFormData({ ...formData, copecart_vendor_id: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Finden Sie diese in Ihrem CopeCart Dashboard unter Einstellungen.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="copecart-secret">Webhook Secret (IPN Kennwort)</Label>
          <Input
            id="copecart-secret"
            type="password"
            placeholder="Optional: IPN Kennwort aus CopeCart"
            value={formData.copecart_webhook_secret}
            onChange={(e) => setFormData({ ...formData, copecart_webhook_secret: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nur nötig, wenn du ein IPN-Kennwort in CopeCart hinterlegt hast.
          </p>
        </div>

        {/* CopeCart Integration Guide with Affiliate */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="copecart-guide" className="border rounded-lg bg-muted/50">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-[#F47B20]" />
                📖 Anleitung: So verbindest du CopeCart & verdienst Geld
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-5 text-sm">
                {/* Step 1 - Account Creation with Affiliate */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F47B20] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="font-medium">Account erstellen</p>
                    <p className="text-muted-foreground">
                      Du hast noch kein CopeCart Konto? Erstelle es hier kostenlos und starte sofort.
                    </p>
                    <Button
                      type="button"
                      asChild
                      className="bg-[#F47B20] hover:bg-[#F47B20]/90"
                    >
                      <a 
                        href="https://copecart.com/users/sign_up?cp=barhufserviceschmid&language=de" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Kostenloses Konto erstellen
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground italic">
                      Hast du schon ein Konto? Dann logge dich ein und kopiere deine "Vendor ID" aus den Profileinstellungen hier her.
                    </p>
                  </div>
                </div>

                {/* Step 2 - Interface Setup */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F47B20] text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Schnittstelle einrichten</p>
                    <p className="text-muted-foreground">
                      Damit der HufManager deine Zahlungen automatisch erkennt, musst du die IPN-Benachrichtigung aktivieren.
                    </p>
                  </div>
                </div>

                {/* Step 3 - Webhook URL (WICHTIG) */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F47B20] text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">Webhook hinterlegen (WICHTIG)</p>
                    <p className="text-muted-foreground">
                      Kopiere diese Adresse. Gehe in CopeCart zu <strong>"Einstellungen" → "IPN Anbindungen"</strong>. 
                      Erstelle eine neue <strong>"Integration zur Vertragserfüllung"</strong> und füge die Adresse dort ein.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Input
                        readOnly
                        value={WEBHOOK_URL}
                        className="font-mono text-xs bg-background truncate"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWebhookUrl}
                        className="flex-shrink-0 gap-1.5"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            Kopiert
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 text-[#F47B20]" />
                            Kopieren
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 4 - Security */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F47B20] text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Sicherheit</p>
                    <p className="text-muted-foreground">
                      Lege in CopeCart ein "Kennwort" fest und trage exakt dieses Kennwort oben im Feld "Webhook Secret" ein.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-green-800 dark:text-green-200 text-xs">
                    ✅ <strong>Fertig!</strong> Nach erfolgreicher Einrichtung werden Zahlungen automatisch 
                    mit deinen Rechnungen verknüpft und als bezahlt markiert.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end">
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="bg-[#F47B20] hover:bg-[#F47B20]/90"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
