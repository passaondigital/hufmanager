import { useNavigate } from "react-router-dom";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHufmanagerSlimAccess } from "@/hooks/useHufmanagerSlimAccess";
import { slimTrialInfo } from "@/lib/slimTrial";

// Ab Tag 1 der Testphase sichtbar: Resttage, Enddatum, Kauf-CTA. Bezahlt/manuell → nichts.
export function SlimTrialBanner() {
  const navigate = useNavigate();
  const { context } = useHufmanagerSlimAccess();
  const info = slimTrialInfo(context?.reasonCode, context?.trialEndsAt);
  if (!info) return null;
  const urgent = info.daysLeft <= 3;
  return (
    <div
      role="status"
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${urgent ? "border-amber-500/60 bg-amber-500/10" : "border-hm-border bg-hm-surface"}`}
    >
      <div className="flex items-center gap-2 text-foreground">
        <Hourglass className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>Testphase aktiv</strong> · noch {info.daysLeft} {info.daysLeft === 1 ? "Tag" : "Tage"} (bis {info.endDateLabel})
        </span>
      </div>
      <Button size="sm" className="h-auto min-h-10 shrink-0 whitespace-normal py-2 text-left sm:text-center" onClick={() => navigate("/management/abo")}>
        Jetzt HufManager freischalten – 19,95 €/Monat
      </Button>
    </div>
  );
}
