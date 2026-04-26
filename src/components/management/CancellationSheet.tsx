import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Zu teuer" },
  { value: "missing_features", label: "Funktionen fehlen" },
  { value: "switching_tool", label: "Wechsel zu anderem Tool" },
  { value: "business_closed", label: "Geschäft aufgegeben" },
  { value: "other", label: "Sonstiges" },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  duo: "Duo",
  team: "Team",
};

interface CancellationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  currentPlan: string;
  onCancelled: () => void;
}

export function CancellationSheet({ open, onOpenChange, contract, currentPlan, onCancelled }: CancellationSheetProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const periodEnd = contract?.period_end
    ? format(new Date(contract.period_end), "dd.MM.yyyy", { locale: de })
    : "Ende der aktuellen Laufzeit";

  const handleSubmit = async () => {
    if (!user || !contract || !reason || !confirmed) return;

    setSubmitting(true);
    try {
      // Update contract
      const { error } = await supabase
        .from("admin_contracts")
        .update({
          cancellation_requested_at: new Date().toISOString(),
          cancellation_reason: `${CANCELLATION_REASONS.find(r => r.value === reason)?.label || reason}${feedback ? ` – ${feedback}` : ""}`,
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Kündigung wurde beantragt", {
        description: `Wirksam zum ${periodEnd}. Du kannst Hufi bis dahin weiterhin nutzen.`,
      });

      onOpenChange(false);
      onCancelled();
    } catch {
      toast.error("Fehler beim Beantragen der Kündigung");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Kündigung beantragen
          </SheetTitle>
          <SheetDescription>Bitte lies das sorgfältig durch.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Current plan info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Aktueller Plan</p>
              <p className="font-medium">{PLAN_LABELS[currentPlan] || currentPlan}</p>
            </div>
            {contract?.period_end && (
              <div className="ml-auto text-right">
                <p className="text-sm text-muted-foreground">Laufzeitende</p>
                <p className="font-medium">{periodEnd}</p>
              </div>
            )}
          </div>

          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              Deine Kündigung wird zum Ende der aktuellen Vertragslaufzeit wirksam.
              Du kannst Hufi bis dahin weiterhin vollständig nutzen.
              <br /><br />
              <strong>Kündigungsfrist:</strong> 30 Tage zum Laufzeitende
            </AlertDescription>
          </Alert>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Grund der Kündigung *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Bitte auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label>Was können wir verbessern? (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Dein Feedback hilft uns, Hufi besser zu machen..."
              rows={3}
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3 p-3 rounded-lg border">
            <Checkbox
              id="confirm-cancel"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
            />
            <Label htmlFor="confirm-cancel" className="text-sm leading-relaxed cursor-pointer">
              Ich bestätige, dass ich mein Hufi-Abonnement kündigen möchte.
            </Label>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            variant="destructive"
            disabled={!reason || !confirmed || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Kündigung absenden
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
