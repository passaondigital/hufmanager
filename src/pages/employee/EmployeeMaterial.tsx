import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const EmployeeMaterial = () => {
  const { data: profile } = useEmployeeProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestDialog, setRequestDialog] = useState<any>(null);
  const [reqQty, setReqQty] = useState(1);
  const [reqNote, setReqNote] = useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["employee-materials", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("employee_material_assignments")
        .select("*")
        .eq("employee_id", profile.id)
        .order("material_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["employee-material-requests", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("employee_material_requests")
        .select("*")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const reportUsage = useMutation({
    mutationFn: async ({ id, newUsed }: { id: string; newUsed: number }) => {
      const { error } = await supabase
        .from("employee_material_assignments")
        .update({ quantity_used: newUsed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-materials"] });
      toast({ title: "Verbrauch aktualisiert" });
    },
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!profile || !requestDialog) return;
      const { error } = await supabase.from("employee_material_requests").insert({
        employee_id: profile.id,
        provider_id: profile.provider_id,
        material_assignment_id: requestDialog.id,
        requested_quantity: reqQty,
        note: reqNote || null,
      });
      if (error) throw error;

      // Notify provider
      await supabase.from("employee_notifications").insert({
        employee_id: profile.id,
        type: "material_request",
        title: "Nachschub angefordert",
        body: `${profile.full_name} benötigt Nachschub: ${requestDialog.material_name} × ${reqQty}`,
        link_to: "/team",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-material-requests"] });
      toast({ title: "Anfrage gesendet ✓" });
      setRequestDialog(null);
      setReqQty(1);
      setReqNote("");
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Mein Material
        </h1>
        <p className="text-sm text-muted-foreground">Zugewiesenes Material und Verbrauchsmeldung</p>
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Kein Material zugewiesen</p>
            <p className="text-sm">Dein Provider hat dir noch kein Material zugewiesen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {materials.map((mat: any) => {
            const remaining = (mat.quantity_assigned || 0) - (mat.quantity_used || 0);
            const percentage = mat.quantity_assigned ? (remaining / mat.quantity_assigned) * 100 : 100;
            const isLow = percentage <= 20;
            const pendingReq = requests.find((r: any) => r.material_assignment_id === mat.id && r.status === "pending");

            return (
              <Card key={mat.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{mat.material_name}</h3>
                      {mat.material_category && (
                        <Badge variant="secondary" className="text-xs mt-1">{mat.material_category}</Badge>
                      )}
                    </div>
                    <Badge variant={remaining <= 0 ? "destructive" : remaining <= 3 ? "outline" : "default"}>
                      {remaining} {mat.unit} übrig
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${isLow ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Zugewiesen: {mat.quantity_assigned} {mat.unit}</span>
                    <span>Verbraucht: {mat.quantity_used} {mat.unit}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" disabled={(mat.quantity_used || 0) <= 0}
                      onClick={() => reportUsage.mutate({ id: mat.id, newUsed: (mat.quantity_used || 0) - 1 })}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium min-w-[60px] text-center">{mat.quantity_used} verbraucht</span>
                    <Button variant="outline" size="sm" disabled={(mat.quantity_used || 0) >= (mat.quantity_assigned || 0)}
                      onClick={() => reportUsage.mutate({ id: mat.id, newUsed: (mat.quantity_used || 0) + 1 })}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>

                    {/* Reorder button */}
                    {isLow && !pendingReq && (
                      <Button variant="outline" size="sm" className="ml-auto gap-1 text-xs text-amber-600 border-amber-300"
                        onClick={() => setRequestDialog(mat)}>
                        <ShoppingCart className="h-3.5 w-3.5" />Nachschub
                      </Button>
                    )}
                    {pendingReq && (
                      <Badge variant="outline" className="ml-auto text-xs">Anfrage ausstehend</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent requests */}
      {requests.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Letzte Anfragen</p>
          {requests.slice(0, 5).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">×{r.requested_quantity}</span>
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                {r.status === "pending" ? "Ausstehend" : r.status === "approved" ? "Genehmigt" : "Abgelehnt"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={!!requestDialog} onOpenChange={(open) => { if (!open) setRequestDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nachschub anfordern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Material: <strong>{requestDialog?.material_name}</strong></p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gewünschte Menge</label>
              <Input type="number" min={1} value={reqQty} onChange={(e) => setReqQty(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notiz (optional)</label>
              <Textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="z.B. Dringend benötigt..." rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialog(null)}>Abbrechen</Button>
            <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending} className="gap-1.5">
              {submitRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Anfordern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeMaterial;
