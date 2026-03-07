import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Send, PenTool, Receipt, Check, AlertTriangle, Bell, Mail,
  Lock, Unlock, X, Loader2, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProviderManualActionsProps {
  providerId: string;
  providerName: string;
  providerEmail: string | null;
  providerPlan: string;
  onRefresh: () => void;
}

export function ProviderManualActions({
  providerId, providerName, providerEmail, providerPlan, onRefresh,
}: ProviderManualActionsProps) {
  const { user } = useAuth();
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");

  const logTimeline = async (eventType: string, title: string, description: string, icon: string) => {
    await supabase.from("provider_timeline_events").insert({
      provider_id: providerId,
      event_type: eventType,
      title,
      description,
      icon,
      is_auto: false,
      triggered_by: user?.id,
    });
  };

  const executeAction = async (action: string) => {
    setExecuting(true);
    try {
      switch (action) {
        case "create_contract": {
          await supabase.functions.invoke("onboard-provider", {
            body: { provider_id: providerId, plan: providerPlan || "pro", payment_method: "bank_transfer" },
          });
          toast.success("Vertrag erstellt & gesendet");
          break;
        }
        case "resend_contract": {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: providerId,
              title: "Vertrag zur Unterzeichnung 📄",
              body: "Bitte unterzeichne deinen HufManager-Nutzungsvertrag.",
              url: "/management?tab=b2b-management",
            },
          });
          await logTimeline("notification_sent", "Vertrag erneut gesendet", "Manuell durch Admin", "📤");
          toast.success("Erinnerung gesendet");
          break;
        }
        case "mark_signed": {
          const { data: contract } = await supabase
            .from("admin_contracts")
            .select("id")
            .eq("provider_id", providerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (contract) {
            await supabase.from("admin_contracts")
              .update({ status: "active", provider_signed_at: new Date().toISOString() })
              .eq("id", contract.id);
            await logTimeline("contract_signed", "Als unterzeichnet markiert", "Manuell durch Admin", "🖊️");
            toast.success("Vertrag als unterzeichnet markiert");
          } else {
            toast.error("Kein Vertrag gefunden");
          }
          break;
        }
        case "mark_paid": {
          const { data: invoice } = await supabase
            .from("admin_invoices")
            .select("id, invoice_number, total")
            .eq("provider_id", providerId)
            .in("status", ["sent", "draft"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (invoice) {
            await supabase.from("admin_invoices")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", invoice.id);
            await logTimeline("invoice_paid", `Rechnung ${invoice.invoice_number} bezahlt`, `${invoice.total} € – manuell markiert`, "✅");
            toast.success("Als bezahlt markiert");
          } else {
            toast.error("Keine offene Rechnung gefunden");
          }
          break;
        }
        case "send_push": {
          if (!pushTitle || !pushBody) { toast.error("Titel und Text erforderlich"); break; }
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: providerId, title: pushTitle, body: pushBody, url: "/management" },
          });
          await logTimeline("notification_sent", `Push: ${pushTitle}`, pushBody, "🔔");
          toast.success("Push gesendet");
          setPushTitle("");
          setPushBody("");
          break;
        }
        case "suspend": {
          await supabase.from("profiles").update({ plan_status: "suspended" }).eq("id", providerId);
          await logTimeline("access_suspended", "Zugang gesperrt", "Manuell durch Admin", "🔒");
          toast.success("Zugang gesperrt");
          break;
        }
        case "unsuspend": {
          await supabase.from("profiles").update({ plan_status: "active" }).eq("id", providerId);
          await logTimeline("access_reactivated", "Zugang reaktiviert", "Manuell durch Admin", "🔓");
          toast.success("Zugang reaktiviert");
          break;
        }
        case "confirm_cancellation": {
          const { data: contract } = await supabase
            .from("admin_contracts")
            .select("id")
            .eq("provider_id", providerId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          if (contract) {
            await supabase.from("admin_contracts")
              .update({ status: "cancelled", cancellation_effective_date: new Date().toISOString().split("T")[0] })
              .eq("id", contract.id);
            await logTimeline("contract_cancelled", "Kündigung bestätigt", "Manuell durch Admin", "❌");
            toast.success("Kündigung bestätigt");
          }
          break;
        }
      }
      setActionDialog(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Fehler");
    } finally {
      setExecuting(false);
    }
  };

  const ActionButton = ({ icon: Icon, label, action, variant = "outline" }: any) => (
    <Button variant={variant} size="sm" className="justify-start text-xs h-8" onClick={() => {
      if (action === "send_push") { setActionDialog("send_push"); return; }
      if (window.confirm(`"${label}" für ${providerName} ausführen?`)) executeAction(action);
    }}>
      <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
      {label}
    </Button>
  );

  return (
    <>
      <div className="space-y-3 pt-3 border-t">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="w-4 h-4 text-primary" /> Manuelle Aktionen
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vertrag</p>
            <ActionButton icon={FileText} label="Vertrag erstellen & senden" action="create_contract" />
            <ActionButton icon={Send} label="Vertrag erneut senden" action="resend_contract" />
            <ActionButton icon={PenTool} label="Als unterzeichnet markieren" action="mark_signed" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rechnung</p>
            <ActionButton icon={Check} label="Als bezahlt markieren" action="mark_paid" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Benachrichtigungen</p>
            <ActionButton icon={Bell} label="Push senden" action="send_push" />
            {providerEmail && (
              <Button variant="outline" size="sm" className="justify-start text-xs h-8" asChild>
                <a href={`mailto:${providerEmail}`}><Mail className="h-3.5 w-3.5 mr-1.5" /> E-Mail senden</a>
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zugang</p>
            <ActionButton icon={Lock} label="Zugang sperren" action="suspend" />
            <ActionButton icon={Unlock} label="Zugang reaktivieren" action="unsuspend" />
            <ActionButton icon={X} label="Kündigung bestätigen" action="confirm_cancellation" />
          </div>
        </div>
      </div>

      {/* Push Dialog */}
      <Dialog open={actionDialog === "send_push"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push an {providerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Titel..." />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Nachricht..." rows={3} />
            </div>
            <Button onClick={() => executeAction("send_push")} disabled={executing} className="w-full">
              {executing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              Push senden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
