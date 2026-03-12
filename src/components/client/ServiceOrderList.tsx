import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClipboardList, X, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ServiceOrderPDF } from "@/components/provider/ServiceOrderPDF";

interface ServiceOrder {
  id: string;
  order_number: string;
  horse_id: string;
  provider_id: string | null;
  partner_id: string | null;
  service_description: string;
  service_date: string | null;
  estimated_price: number | null;
  order_status: string;
  created_at: string;
  completed_at: string | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
  horse_name?: string;
  provider_name?: string;
}

const STATUS_BADGES: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Offen", emoji: "🟡", variant: "outline" },
  accepted: { label: "Angenommen", emoji: "🟢", variant: "default" },
  declined: { label: "Abgelehnt", emoji: "🔴", variant: "destructive" },
  in_progress: { label: "In Bearbeitung", emoji: "🔵", variant: "secondary" },
  completed: { label: "Abgeschlossen", emoji: "✅", variant: "default" },
  cancelled: { label: "Storniert", emoji: "⚫", variant: "secondary" },
};

export function ServiceOrderList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [pdfOrder, setPdfOrder] = useState<ServiceOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["client-service-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, order_number, horse_id, provider_id, partner_id, service_description, service_date, estimated_price, order_status, created_at, completed_at, client_signed_at, provider_signed_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched: ServiceOrder[] = [];
      for (const o of data || []) {
        const { data: horse } = await supabase.from("horses").select("name").eq("id", o.horse_id).maybeSingle();
        const providerId = o.provider_id || o.partner_id;
        let providerName = "Unbekannt";
        if (providerId) {
          const { data: provider } = await supabase.from("profiles").select("full_name").eq("id", providerId).single();
          providerName = provider?.full_name || "Unbekannt";
        }
        enriched.push({ ...o, horse_name: horse?.name, provider_name: providerName });
      }
      return enriched;
    },
    enabled: !!user,
  });

  const cancelOrder = async () => {
    if (!cancelId) return;
    try {
      const { error } = await supabase
        .from("service_orders")
        .update({ order_status: "cancelled" } as any)
        .eq("id", cancelId);
      if (error) throw error;

      const order = orders.find(o => o.id === cancelId);
      if (order) {
        const recipientId = order.provider_id || order.partner_id;
        if (recipientId) {
          await supabase.from("notifications").insert({
            user_id: recipientId,
            title: `Auftrag storniert`,
            message: `❌ Auftrag ${order.order_number} wurde vom Besitzer storniert.`,
            type: "service_order_cancelled",
            link: "/anfragen",
          } as any);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["client-service-orders"] });
      toast.success("Auftrag storniert");
    } catch (err) {
      toast.error("Fehler beim Stornieren");
    } finally {
      setCancelId(null);
    }
  };

  const filtered = filter === "all" ? orders :
    filter === "open" ? orders.filter(o => ["sent", "accepted"].includes(o.order_status)) :
    filter === "active" ? orders.filter(o => o.order_status === "in_progress") :
    orders.filter(o => ["completed", "cancelled", "declined"].includes(o.order_status));

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Meine Aufträge</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Alle" },
          { key: "open", label: "Offen" },
          { key: "active", label: "Aktiv" },
          { key: "done", label: "Erledigt" },
        ].map(f => (
          <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Aufträge
          </CardContent>
        </Card>
      ) : (
        filtered.map(order => {
          const st = STATUS_BADGES[order.order_status] || { label: order.order_status, emoji: "❓", variant: "outline" as const };
          const canCancel = ["sent", "accepted"].includes(order.order_status);
          return (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-sm font-medium">{order.order_number}</span>
                    <span className="text-muted-foreground text-sm"> · {order.provider_name}</span>
                  </div>
                  <Badge variant={st.variant}>{st.emoji} {st.label}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div>{order.horse_name} · {order.service_description}</div>
                  <div className="text-muted-foreground">
                    {order.service_date && format(new Date(order.service_date), "dd.MM.yyyy", { locale: de })}
                    {order.estimated_price ? ` · ${order.estimated_price.toFixed(2)} €` : ""}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {(order.order_status === "accepted" || order.order_status === "completed") && (
                    <Button variant="outline" size="sm" onClick={() => setPdfOrder(order)}>
                      <FileDown className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="outline" size="sm" onClick={() => setCancelId(order.id)}>
                      <X className="h-4 w-4 mr-1" /> Stornieren
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auftrag stornieren?</AlertDialogTitle>
            <AlertDialogDescription>Der Dienstleister wird benachrichtigt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={cancelOrder}>Stornieren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF */}
      {pdfOrder && <ServiceOrderPDF order={pdfOrder} open={!!pdfOrder} onClose={() => setPdfOrder(null)} />}
    </div>
  );
}
