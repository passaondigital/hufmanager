import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight } from "lucide-react";

interface CheckItem {
  label: string;
  done: boolean;
  action?: () => void;
}

interface Props {
  copecartUsername: string | null;
  totalClicks: number;
  totalConversions: number;
}

export function BotschafterChecklist({ copecartUsername, totalClicks, totalConversions }: Props) {
  const navigate = useNavigate();
  const werbemittelVisited = typeof window !== "undefined" && localStorage.getItem("hm_werbemittel_visited") === "true";

  const items: CheckItem[] = [
    { label: "Registrierung abgeschlossen", done: true },
    { label: "CopeCart-Account hinterlegt", done: !!copecartUsername, action: () => document.getElementById("copecart-box")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Ersten Werbemittel-Text kopiert", done: werbemittelVisited, action: () => navigate("/botschafter/werbemittel") },
    { label: "Ersten Link geteilt", done: totalClicks > 0 },
    { label: "Erste Conversion erreicht", done: totalConversions > 0 },
  ];

  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  // If all done, check if we should hide (1 week after completion)
  if (allDone) {
    const completedAt = localStorage.getItem("hm_checklist_completed_at");
    if (!completedAt) {
      localStorage.setItem("hm_checklist_completed_at", new Date().toISOString());
    } else {
      const daysSince = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) return null;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {allDone ? "🎉 Du hast alle ersten Schritte abgeschlossen!" : "Erste Schritte"}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{doneCount}/{items.length}</span>
        </div>
        <Progress value={(doneCount / items.length) * 100} className="h-2 mt-2 [&>div]:bg-orange-500" />
      </CardHeader>
      {!allDone && (
        <CardContent className="pt-0 space-y-1.5">
          {items.map((item, i) => {
            const isActive = !item.done && items.slice(0, i).every(prev => prev.done);
            return (
              <button
                key={i}
                onClick={item.action}
                disabled={item.done || !item.action}
                className={`w-full flex items-center gap-2.5 text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  item.done ? "text-muted-foreground" : isActive ? "font-semibold text-foreground hover:bg-muted" : "text-muted-foreground/70"
                }`}
              >
                {item.done ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : isActive ? (
                  <ArrowRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                )}
                <span className={item.done ? "line-through" : ""}>{item.label}</span>
              </button>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
