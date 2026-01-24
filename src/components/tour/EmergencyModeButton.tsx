import { useState } from "react";
import { AlertTriangle, X, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmergencyModeButtonProps {
  tourDate: Date;
  appointmentIds: string[];
  onEmergencyStart?: () => void;
  onEmergencyEnd?: () => void;
}

export function EmergencyModeButton({
  tourDate,
  appointmentIds,
  onEmergencyStart,
  onEmergencyEnd,
}: EmergencyModeButtonProps) {
  const { user } = useAuth();
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [estimatedDelay, setEstimatedDelay] = useState(30);
  const [isSending, setIsSending] = useState(false);
  const [emergencyStartTime, setEmergencyStartTime] = useState<Date | null>(null);

  const handleStartEmergency = async () => {
    if (!user) return;
    setIsSending(true);

    try {
      const dateStr = format(tourDate, "yyyy-MM-dd");

      // 1. Get or create daily tour
      const { data: existingTour } = await supabase
        .from("daily_tours")
        .select("id")
        .eq("provider_id", user.id)
        .eq("tour_date", dateStr)
        .maybeSingle();

      let tourId = existingTour?.id;

      if (!tourId) {
        const { data: newTour, error: tourError } = await supabase
          .from("daily_tours")
          .insert({
            provider_id: user.id,
            tour_date: dateStr,
            status: "active",
            start_time: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (tourError) throw tourError;
        tourId = newTour.id;
      }

      // 2. Create emergency status entry
      const { error: emergencyError } = await supabase
        .from("tour_emergency_status")
        .insert({
          tour_id: tourId,
          provider_id: user.id,
          reason: emergencyReason || "Notfall-Termin",
          estimated_delay_minutes: estimatedDelay,
          notifications_sent: true,
        });

      if (emergencyError) throw emergencyError;

      // 3. Send push notifications to all remaining clients
      for (const appointmentId of appointmentIds) {
        const { data: appointment } = await supabase
          .from("appointments")
          .select("horse_id, horses(owner_id, name)")
          .eq("id", appointmentId)
          .single();

        if (appointment?.horses?.owner_id) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: appointment.horses.owner_id,
              title: "🚨 Verspätung angekündigt",
              body: `Ihr Hufbearbeiter ist bei einem Notfall-Termin. Erwartete Verzögerung: ca. ${estimatedDelay} Minuten.`,
              data: { type: "emergency_delay" },
            },
          });
        }
      }

      setIsEmergencyActive(true);
      setEmergencyStartTime(new Date());
      setShowStartDialog(false);
      onEmergencyStart?.();

      toast.success(`Notfall-Modus aktiv. ${appointmentIds.length} Kunden wurden benachrichtigt.`);
    } catch (error) {
      console.error("Error starting emergency mode:", error);
      toast.error("Fehler beim Aktivieren des Notfall-Modus");
    } finally {
      setIsSending(false);
    }
  };

  const handleEndEmergency = async () => {
    if (!user) return;
    setIsSending(true);

    try {
      const dateStr = format(tourDate, "yyyy-MM-dd");

      // Update emergency status to ended
      await supabase
        .from("tour_emergency_status")
        .update({ ended_at: new Date().toISOString() })
        .eq("provider_id", user.id)
        .is("ended_at", null);

      // Notify clients that emergency is over
      for (const appointmentId of appointmentIds) {
        const { data: appointment } = await supabase
          .from("appointments")
          .select("horse_id, horses(owner_id, name)")
          .eq("id", appointmentId)
          .single();

        if (appointment?.horses?.owner_id) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: appointment.horses.owner_id,
              title: "✅ Tour fortgesetzt",
              body: "Ihr Hufbearbeiter ist wieder unterwegs. Die Tour geht weiter wie geplant.",
              data: { type: "emergency_resolved" },
            },
          });
        }
      }

      setIsEmergencyActive(false);
      setEmergencyStartTime(null);
      setShowEndDialog(false);
      setEmergencyReason("");
      onEmergencyEnd?.();

      toast.success("Notfall-Modus beendet. Kunden wurden informiert.");
    } catch (error) {
      console.error("Error ending emergency mode:", error);
      toast.error("Fehler beim Beenden des Notfall-Modus");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Main Toggle Button */}
      <Button
        variant={isEmergencyActive ? "destructive" : "outline"}
        size="lg"
        className={cn(
          "gap-2 font-semibold shadow-lg transition-all",
          isEmergencyActive && "animate-pulse"
        )}
        onClick={() => isEmergencyActive ? setShowEndDialog(true) : setShowStartDialog(true)}
      >
        {isEmergencyActive ? (
          <>
            <X className="h-5 w-5" />
            Notfall beenden
            {emergencyStartTime && (
              <Badge variant="secondary" className="ml-1 text-xs">
                seit {format(emergencyStartTime, "HH:mm")}
              </Badge>
            )}
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5" />
            Notfall-Termin
          </>
        )}
      </Button>

      {/* Start Emergency Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Notfall-Modus aktivieren
            </DialogTitle>
            <DialogDescription>
              Alle verbleibenden Kunden auf Ihrer Tour werden per Push-Nachricht über die Verzögerung informiert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delay">Geschätzte Verzögerung (Minuten)</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="delay"
                  type="number"
                  value={estimatedDelay}
                  onChange={(e) => setEstimatedDelay(parseInt(e.target.value) || 30)}
                  min={5}
                  max={180}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">Minuten</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Grund (optional, für interne Notizen)</Label>
              <Textarea
                id="reason"
                placeholder="z.B. Hufabszess, Notbeschlag..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                rows={2}
              />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <Send className="inline h-4 w-4 mr-1" />
                <strong>{appointmentIds.length} Kunden</strong> werden benachrichtigt
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleStartEmergency}
              disabled={isSending}
              className="gap-2"
            >
              {isSending ? (
                "Sende Benachrichtigungen..."
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Notfall starten & benachrichtigen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Emergency Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notfall-Modus beenden</DialogTitle>
            <DialogDescription>
              Die Kunden werden informiert, dass Sie Ihre Tour fortsetzen.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEndEmergency} disabled={isSending} className="gap-2">
              {isSending ? "Wird beendet..." : "Notfall beenden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
