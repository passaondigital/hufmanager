import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardList, Check, X, Play, CheckCircle, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ServiceOrderPDF } from "@/components/provider/ServiceOrderPDF";

interface ServiceOrder {
  id: string;
  order_number: string;
  horse_id: string;
  client_id: string;
  service_description: string;
  service_date: string | null;
  estimated_price: number | null;
  order_status: string;
  created_at: string;
  provider_signed: boolean;
  completed_at: string | null;
  client_signed_at: string | null;
  provider_signed_at: string | null;
  horse_name?: string;
  client_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Offen", emoji: "🟡", variant: "outline" },
  accepted: { label: "Angenommen", emoji: "🟢", variant: "default" },
  declined: { label: "Abgelehnt", emoji: "🔴", variant: "destructive" },
  in_progress: { label: "In Bearbeitung", emoji: "🔵", variant: "secondary" },
  completed: { label: "Abgeschlossen", emoji: "✅", variant: "default" },
  cancelled: { label: "Storniert", emoji: "⚫", variant: "secondary" },
};

export function PartnerServiceOrderInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [declineOrderId, setDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [pdfOrder, setPdfOrder] = useState<ServiceOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["partner-service-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, order_number, horse_id, client_id, service_description, service_date, estimated_price, order_status, created_at, provider_signed, completed_at")
        .eq("partner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched: ServiceOrder[] = [];
      for (const o of data || []) {
        const { data: horse } = await supabase.from("horses").select("name").eq("id", o.horse_id).maybeSingle();
        const { data: client } = await supabase.from("profiles").select("full_name").eq("id", o.client_id).single();
        enriched.push({ ...o, horse_name: horse?.name, client_name: client?.full_name });
      }
      return enriched;
    },
    enabled: !!user,
  });

  const updateStatus = async (orderId: string, newStatus: string, extras?: Record<string, unknown>) => {
    setProcessing(orderId);
    try {
      const { error } = await supabase
        .from("service_orders")
        .update({ order_status: newStatus, ...extras } as any)
        .eq("id", orderId);
      if (error) throw error;

      const order = orders.find(o => o.id === orderId);
      if (order) {
        await supabase.from("notifications").insert({
          user_id: order.client_id,
          title: `Auftrag ${order.order_number}`,
          message: `${STATUS_CONFIG[newStatus]?.emoji || ""} ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
          type: "service_order",
        } as any);
      }

      queryClient.invalidateQueries({ queryKey: ["partner-service-orders"] });
      toast.success("Auftrag aktualisiert");
    } catch (err) {
      toast.error("Fehler");
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = () => {
    if (!declineOrderId) return;
    updateStatus(declineOrderId, "declined", { notes: declineReason || null });
    setDeclineOrderId(null);
    setDeclineReason("");
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Auftragseingang</h2>
        <Badge variant="secondary">{orders.filter(o => o.order_status === "sent").length} offen</Badge>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Aufträge</CardContent></Card>
      ) : (
        orders.map(order => {
          const st = STATUS_CONFIG[order.order_status] || { label: order.order_status, emoji: "❓", variant: "outline" as const };
          return (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm font-medium">📋 {order.order_number}</span>
                  <Badge variant={st.variant}>{st.emoji} {st.label}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback>{order.horse_name?.charAt(0)}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{order.horse_name}</div>
                    <div className="text-sm text-muted-foreground">Besitzer: {order.client_name}</div>
                  </div>
                </div>
                <div className="text-sm">
                  <div>{order.service_description}</div>
                  {order.service_date && <div className="text-muted-foreground">Wunschtermin: {format(new Date(order.service_date), "dd.MM.yyyy", { locale: de })}</div>}
                  {order.estimated_price && <div className="text-muted-foreground">Preis: ca. {order.estimated_price.toFixed(2)} €</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.order_status === "sent" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setDeclineOrderId(order.id)} disabled={processing === order.id}>
                        <X className="h-4 w-4 mr-1" /> Ablehnen
                      </Button>
                      <Button size="sm" onClick={() => updateStatus(order.id, "accepted", { provider_signed: true, provider_signed_at: new Date().toISOString() })} disabled={processing === order.id}>
                        <Check className="h-4 w-4 mr-1" /> Annehmen
                      </Button>
                    </>
                  )}
                  {order.order_status === "accepted" && (
                    <Button size="sm" onClick={() => updateStatus(order.id, "in_progress")} disabled={processing === order.id}>
                      <Play className="h-4 w-4 mr-1" /> Starten
                    </Button>
                  )}
                  {order.order_status === "in_progress" && (
                    <Button size="sm" onClick={() => updateStatus(order.id, "completed", { completed_at: new Date().toISOString() })} disabled={processing === order.id}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Abschließen
                    </Button>
                  )}
                  {(order.order_status === "accepted" || order.order_status === "completed") && (
                    <Button variant="outline" size="sm" onClick={() => setPdfOrder(order)}>
                      <FileDown className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={!!declineOrderId} onOpenChange={(o) => !o && setDeclineOrderId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auftrag ablehnen</DialogTitle></DialogHeader>
          <div>
            <Label>Ablehnungsgrund (optional)</Label>
            <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOrderId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDecline}>Ablehnen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfOrder && <ServiceOrderPDF order={pdfOrder} open={!!pdfOrder} onClose={() => setPdfOrder(null)} />}
    </div>
  );
}
