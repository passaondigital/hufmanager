import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle2, Truck } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProviderTourStatusWidgetProps {
  userId: string;
}

type ClientTourStatus = {
  isActive: boolean;
  providerName: string;
  completedCount: number;
  totalCount: number;
  myPosition: number;
  stationsAway: number;
  isMyTurn: boolean;
  isCompleted: boolean;
  myTime: string | null;
  estimatedArrival: string | null;
  etaSource: "live" | "average" | null;
  horseName: string | null;
  hasDelay: boolean;
  delayMinutes: number;
  delayMessage: string | null;
};

export function ProviderTourStatusWidget({ userId }: ProviderTourStatusWidgetProps) {
  const { data: tourStatus, isLoading } = useQuery({
    queryKey: ["client-tour-status", userId, format(new Date(), "yyyy-MM-dd")],
    queryFn: async () => {
      const date = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase.functions.invoke("get-client-tour-status", {
        body: { date },
      });

      if (error) {
        console.error("Client tour status failed", { message: error.message });
        return null;
      }

      return (data?.tourStatus ?? null) as ClientTourStatus | null;
    },
    enabled: !!userId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (isLoading || !tourStatus) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className={cn(
          "overflow-hidden border-2",
          tourStatus.isMyTurn && !tourStatus.isCompleted
            ? "border-primary bg-primary/5"
            : tourStatus.hasDelay
              ? "border-amber-500 bg-amber-500/5"
              : "border-blue-500/30 bg-blue-500/5"
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                tourStatus.isMyTurn ? "bg-primary/20" : "bg-blue-500/20"
              )}>
                <Truck className={cn(
                  "h-5 w-5",
                  tourStatus.isMyTurn ? "text-primary" : "text-blue-600"
                )} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {tourStatus.providerName} ist unterwegs
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  <span>Live-Tour aktiv</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {tourStatus.completedCount}/{tourStatus.totalCount}
              </Badge>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${tourStatus.totalCount > 0 ? (tourStatus.completedCount / tourStatus.totalCount) * 100 : 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {tourStatus.isCompleted ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Dein Termin wurde abgeschlossen!</span>
              </div>
            ) : tourStatus.isMyTurn ? (
              <div className="flex items-start gap-2 text-primary text-sm">
                <MapPin className="mt-0.5 h-4 w-4 animate-bounce" />
                <div>
                  <div className="font-semibold">Du bist als Nächstes dran!</div>
                  {tourStatus.estimatedArrival && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {tourStatus.etaSource === "live" ? "Live-Ankunft" : "Ankunft"} ca. {tourStatus.estimatedArrival} Uhr
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Noch {tourStatus.stationsAway} Station{tourStatus.stationsAway !== 1 ? "en" : ""} vor dir
                  {tourStatus.estimatedArrival && ` • Ankunft ca. ${tourStatus.estimatedArrival} Uhr`}
                  {!tourStatus.estimatedArrival && tourStatus.myTime && ` • geplant um ${tourStatus.myTime}`}
                </span>
              </div>
            )}

            {tourStatus.hasDelay && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg p-3 text-sm">
                ⚠️ Verzögerung: ca. {tourStatus.delayMinutes} Min.
                {tourStatus.delayMessage && (
                  <p className="text-xs mt-1 opacity-80">{tourStatus.delayMessage}</p>
                )}
              </div>
            )}

            {tourStatus.horseName && !tourStatus.isCompleted && (
              <div className="text-xs text-muted-foreground">
                🐴 Termin für: {tourStatus.horseName}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
