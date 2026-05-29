import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Repeat2,
  Calendar,
  MapPin,
  Euro,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";

interface BhsSub {
  id: string;
  horse_id: string;
  interval_weeks: number;
  zone: number;
  monthly_price: number;
  product_variant: string;
  status: SubscriptionStatus;
  cancelled_by: string | null;
  started_at: string | null;
  next_service_date: string | null;
  cancelled_at: string | null;
  horses: { name: string; eqid: string | null } | null;
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  paused: "Pausiert",
  cancelled: "Gekündigt",
};

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  active: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function cancellationDate(): string {
  return format(addWeeks(new Date(), 4), "d. MMMM yyyy", { locale: de });
}

export default function ClientBhsAbo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState<BhsSub | null>(null);

  const { data: subscriptions = [], isLoading } = useQuery<BhsSub[]>({
    queryKey: ["client-bhs-subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("bhs_horse_subscriptions")
        .select(`
          id, horse_id, interval_weeks, zone, monthly_price, product_variant,
          status, cancelled_by, started_at, next_service_date, cancelled_at,
          horses ( name, eqid )
        `)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BhsSub[];
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (sub: BhsSub) => {
      const { error } = await supabase
        .from("bhs_horse_subscriptions")
        .update({
          status: "cancelled",
          cancelled_by: "client",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Kundenkündigung via App",
        })
        .eq("id", sub.id)
        .eq("client_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-bhs-subscriptions", user?.id] });
      toast({ title: "Kündigung eingeleitet", description: `Das Abo wird zum ${cancellationDate()} beendet.` });
      setCancelTarget(null);
    },
    onError: (err) => {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Kündigung fehlgeschlagen.", variant: "destructive" });
    },
  });

  const active = subscriptions.filter((s) => s.status === "active" || s.status === "pending" || s.status === "paused");
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-amber-600" />
            Mein BHS Abo
          </h1>
          <p className="text-xs text-muted-foreground">Hufpflege-Abonnement für deine Pferde</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Repeat2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">Kein BHS Balance Abo gefunden</p>
            <p className="text-xs text-muted-foreground mt-1">
              Noch kein Abo abgeschlossen? Sprich deinen Hufbearbeiter an.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Aktive Abos */}
          {active.length > 0 && (
            <div className="space-y-3">
              {active.map((sub) => (
                <AboCard
                  key={sub.id}
                  sub={sub}
                  onCancel={() => setCancelTarget(sub)}
                />
              ))}
            </div>
          )}

          {/* Gekündigte Abos */}
          {cancelled.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Beendete Abos</p>
              {cancelled.map((sub) => (
                <AboCard key={sub.id} sub={sub} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Kündigungs-Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abo kündigen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Du möchtest das BHS Balance Abo für{" "}
                  <strong>{cancelTarget?.horses?.name ?? "dein Pferd"}</strong> kündigen.
                </p>
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                  <p className="font-medium">Kündigung zum {cancellationDate()} möglich</p>
                  <p className="text-xs mt-0.5">Es gilt eine Kündigungsfrist von 4 Wochen ab heute.</p>
                </div>
                <p className="text-muted-foreground">
                  Dein Hufbearbeiter wird über die Kündigung informiert.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Jetzt kündigen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AboCard({ sub, onCancel }: { sub: BhsSub; onCancel?: () => void }) {
  const zoneLabel =
    sub.zone === 1 ? "Zone 1 (≤ 25 km)" : sub.zone === 2 ? "Zone 2 (≤ 50 km)" : `Zone ${sub.zone}`;

  const isCancelable = sub.status === "active" || sub.status === "pending";

  return (
    <Card className={cn("transition-opacity", sub.status === "cancelled" && "opacity-60")}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{sub.horses?.name ?? "Pferd"}</CardTitle>
          {sub.horses?.eqid && (
            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {sub.horses.eqid}
            </span>
          )}
        </div>
        <Badge className={cn("text-xs border shrink-0", STATUS_COLORS[sub.status])}>
          {STATUS_LABELS[sub.status]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Details-Zeile */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            alle {sub.interval_weeks} Wochen
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {zoneLabel}
          </span>
          <span className="flex items-center gap-1">
            <Euro className="h-3.5 w-3.5" />
            {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(sub.monthly_price)}/Monat
          </span>
        </div>

        {/* Nächster Termin */}
        {sub.next_service_date && sub.status === "active" && (
          <p className="text-sm">
            <span className="text-muted-foreground">Nächster Termin: </span>
            <span className="font-medium">
              {format(new Date(sub.next_service_date), "d. MMMM yyyy", { locale: de })}
            </span>
          </p>
        )}

        {/* Kündigungsdatum */}
        {sub.status === "cancelled" && sub.cancelled_at && (
          <p className="text-xs text-muted-foreground">
            Beendet am {format(new Date(sub.cancelled_at), "d. MMMM yyyy", { locale: de })}
          </p>
        )}

        {/* Kündigen-Button */}
        {isCancelable && onCancel && (
          <div className="pt-1 border-t border-border/50">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Kündigung zum {cancellationDate()} möglich (4 Wochen Frist)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
