import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, X } from "lucide-react";
import { PricingModal } from "./PricingModal";

const TRIAL_DURATION_DAYS = 14;
const DEMO_EMAIL = "hufbearbeiter.hufmanager@gmail.com";

export function TrialCountdownBanner() {
  const { status, plan, loading } = useSubscription();
  const { user, role } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Only show for trialing providers
  if (loading || dismissed) return null;
  if (role !== "provider") return null;
  if (status !== "trialing") return null;
  if (user?.email === DEMO_EMAIL) return null;

  // Calculate days remaining from user creation
  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  if (!createdAt) return null;

  const now = new Date();
  const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DURATION_DAYS - elapsed);
  const progress = ((TRIAL_DURATION_DAYS - daysLeft) / TRIAL_DURATION_DAYS) * 100;

  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft === 0;

  return (
    <>
      <div className="relative border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <Clock className={`h-4 w-4 ${isUrgent ? "text-destructive" : "text-primary"}`} />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {isExpired
                  ? "Deine Testphase ist abgelaufen"
                  : `Noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"} Testphase`}
              </span>
              <Badge
                variant="secondary"
                className={`text-[10px] ${isUrgent ? "bg-destructive/10 text-destructive" : ""}`}
              >
                {plan === "starter" ? "Anfänger" : plan === "advanced" ? "Fortgeschritten" : "Test"}
              </Badge>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <Button
            size="sm"
            variant={isUrgent ? "default" : "secondary"}
            className="shrink-0 gap-1.5 text-xs h-8"
            onClick={() => setPricingOpen(true)}
          >
            {isExpired ? "Paket wählen" : "Upgraden"}
            <ArrowRight className="h-3 w-3" />
          </Button>

          {!isExpired && (
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        title="Paket wählen"
        description="Sicher dir deinen HufManager – alle Pakete 14 Tage kostenlos."
        currentPlan={plan}
      />
    </>
  );
}
