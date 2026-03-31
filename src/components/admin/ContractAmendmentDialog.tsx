import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContractAmendmentDialogProps {
  contract: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ContractAmendmentDialog({ contract, open, onOpenChange, onSaved }: ContractAmendmentDialogProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = text.trim().length >= 10;

  const handleSave = async () => {
    if (!canSubmit || !contract) return;
    setSaving(true);

    try {
      const payload = {
        provider_id: contract.provider_id,
        provider_pid: contract.provider_pid,
        plan: contract.plan,
        plan_price_monthly: contract.plan_price_monthly,
        plan_price_yearly: contract.plan_price_yearly,
        custom_price: contract.custom_price,
        period_start: contract.period_start,
        period_end: contract.period_end,
        auto_renew: contract.auto_renew,
        payment_method: contract.payment_method,
        status: "active",
        contract_number: "",
        is_amendment: true,
        amendment_of_id: contract.id,
        amendment_text: text.trim(),
        notes: title.trim() || `Nachtrag zum Vertrag ${contract.contract_number}`,
        content_html: `<h2>Nachtrag zum Nutzungsvertrag Nr. ${contract.contract_number} vom ${format(new Date(contract.period_start), "dd.MM.yyyy")}</h2>
<p><strong>Provider:</strong> ${contract.provider_pid}</p>
<hr/>
<p>${text.trim().replace(/\n/g, "<br/>")}</p>
<hr/>
<p><em>Dieser Nachtrag ist Bestandteil des oben genannten Vertrags und ergänzt diesen entsprechend.</em></p>`,
      };

      const { error } = await supabase.from("admin_contracts").insert(payload as any);
      if (error) throw error;

      // Log admin note
      await supabase.from("admin_notes").insert({
        title: `provider:${contract.provider_id}`,
        content: `Nachtrag zu Vertrag ${contract.contract_number} erstellt. ${format(new Date(), "dd.MM.yyyy")}`,
        type: "task",
        priority: "normal",
        status: "inbox",
      });

      toast.success("Nachtrag erstellt");
      setText("");
      setTitle("");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      console.error("Amendment error:", err);
      toast.error(err.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-primary" />
            Nachtrag erstellen
          </DialogTitle>
          <DialogDescription>
            Nachtrag zum Vertrag <span className="font-mono font-semibold">{contract?.contract_number}</span> ({contract?.provider_pid})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Vertrag:</span> {contract?.contract_number}</p>
            <p><span className="text-muted-foreground">Provider:</span> {contract?.provider_pid}</p>
            <p><span className="text-muted-foreground">Plan:</span> {contract?.plan}</p>
            <p><span className="text-muted-foreground">Laufzeit:</span> {contract?.period_start ? format(new Date(contract.period_start), "dd.MM.yyyy") : "–"} – {contract?.period_end ? format(new Date(contract.period_end), "dd.MM.yyyy") : "∞"}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Titel (optional)</Label>
            <Input
              placeholder="z.B. Preisänderung, Planwechsel…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Änderung / Ergänzung *</Label>
            <Textarea
              placeholder="Beschreibung der Vertragsänderung (min. 10 Zeichen)…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="text-sm"
            />
            {text.length > 0 && text.length < 10 && (
              <p className="text-xs text-destructive">Mindestens 10 Zeichen erforderlich ({text.length}/10)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FilePlus className="h-4 w-4 mr-1.5" />}
            Nachtrag speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
