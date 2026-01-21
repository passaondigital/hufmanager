import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Info, Link2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ServicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
  } | null;
}

interface PaymentProduct {
  id: string;
  service_id: string;
  user_id: string;
  copecart_product_id: string | null;
  copecart_checkout_url: string | null;
  is_active: boolean;
}

export function ServicePaymentModal({ isOpen, onClose, service }: ServicePaymentModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copecartUrl, setCopecartUrl] = useState("");

  const { data: paymentProduct, isLoading } = useQuery({
    queryKey: ["payment-product", service?.id],
    queryFn: async () => {
      if (!service?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from("payment_products")
        .select("*")
        .eq("service_id", service.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentProduct | null;
    },
    enabled: !!service?.id && !!user?.id && isOpen,
  });

  useEffect(() => {
    if (paymentProduct) {
      setCopecartUrl(paymentProduct.copecart_checkout_url || "");
    } else {
      setCopecartUrl("");
    }
  }, [paymentProduct]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!service?.id || !user?.id) throw new Error("Fehlende Daten");

      if (paymentProduct?.id) {
        const { error } = await supabase
          .from("payment_products")
          .update({ copecart_checkout_url: copecartUrl || null })
          .eq("id", paymentProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_products")
          .insert({
            service_id: service.id,
            user_id: user.id,
            copecart_checkout_url: copecartUrl || null,
            is_active: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-product", service?.id] });
      queryClient.invalidateQueries({ queryKey: ["payment-products"] });
      toast({ title: "Gespeichert", description: "CopeCart-Verknüpfung wurde aktualisiert." });
      onClose();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Verknüpfung konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setCopecartUrl("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#F47B20]" />
            CopeCart-Verknüpfung
          </DialogTitle>
          <DialogDescription>
            Verknüpfe "{service?.name}" mit einem CopeCart-Produkt für automatische Zahlungslinks.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-[#F47B20] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Verbinde deine Leistung mit einem CopeCart-Produkt, um automatische Zahlungslinks zu generieren. 
                  So können Kunden direkt über den Link bezahlen.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copecart-url" className="flex items-center gap-2">
                CopeCart Produkt-URL
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-[#F47B20] cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Die vollständige Checkout-URL aus Ihrem CopeCart-Dashboard (z.B. https://copecart.com/p/abc123)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="copecart-url"
                type="url"
                placeholder="https://copecart.com/p/..."
                value={copecartUrl}
                onChange={(e) => setCopecartUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lassen Sie dieses Feld leer, wenn Sie keinen Zahlungslink für diese Leistung benötigen.
              </p>
            </div>

            {copecartUrl && (
              <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                <ExternalLink className="h-4 w-4 text-accent" />
                <a 
                  href={copecartUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline truncate"
                >
                  {copecartUrl}
                </a>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || isLoading}
            className="bg-[#F47B20] hover:bg-[#F47B20]/90"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
