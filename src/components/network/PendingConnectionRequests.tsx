import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, MessageSquare, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface PendingRequest {
  id: string;
  provider_id: string;
  client_id: string;
  requested_by: string;
  requested_at: string;
  request_message: string | null;
  requester: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    readable_id: string | null;
  };
}

interface PendingConnectionRequestsProps {
  userType: 'provider' | 'client';
  onStatusChanged?: () => void;
}

export function PendingConnectionRequests({ userType, onStatusChanged }: PendingConnectionRequestsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ["pending-connection-requests", user?.id, userType],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get pending requests where current user needs to approve
      const query = supabase
        .from("access_grants")
        .select("id, provider_id, client_id, requested_by, requested_at, request_message")
        .eq("status", "pending");
      
      if (userType === 'provider') {
        query.eq("provider_id", user.id).neq("requested_by", user.id);
      } else {
        query.eq("client_id", user.id).neq("requested_by", user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Fetch requester profiles
      const requesterIds = [...new Set(data.map(r => r.requested_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, readable_id")
        .in("id", requesterIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(request => ({
        ...request,
        requester: profileMap.get(request.requested_by) || {
          id: request.requested_by,
          full_name: "Unbekannt",
          avatar_url: null,
          readable_id: null,
        },
      })) as PendingRequest[];
    },
    enabled: !!user?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("access_grants")
        .update({
          status: 'active',
          is_active: true,
          granted_at: new Date().toISOString(),
          can_view_basic: true,
          can_view_medical: true,
          can_create_appointments: true,
        })
        .eq("id", requestId);
      
      if (error) throw error;
      
      // Send notification to requester
      const request = pendingRequests.find(r => r.id === requestId);
      if (request) {
        await supabase.from("notifications").insert({
          user_id: request.requested_by,
          title: "Verbindung bestätigt! ✓",
          message: "Deine Verbindungsanfrage wurde angenommen. Du hast jetzt Zugriff.",
          type: "connection_approved",
          link: userType === 'provider' ? "/kunden" : "/client-home",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-connection-requests"] });
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      queryClient.invalidateQueries({ queryKey: ["access-grants"] });
      toast({ title: "Verbindung bestätigt!", description: "Die Verbindung ist jetzt aktiv." });
      onStatusChanged?.();
    },
    onError: () => {
      toast({ title: "Fehler beim Bestätigen", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("access_grants")
        .update({
          status: 'rejected',
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      
      if (error) throw error;
      
      // Send notification to requester
      const request = pendingRequests.find(r => r.id === requestId);
      if (request) {
        await supabase.from("notifications").insert({
          user_id: request.requested_by,
          title: "Verbindungsanfrage abgelehnt",
          message: "Deine Verbindungsanfrage wurde leider abgelehnt.",
          type: "connection_rejected",
          link: "/",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-connection-requests"] });
      toast({ title: "Anfrage abgelehnt" });
      onStatusChanged?.();
    },
    onError: () => {
      toast({ title: "Fehler beim Ablehnen", variant: "destructive" });
    },
  });

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    await approveMutation.mutateAsync(requestId);
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    await rejectMutation.mutateAsync(requestId);
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Offene Verbindungsanfragen
          <Badge variant="secondary" className="ml-auto">
            {pendingRequests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map((request) => (
          <div 
            key={request.id} 
            className="border rounded-lg p-4 bg-background animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={request.requester.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {request.requester.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">
                    {request.requester.full_name || "Unbekannt"}
                  </h3>
                  {request.requester.readable_id && (
                    <Badge variant="outline" className="font-mono text-xs">
                      #{request.requester.readable_id}
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anfrage vor {formatDistanceToNow(new Date(request.requested_at), { locale: de })}
                </p>
                
                {request.request_message && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-sm flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{request.request_message}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700" 
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Annehmen
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => handleReject(request.id)}
                disabled={processingId === request.id}
              >
                <X className="h-4 w-4" />
                Ablehnen
              </Button>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 justify-center">
              <ShieldCheck className="h-3 w-3" />
              Nach Bestätigung werden Daten synchronisiert
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}