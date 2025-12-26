import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface SentRequest {
  id: string;
  status: string;
  requested_at: string;
  target: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    readable_id: string | null;
  };
}

export function MyConnectionRequests() {
  const { user } = useAuth();

  const { data: sentRequests = [], isLoading } = useQuery({
    queryKey: ["my-connection-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get requests that current user initiated
      const { data, error } = await supabase
        .from("access_grants")
        .select("id, status, requested_at, provider_id, client_id")
        .eq("requested_by", user.id)
        .in("status", ["pending", "rejected"])
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Determine target user (the one who isn't the requester)
      const targetIds = data.map(r => r.provider_id === user.id ? r.client_id : r.provider_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, readable_id")
        .in("id", targetIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(request => {
        const targetId = request.provider_id === user.id ? request.client_id : request.provider_id;
        return {
          id: request.id,
          status: request.status,
          requested_at: request.requested_at,
          target: profileMap.get(targetId) || {
            id: targetId,
            full_name: "Unbekannt",
            avatar_url: null,
            readable_id: null,
          },
        };
      }) as SentRequest[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sentRequests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Meine gesendeten Anfragen
          <Badge variant="outline" className="ml-auto">
            {sentRequests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sentRequests.map((request) => (
          <div 
            key={request.id} 
            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.target.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {request.target.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {request.target.full_name || "Unbekannt"}
                </span>
                {request.target.readable_id && (
                  <span className="text-xs text-muted-foreground font-mono">
                    #{request.target.readable_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                vor {formatDistanceToNow(new Date(request.requested_at), { locale: de })}
              </p>
            </div>
            
            {request.status === 'pending' ? (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                Ausstehend
              </Badge>
            ) : (
              <Badge variant="outline" className="text-destructive gap-1 shrink-0">
                <X className="h-3 w-3" />
                Abgelehnt
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}