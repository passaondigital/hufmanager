import { useState } from "react";
import { Navigation, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { TourAppointment } from "./TourCard";

interface OnMyWayButtonProps {
  appointment: TourAppointment;
  userLocation: [number, number] | null;
  routeDurationMinutes: number | null;
  providerDisplayName?: string;
}

export function OnMyWayButton({ appointment, userLocation, routeDurationMinutes, providerDisplayName }: OnMyWayButtonProps) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOnMyWay = async () => {
    if (!appointment.client?.id) return;

    setSending(true);
    try {
      const eta = routeDurationMinutes 
        ? `ca. ${routeDurationMinutes} Min.`
        : "in Kürze";

      const horseName = appointment.horses?.[0]?.name || "Ihr Pferd";

      // Resolve provider display name dynamically
      let displayName = providerDisplayName;
      if (!displayName && user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.full_name) {
          displayName = profile.full_name;
        } else {
          const { data: bs } = await supabase
            .from("business_settings")
            .select("business_name")
            .eq("user_id", user.id)
            .maybeSingle();
          displayName = bs?.business_name || "Dein Hufpfleger";
        }
      }
      if (!displayName) displayName = "Dein Hufpfleger";

      // Create in-app notification for client
      await supabase.from("notifications").insert({
        user_id: appointment.client.id,
        title: `🚗 ${displayName} ist unterwegs!`,
        message: `${displayName} ist auf dem Weg zu ${horseName}. Geschätzte Ankunft: ${eta}. Bitte Pferd bereitstellen.`,
        type: "on_my_way",
        link: "/client-home",
      });

      // Send push notification
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: appointment.client.id,
            title: `🚗 ${displayName} ist unterwegs!`,
            body: `Ankunft ${eta} – bitte ${horseName} bereitstellen.`,
            url: "/client-home",
          },
        });
      }

      setSent(true);
      toast({
        title: "Kunde benachrichtigt",
        description: `${appointment.client.full_name} wurde informiert (ETA: ${eta}).`,
      });

      // Reset after 30 seconds
      setTimeout(() => setSent(false), 30000);
    } catch (error) {
      console.error("On My Way error:", error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!appointment.client?.id) return null;

  return (
    <Button
      size="sm"
      variant={sent ? "secondary" : "default"}
      className="gap-1.5 h-8"
      onClick={handleOnMyWay}
      disabled={sending || sent}
    >
      {sending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : sent ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
      ) : (
        <Navigation className="h-3.5 w-3.5" />
      )}
      {sent ? "Gesendet" : "Ich komme"}
    </Button>
  );
}
