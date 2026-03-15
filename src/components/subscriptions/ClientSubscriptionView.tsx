import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Pause, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export function ClientSubscriptionView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["client-subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_subscriptions")
        .select(`
          id, status, started_at, next_appointment_due, horse_ids, cancelled_at,
          subscription_plans (id, name, description, interval_weeks, price_monthly, includes)
        `)
        .eq("client_id", user!.id)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: Record<string, any> = { status };
      if (status === "cancelled") update.cancelled_at = new Date().toISOString();
      const { error } = await (supabase as any).from("client_subscriptions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      toast.success("Abo aktualisiert");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Laden...</p>;
  if (subscriptions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Mein Hufpflege-Abo</h3>
      {subscriptions.map((sub: any) => {
        const plan = sub.subscription_plans;
        const nextDue = sub.next_appointment_due ? new Date(sub.next_appointment_due) : null;
        return (
          <Card key={sub.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{plan?.name || "Abo"}</h4>
                  <p className="text-xs text-muted-foreground">{plan?.price_monthly}€/Monat · {plan?.interval_weeks} Wochen</p>
                  {nextDue && (
                    <p className="text-xs mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Nächster Termin: {formatDistanceToNow(nextDue, { locale: de, addSuffix: true })}
                    </p>
                  )}
                  <Badge variant={sub.status === "active" ? "default" : "secondary"} className="mt-2 text-[10px]">
                    {sub.status === "active" ? "Aktiv" : "Pausiert"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {sub.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: sub.id, status: "paused" })}>
                      <Pause className="h-3.5 w-3.5 mr-1" />Pausieren
                    </Button>
                  )}
                  {sub.status === "paused" && (
                    <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: sub.id, status: "active" })}>
                      Fortsetzen
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateStatus.mutate({ id: sub.id, status: "cancelled" })}>
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
