import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ServiceOrderPDF } from "./ServiceOrderPDF";

interface ServiceOrder {
  id: string;
  order_number: string;
  horse_id: string;
  client_id: string;
  service_description: string;
  service_date: string | null;
  estimated_price: number | null;
  currency: string;
  order_status: string;
  created_at: string;
  provider_signed: boolean;
  provider_signed_at: string | null;
  client_signed_at: string | null;
  completed_at: string | null;
  horse_name?: string;
  horse_breed?: string;
  client_name?: string;
  client_readable_id?: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Offen", emoji: "🟡", variant: "outline" },
  accepted: { label: "Angenommen", emoji: "🟢", variant: "default" },
  declined: { label: "Abgelehnt", emoji: "🔴", variant: "destructive" },
  in_progress: { label: "In Bearbeitung", emoji: "🔵", variant: "secondary" },
  completed: { label: "Abgeschlossen", emoji: "✅", variant: "default" },
  cancelled: { label: "Storniert", emoji: "⚫", variant: "secondary" },
};

export function ServiceOrderInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [declineOrderId, setDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [pdfOrder, setPdfOrder] = useState<ServiceOrder | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["service-order-inbox", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, order_number, horse_id, client_id, service_description, service_date, estimated_price, currency, order_status, created_at, provider_signed, provider_signed_at, client_signed_at, completed_at")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched: ServiceOrder[] = [];
      for (const o of data || []) {
        const { data: horse } = await supabase.from("horses").select("name, breed").eq("id", o.horse_id).maybeSingle();
        const { data: client } = await supabase.from("profiles").select("full_name, readable_id").eq("id", o.client_id).single();
        enriched.push({
          ...o,
          horse_name: horse?.name,
          horse_breed: horse?.breed,
          client_name: client?.full_name,
          client_readable_id: client?.readable_id,
        });
      }
      return enriched;
    },
    enabled: !!user,
  });

  const updateOrderStatus = async (orderId: string, newStatus: string, extras?: Record<string, unknown>) => {
    setProcessing(orderId);
    try {
      const updateData: Record<string, unknown> = { order_status: newStatus, ...extras };
      const { error } = await supabase
        .from("service_orders")
        .update(updateData as any)
        .eq("id", orderId);

      if (error) throw error;

      const order = orders.find(o => o.id === orderId);
      if (order) {
        const typeMap: Record<string, string> = {
          accepted: "service_order_accepted",
          declined: "service_order_declined",
          completed: "service_order_completed",
          in_progress: "service_order_accepted",
        };
        const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        await supabase.from("notifications").insert({
          user_id: order.client_id,
          title: `Auftrag ${order.order_number}`,
          message: `${STATUS_CONFIG[newStatus]?.emoji || ""} Auftrag ${order.order_number}: ${statusLabel}`,
          type: typeMap[newStatus] || "service_order",
          link: "/client-orders",
        } as any);
      }

      queryClient.invalidateQueries({ queryKey: ["service-order-inbox"] });
      toast.success(`Auftrag ${newStatus === "accepted" ? "angenommen" : newStatus === "declined" ? "abgelehnt" : newStatus === "completed" ? "abgeschlossen" : "aktualisiert"}`);
    } catch (err) {
      console.error(err);
      toast.error("Fehler");
    } finally {
      setProcessing(null);
    }
  };

  const handleAccept = (orderId: string) => {
    updateOrderStatus(orderId, "accepted", {
      provider_signed: true,
      provider_signed_at: new Date().toISOString(),
    });
  };

  const handleDecline = () => {
    if (!declineOrderId) return;
    updateOrderStatus(declineOrderId, "declined", {
      notes: declineReason || null,
    });
    setDeclineOrderId(null);
    setDeclineReason("");
  };

  const handleStart = (orderId: string) => updateOrderStatus(orderId, "in_progress");

  const handleComplete = (orderId: string) => {
    updateOrderStatus(orderId, "completed", {
      completed_at: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Auftragseingang</h2>
        <Badge variant="secondary">{orders.filter(o => o.order_status === "sent").length} offen</Badge>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Keine Aufträge vorhanden
          </CardContent>
        </Card>
      ) : (
        orders.map(order => {
          const status = STATUS_CONFIG[order.order_status] || { label: order.order_status, emoji: "❓", variant: "outline" as const };
          return (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">📋 {order.order_number}</span>
                    <Badge variant={status.variant}>{status.emoji} {status.label}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{order.horse_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{order.horse_name || "Unbekannt"}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.horse_breed} · Besitzer: {order.client_name}
                    </div>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Leistung:</span> {order.service_description}</div>
                  {order.service_date && (
                    <div><span className="text-muted-foreground">Wunschtermin:</span> {format(new Date(order.service_date), "dd.MM.yyyy", { locale: de })}</div>
                  )}
                  {order.estimated_price && (
                    <div><span className="text-muted-foreground">Preis:</span> ca. {order.estimated_price.toFixed(2)} €</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Eingegangen: {format(new Date(order.created_at), "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {order.order_status === "sent" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeclineOrderId(order.id)}
                        disabled={processing === order.id}
                      >
                        <X className="h-4 w-4 mr-1" /> Ablehnen
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(order.id)}
                        disabled={processing === order.id}
                      >
                        {processing === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                        Annehmen
                      </Button>
                    </>
                  )}
                  {order.order_status === "accepted" && (
                    <Button size="sm" onClick={() => handleStart(order.id)} disabled={processing === order.id}>
                      <Play className="h-4 w-4 mr-1" /> Starten
                    </Button>
                  )}
                  {order.order_status === "in_progress" && (
                    <Button size="sm" onClick={() => handleComplete(order.id)} disabled={processing === order.id}>
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

      {/* Decline dialog */}
      <Dialog open={!!declineOrderId} onOpenChange={(o) => !o && setDeclineOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auftrag ablehnen</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Ablehnungsgrund (optional)</Label>
            <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Optional..." className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOrderId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDecline}>Ablehnen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF modal */}
      {pdfOrder && (
        <ServiceOrderPDF order={pdfOrder} open={!!pdfOrder} onClose={() => setPdfOrder(null)} />
      )}
    </div>
  );
}
