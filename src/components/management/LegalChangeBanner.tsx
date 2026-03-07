import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PendingChange {
  confirmation_id: string;
  notification_id: string;
  title: string;
  summary: string;
  type: string;
  effective_date: string;
  requires_action: boolean;
}

export function LegalChangeBanner() {
  const { user } = useAuth();
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) fetchPending();
  }, [user?.id]);

  const fetchPending = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: confirmations } = await supabase
      .from("legal_change_confirmations")
      .select("id, notification_id, action")
      .eq("provider_id", user.id)
      .eq("action", "pending");

    if (!confirmations?.length) {
      setChanges([]);
      setLoading(false);
      return;
    }

    const notifIds = confirmations.map((c) => c.notification_id);
    const { data: notifications } = await supabase
      .from("legal_change_notifications")
      .select("id, title, summary, type, effective_date, requires_action")
      .in("id", notifIds);

    const merged: PendingChange[] = confirmations.map((c) => {
      const n = notifications?.find((n) => n.id === c.notification_id);
      return {
        confirmation_id: c.id,
        notification_id: c.notification_id,
        title: n?.title || "Änderung",
        summary: n?.summary || "",
        type: n?.type || "agb",
        effective_date: n?.effective_date || "",
        requires_action: n?.requires_action ?? true,
      };
    });

    setChanges(merged);
    setLoading(false);
  };

  const handleConfirm = async (confirmationId: string) => {
    setConfirming(confirmationId);
    try {
      const { error } = await supabase
        .from("legal_change_confirmations")
        .update({ action: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", confirmationId);

      if (error) throw error;

      // Timeline
      await supabase.from("provider_timeline_events").insert({
        provider_id: user!.id,
        event_type: "legal_confirmed",
        title: "Änderung bestätigt",
        description: changes.find((c) => c.confirmation_id === confirmationId)?.title || "",
        icon: "⚖️",
        is_auto: false,
      });

      toast.success("Änderung bestätigt");
      setChanges((prev) => prev.filter((c) => c.confirmation_id !== confirmationId));
    } catch {
      toast.error("Fehler bei der Bestätigung");
    } finally {
      setConfirming(null);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    agb: "AGB",
    datenschutz: "Datenschutz",
    nutzungsvertrag: "Nutzungsvertrag",
    preise: "Preisänderung",
  };

  if (loading || changes.length === 0) return null;

  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <Alert
          key={change.confirmation_id}
          className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-amber-700 border-amber-400">
                {TYPE_LABELS[change.type] || change.type}
              </Badge>
              <span className="font-medium text-amber-800 dark:text-amber-300">
                {change.title}
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {change.summary}
            </p>
            {change.effective_date && (
              <p className="text-xs text-amber-600">
                Gültig ab: {format(new Date(change.effective_date), "dd.MM.yyyy", { locale: de })}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleConfirm(change.confirmation_id)}
                disabled={confirming === change.confirmation_id}
              >
                {confirming === change.confirmation_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Bestätigen
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
