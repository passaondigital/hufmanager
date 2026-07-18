import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addWeeks } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, ExternalLink, Repeat2, MapPin, Calendar, Euro, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";
type FilterTab = "active" | "paused" | "cancelled" | "all";

interface BhsSub {
  id: string;
  horse_id: string;
  client_id: string;
  interval_weeks: number;
  zone: number;
  monthly_price: number;
  product_variant: string;
  copecart_subscription_id: string | null;
  status: SubscriptionStatus;
  cancelled_by: string | null;
  started_at: string | null;
  next_service_date: string | null;
  cancelled_at: string | null;
  created_at: string;
  horses: { name: string; eqid: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
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

function cancellationDeadline(fromDate?: string | null): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  return format(addWeeks(base, 4), "d. MMMM yyyy", { locale: de });
}

export default function BhsBalanceCockpit() {
  const { user } = useAuth();
  const { isActive: isSubscribed } = useSubscription();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterTab>("active");
  const [cancelTarget, setCancelTarget] = useState<BhsSub | null>(null);

  const { data: subscriptions = [], isLoading } = useQuery<BhsSub[]>({
    queryKey: ["bhs-subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("bhs_horse_subscriptions")
        .select(`
          *,
          horses ( name, eqid ),
          profiles!bhs_horse_subscriptions_client_id_fkey ( full_name, email )
        `)
        .eq("provider_id", user.id)
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
          cancelled_by: "provider",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Provider-Kündigung via Cockpit",
        })
        .eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bhs-subscriptions", user?.id] });
      toast({ title: "Kündigung eingeleitet", description: "Das Abo wurde zum nächstmöglichen Datum gekündigt." });
      setCancelTarget(null);
    },
    onError: (err) => {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Kündigung fehlgeschlagen.", variant: "destructive" });
    },
  });

  const filtered = subscriptions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "active") return s.status === "active" || s.status === "pending";
    return s.status === filter;
  });

  const counts = {
    active: subscriptions.filter((s) => s.status === "active" || s.status === "pending").length,
    paused: subscriptions.filter((s) => s.status === "paused").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
    all: subscriptions.length,
  };

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      {/* HufiApp-Upgrade-Banner — nur wenn kein aktives Abo */}
      {!isSubscribed && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Mit einem aktiven Hufi-Abo wird dieser Überblick automatisch aktuell gehalten und mit dem Kalender synchronisiert.
          </span>
          <a
            href="https://hufiapp.de/preise"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 whitespace-nowrap font-medium underline-offset-2 hover:underline"
          >
            Upgrade ansehen <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-amber-600" />
            BHS Balance Abos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.active} aktiv · {counts.paused} pausiert · {counts.cancelled} gekündigt
          </p>
        </div>
      </div>

      {/* Filter-Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="active">Aktiv ({counts.active})</TabsTrigger>
          <TabsTrigger value="paused">Pausiert ({counts.paused})</TabsTrigger>
          <TabsTrigger value="cancelled">Gekündigt ({counts.cancelled})</TabsTrigger>
          <TabsTrigger value="all">Alle ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Repeat2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Abos in dieser Kategorie.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((sub) => (
            <Card key={sub.id} className={cn("transition-opacity", sub.status === "cancelled" && "opacity-60")}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-semibold">
                    {sub.horses?.name ?? "Unbekanntes Pferd"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {sub.profiles?.full_name ?? sub.profiles?.email ?? "Unbekannter Kunde"}
                    {sub.horses?.eqid && (
                      <span className="ml-1.5 font-mono text-[10px] bg-muted px-1 rounded">
                        {sub.horses.eqid}
                      </span>
                    )}
                  </p>
                </div>
                <Badge className={cn("text-xs border shrink-0", STATUS_COLORS[sub.status])}>
                  {STATUS_LABELS[sub.status]}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>alle {sub.interval_weeks} Wo.</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {sub.zone === 1 ? "Zone 1 (≤25 km)" : sub.zone === 2 ? "Zone 2 (≤50 km)" : `Zone ${sub.zone}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Euro className="h-3.5 w-3.5" />
                    <span>
                      {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(sub.monthly_price)}/Mo.
                    </span>
                  </div>
                </div>

                {sub.next_service_date && sub.status === "active" && (
                  <p className="text-xs text-muted-foreground">
                    Nächster Termin:{" "}
                    <span className="font-medium text-foreground">
                      {format(new Date(sub.next_service_date), "d. MMMM yyyy", { locale: de })}
                    </span>
                  </p>
                )}

                {sub.status === "cancelled" && sub.cancelled_at && (
                  <p className="text-xs text-muted-foreground">
                    Gekündigt am {format(new Date(sub.cancelled_at), "d. MMM yyyy", { locale: de })}
                    {sub.cancelled_by && ` (durch ${sub.cancelled_by === "client" ? "Kunden" : sub.cancelled_by === "provider" ? "Provider" : "System"})`}
                  </p>
                )}

                {sub.status === "active" && (
                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={() => setCancelTarget(sub)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Kündigen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
                  <strong>{cancelTarget?.horses?.name ?? "dieses Pferd"}</strong> kündigen.
                </p>
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                  <strong>Frist:</strong> Die Kündigung wird zum{" "}
                  <strong>{cancellationDeadline(cancelTarget?.cancelled_at ?? cancelTarget?.next_service_date)}</strong>{" "}
                  wirksam (4 Wochen Kündigungsfrist).
                </p>
                <p className="text-muted-foreground">
                  Der Kunde wird nicht automatisch benachrichtigt — bitte informiere ihn direkt.
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
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kündigung bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
