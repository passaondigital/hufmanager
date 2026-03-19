import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pause, Play, Trash2, MessageSquare, Store, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Aktiv", variant: "default" },
  paused: { label: "Pausiert", variant: "secondary" },
  expired: { label: "Abgelaufen", variant: "outline" },
  draft: { label: "Entwurf", variant: "outline" },
};

export default function ClientMyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-marketplace-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_marketplace_listings")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["my-listing-inquiries", user?.id],
    queryFn: async () => {
      const listingIds = listings.map((l: any) => l.id);
      if (!listingIds.length) return [];
      const { data, error } = await supabase
        .from("client_marketplace_inquiries")
        .select("*")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: listings.length > 0,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("client_marketplace_listings")
        .update({ status: newStatus as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-marketplace-listings"] });
      toast({ title: "Status aktualisiert" });
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_marketplace_listings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-marketplace-listings"] });
      toast({ title: "Inserat gelöscht" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Meine Inserate
          </h1>
          <p className="text-sm text-muted-foreground">{listings.length} Inserate · {inquiries.length} Anfragen</p>
        </div>
        <Button onClick={() => navigate("/client-marketplace/create")}>
          <Plus className="h-4 w-4 mr-1" /> Neues Inserat
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Store className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Noch keine Inserate erstellt</p>
            <Button className="mt-4" onClick={() => navigate("/client-marketplace/create")}>
              Erstes Inserat erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l: any) => {
            const st = STATUS_LABELS[l.status] || STATUS_LABELS.draft;
            const inqCount = inquiries.filter((i: any) => i.listing_id === l.id).length;

            return (
              <Card key={l.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{l.title}</h3>
                      <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {l.view_count || 0}</span>
                      {inqCount > 0 && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <MessageSquare className="h-3 w-3" /> {inqCount} Anfragen
                        </span>
                      )}
                      {l.price_amount != null && <span>{Number(l.price_amount).toFixed(2)} € {l.price_label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        toggleStatus.mutate({
                          id: l.id,
                          newStatus: l.status === "active" ? "paused" : "active",
                        })
                      }
                    >
                      {l.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteListing.mutate(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
