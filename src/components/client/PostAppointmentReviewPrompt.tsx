import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";

interface CompletedAppointment {
  id: string;
  horse_name: string;
  completed_at: string;
  provider_id: string;
  provider_subdomain: string | null;
}

export function PostAppointmentReviewPrompt() {
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<CompletedAppointment | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchRecentCompleted = async () => {
      try {
        // Find appointments completed in last 48 hours
        const { data } = await supabase
          .from("appointments")
          .select(`
            id, completed_at, provider_id,
            horses!inner(name, owner_id)
          `)
          .eq("status", "completed")
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(5);

        if (!data) return;

        const now = new Date();
        for (const appt of data) {
          const horse = appt.horses as any;
          if (horse?.owner_id !== user.id) continue;

          const completedAt = parseISO(appt.completed_at!);
          if (differenceInHours(now, completedAt) > 48) continue;

          // Check if already dismissed in localStorage
          const dismissKey = `review_dismissed_${appt.id}`;
          if (localStorage.getItem(dismissKey)) continue;

          // Get provider subdomain for review link
          const { data: bs } = await supabase
            .rpc('get_public_review_provider', { provider_id_input: appt.provider_id });

          setAppointment({
            id: appt.id,
            horse_name: horse.name,
            completed_at: appt.completed_at!,
            provider_id: appt.provider_id,
            provider_subdomain: null,
          });
          break;
        }
      } catch (err) {
        console.error("Error checking for review prompt:", err);
      }
    };

    fetchRecentCompleted();
  }, [user?.id]);

  if (!appointment || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`review_dismissed_${appointment.id}`, "true");
    setDismissed(true);
  };

  const handleReview = () => {
    // Navigate to review submission
    window.open(`/review/${appointment.provider_id}`, "_blank");
    handleDismiss();
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">
              Wie war der Termin für {appointment.horse_name}?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deine Bewertung hilft deinem Hufbearbeiter
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="default" className="gap-1.5" onClick={handleReview}>
                <Star className="h-3.5 w-3.5" />
                Jetzt bewerten
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Später
              </Button>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={handleDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
