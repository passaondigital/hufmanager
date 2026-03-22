import { motion } from "framer-motion";
import { Trophy, TrendingUp, Target, Rocket, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePferdeakteGlobalStats } from "@/hooks/usePferdeakteGlobalStats";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { cn } from "@/lib/utils";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("de-DE");
}

export function Mission1MillionWidget() {
  const { stats, nextMilestone, lastReached, progressToNext, isLoading } = usePferdeakteGlobalStats();

  const animatedTotal = useAnimatedCounter(stats?.total_pferdeakten ?? 0, 1200, !isLoading);
  const animatedBesitzer = useAnimatedCounter(stats?.total_besitzer ?? 0, 800, !isLoading);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const GOAL = 1_000_000;
  const globalProgress = Math.min((stats.total_pferdeakten / GOAL) * 100, 100);

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Header with gradient */}
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          Mission 1 Million
          <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            LIVE
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Big counter */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-3xl font-black text-foreground tracking-tight">
            {formatNumber(animatedTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pferdeakten im System
          </p>
        </motion.div>

        {/* Progress to 1M */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Fortschritt zur Million</span>
            <span className="font-semibold text-foreground">{globalProgress.toFixed(2)}%</span>
          </div>
          <Progress value={globalProgress} className="h-2.5" />
        </div>

        {/* Next milestone */}
        {nextMilestone && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{nextMilestone.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Nächstes Ziel: {nextMilestone.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {nextMilestone.description}
                </p>
              </div>
            </div>
            <Progress value={progressToNext} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              noch {formatNumber(nextMilestone.target_count - stats.total_pferdeakten)} Pferdeakten
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
            <Users className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
            <p className="text-sm font-bold text-foreground">{formatNumber(animatedBesitzer)}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Besitzer</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
            <TrendingUp className="h-3.5 w-3.5 mx-auto mb-0.5 text-green-500" />
            <p className="text-sm font-bold text-foreground">+{stats.new_last_7_days}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">7 Tage</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-2 text-center">
            <Target className="h-3.5 w-3.5 mx-auto mb-0.5 text-blue-500" />
            <p className="text-sm font-bold text-foreground">+{stats.new_last_30_days}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">30 Tage</p>
          </div>
        </div>

        {/* Last reached milestone badge */}
        {lastReached && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
            <Trophy className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[11px] text-foreground">
              <span className="font-semibold">Erreicht:</span>{" "}
              <span className="text-muted-foreground">{lastReached.title}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
