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
import { Save, Info, Loader2, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PaymentSettings {
  id: string;
  user_id: string;
  copecart_vendor_id: string | null;
  default_payment_method: string | null;
}

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
    default_payment_method: "Überweisung",
  });

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
