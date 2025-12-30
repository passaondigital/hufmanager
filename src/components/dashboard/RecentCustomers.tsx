import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export function RecentCustomers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch recent clients from access_grants + profiles
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["dashboard-recent-customers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get clients created by provider
      const { data: createdClients, error: createdError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("created_by_provider_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (createdError) throw createdError;

      // Get clients connected via access_grants (active + pending, and is_active = true)
      const { data: accessGrants, error: grantsError } = await supabase
        .from("access_grants")
        .select("client_id, status, granted_at")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .in("status", ["active", "pending"]);

      if (grantsError) throw grantsError;

      const grantedClientIds = accessGrants?.map((g) => g.client_id) || [];

      let grantedClients: any[] = [];
      if (grantedClientIds.length > 0) {
        const { data: grantedData, error: grantedError } = await supabase
          .from("profiles")
          .select("id, full_name, created_at")
          .in("id", grantedClientIds)
          .is("deleted_at", null);

        if (grantedError) throw grantedError;
        grantedClients = grantedData || [];
      }

      // Combine and deduplicate
      const allClients = [...(createdClients || [])];
      const existingIds = new Set(allClients.map((c) => c.id));

      for (const client of grantedClients) {
        if (!existingIds.has(client.id)) {
          allClients.push(client);
        }
      }

      // Get horse counts for all clients
      const clientIds = allClients.map((c) => c.id);
      if (clientIds.length === 0) return [];

      const { data: horses } = await supabase
        .from("horses")
        .select("owner_id")
        .in("owner_id", clientIds)
        .is("deleted_at", null);

      // Count horses per client
      const horseCounts: Record<string, number> = {};
      horses?.forEach((h) => {
        horseCounts[h.owner_id] = (horseCounts[h.owner_id] || 0) + 1;
      });

      // Get last appointment for each client
      const { data: appointments } = await supabase
        .from("appointments")
        .select("horse_id, date, provider_id")
        .eq("provider_id", user.id)
        .order("date", { ascending: false });

      // Map horse_id to owner for last visit lookup
      const { data: horseOwners } = await supabase
        .from("horses")
        .select("id, owner_id")
        .in("owner_id", clientIds);

      const horseToOwner: Record<string, string> = {};
      horseOwners?.forEach((h) => {
        horseToOwner[h.id] = h.owner_id;
      });

      const lastVisit: Record<string, string> = {};
      appointments?.forEach((a) => {
        const ownerId = horseToOwner[a.horse_id];
        if (ownerId && !lastVisit[ownerId]) {
          lastVisit[ownerId] = a.date;
        }
      });

      // Sort by created_at (show all clients, no limit for dashboard accuracy)
      return allClients
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((c) => ({
          id: c.id,
          name: c.full_name || "Unbekannter Kunde",
          horses: horseCounts[c.id] || 0,
          lastVisit: lastVisit[c.id]
            ? formatDistanceToNow(new Date(lastVisit[c.id]), { addSuffix: true, locale: de })
            : "Kein Termin",
          status: lastVisit[c.id] ? "aktiv" : "neu",
        }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="animate-slide-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Letzte Kunden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Letzte Kunden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Kunden vorhanden
          </p>
        ) : (
          clients.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate("/customers")}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                    {customer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.horses} Pferd{customer.horses !== 1 ? "e" : ""} • {customer.lastVisit}
                  </p>
                </div>
              </div>
              <Badge
                variant={customer.status === "aktiv" ? "default" : "secondary"}
                className={customer.status === "aktiv" ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
              >
                {customer.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
