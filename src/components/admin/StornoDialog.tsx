import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { createAccountNote, logDocumentEvent } from "@/services/accountNotesService";

interface StornoDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (createCorrection: boolean, originalInvoice: any) => void;
}

export function StornoDialog({ invoice, open, onOpenChange, onCompleted }: StornoDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const canSubmit = reason.trim().length >= 10;

  const handleStorno = async () => {
    if (!canSubmit || !invoice) return;
    setSaving(true);

    try {
      // 1. Create Stornorechnung (negative invoice)
      const stornoPayload = {
        provider_id: invoice.provider_id,
        provider_pid: invoice.provider_pid,
        provider_name: invoice.provider_name,
        provider_email: invoice.provider_email,
        provider_address: invoice.provider_address,
        plan: invoice.plan,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        subtotal: -Math.abs(Number(invoice.subtotal)),
        discount: 0,
        total: -Math.abs(Number(invoice.total)),
        vat_rate: 0,
        vat_amount: 0,
        kleinunternehmer: true,
        payment_method: invoice.payment_method,
        payment_source: "storno",
        status: "sent",
        due_date: invoice.due_date,
        notes: `Stornorechnung zu Rechnung ${invoice.invoice_number} vom ${invoice.created_at ? format(new Date(invoice.created_at), "dd.MM.yyyy") : "–"}.\nGrund: ${reason.trim()}`,
        sent_at: new Date().toISOString(),
        is_storno: true,
        storno_of_id: invoice.id,
        storno_reason: reason.trim(),
        invoice_number: "", // let trigger auto-generate
      };

      const { error: stornoError } = await supabase
        .from("admin_invoices")
        .insert(stornoPayload as any);
      if (stornoError) throw stornoError;

      // 2. Mark original as cancelled
      const { error: updateError } = await supabase
        .from("admin_invoices")
        .update({ status: "cancelled" } as any)
        .eq("id", invoice.id);
      if (updateError) throw updateError;

      // 3. Log admin note
      await supabase.from("admin_notes").insert({
        title: `provider:${invoice.provider_id}`,
        content: `Rechnung ${invoice.invoice_number} storniert. Grund: ${reason.trim()}. ${format(new Date(), "dd.MM.yyyy")}`,
        type: "task",
        priority: "high",
        status: "inbox",
      });

      toast.success("Stornorechnung erstellt & Original storniert");
      onOpenChange(false);
      setShowFollowUp(true);
    } catch (err: any) {
      console.error("Storno error:", err);
      toast.error(err.message || "Stornierung fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Rechnung stornieren
            </DialogTitle>
            <DialogDescription>
              Rechnung <span className="font-mono font-semibold">{invoice?.invoice_number}</span> wird
              GoBD-konform storniert. Eine Stornorechnung mit negativem Betrag wird automatisch erstellt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Provider:</span> {invoice?.provider_name} ({invoice?.provider_pid})</p>
              <p><span className="text-muted-foreground">Betrag:</span> {Number(invoice?.total || 0).toFixed(2)} €</p>
              <p><span className="text-muted-foreground">Stornobetrag:</span> <span className="text-destructive font-semibold">-{Number(invoice?.total || 0).toFixed(2)} €</span></p>
            </div>

            <div className="space-y-1.5">
              <Label>Grund der Stornierung *</Label>
              <Textarea
                placeholder="Bitte Stornierungsgrund angeben (min. 10 Zeichen)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-sm"
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-xs text-destructive">Mindestens 10 Zeichen erforderlich ({reason.length}/10)</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleStorno} disabled={!canSubmit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Ban className="h-4 w-4 mr-1.5" />}
              Stornieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up: create correction? */}
      <AlertDialog open={showFollowUp} onOpenChange={setShowFollowUp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Korrigierte Rechnung erstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du direkt eine korrigierte Rechnung für {invoice?.provider_name} erstellen?
              Die Daten werden vorausgefüllt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowFollowUp(false);
              onCompleted(false, invoice);
            }}>
              Nein, später
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowFollowUp(false);
              onCompleted(true, invoice);
            }}>
              Ja, jetzt erstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
