import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, PenTool, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

interface ContractSignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onSigned: () => void;
}

export function ContractSignSheet({ open, onOpenChange, contract, onSigned }: ContractSignSheetProps) {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);

  const handleSign = async () => {
    if (!user || !contract || !agreed) return;
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Bitte unterschreibe im Unterschriftsfeld");
      return;
    }

    setSubmitting(true);
    try {
      const signatureData = sigRef.current.toDataURL("image/png");

      const { error } = await supabase
        .from("admin_contracts")
        .update({
          provider_signed_at: new Date().toISOString(),
          provider_signature: signatureData,
          status: "active",
        })
        .eq("id", contract.id);

      if (error) throw error;

      // Timeline event
      await supabase.from("provider_timeline_events").insert({
        provider_id: user.id,
        event_type: "contract_signed",
        title: "Vertrag unterzeichnet",
        description: `Vertrag ${contract.contract_number} digital unterzeichnet`,
        icon: "✍️",
        is_auto: false,
      });

      // Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      for (const admin of (admins || [])) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "Vertrag unterzeichnet ✍️",
          message: `Provider ${contract.provider_pid || user.id} hat den Vertrag ${contract.contract_number} unterzeichnet.`,
          type: "info",
          link: "/admin?tab=contracts",
        });
      }

      toast.success("Vertrag erfolgreich unterzeichnet!");
      onOpenChange(false);
      onSigned();
    } catch (err: any) {
      toast.error(err.message || "Fehler bei der Unterzeichnung");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Vertrag unterzeichnen
          </SheetTitle>
          <SheetDescription>
            Lies den Vertrag sorgfältig durch und unterzeichne digital.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
          {/* Contract content */}
          <ScrollArea className="flex-1 max-h-[40vh] rounded-lg border bg-background p-4">
            {contract?.content_html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: contract.content_html }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Vertragsnummer: {contract?.contract_number}<br />
                Plan: {contract?.plan}<br />
                Laufzeit: {contract?.period_start} – {contract?.period_end || "unbefristet"}
              </p>
            )}
          </ScrollArea>

          {/* Agreement checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <Checkbox
              id="agree-contract"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <Label htmlFor="agree-contract" className="text-sm leading-relaxed cursor-pointer">
              Ich habe den Vertrag gelesen und stimme den Bedingungen zu.
            </Label>
          </div>

          {/* Signature */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unterschrift</Label>
            <div className="border rounded-lg bg-white overflow-hidden" style={{ height: 120 }}>
              <SignatureCanvas
                ref={sigRef}
                penColor="black"
                canvasProps={{
                  className: "w-full h-full",
                  style: { width: "100%", height: "100%" },
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sigRef.current?.clear()}
              className="text-xs"
            >
              Unterschrift löschen
            </Button>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSign}
            disabled={!agreed || submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Verbindlich unterzeichnen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
