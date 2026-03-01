import { useState, useRef, useEffect } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function EmployeeTeamChat() {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch team members for name resolution
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", profile?.provider_id],
    queryFn: async () => {
      if (!profile?.provider_id) return [];
      const { data } = await supabase
        .from("employee_profiles")
        .select("user_id, full_name")
        .eq("provider_id", profile.provider_id)
        .eq("status", "active");
      // Also get provider name
      const { data: prov } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", profile.provider_id)
        .maybeSingle();
      const members = (data || []).map((m: any) => ({ id: m.user_id, name: m.full_name }));
      if (prov) members.push({ id: prov.id, name: prov.full_name });
      return members;
    },
    enabled: !!profile?.provider_id,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["team-messages", profile?.provider_id],
    queryFn: async () => {
      if (!profile?.provider_id) return [];
      const { data, error } = await supabase
        .from("employee_team_messages")
        .select("*")
        .eq("provider_id", profile.provider_id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.provider_id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!profile?.provider_id) return;
    const channel = supabase
      .channel("team-chat")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "employee_team_messages",
        filter: `provider_id=eq.${profile.provider_id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["team-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.provider_id]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !user || !profile?.provider_id) return;
      const { error } = await supabase.from("employee_team_messages").insert({
        provider_id: profile.provider_id,
        sender_id: user.id,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["team-messages"] });
    },
    onError: () => toast.error("Nachricht fehlgeschlagen"),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getSenderName = (senderId: string) => {
    const member = teamMembers.find((m: any) => m.id === senderId);
    return member?.name || "Unbekannt";
  };

  const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  if (isLoading) {
    return <div className="space-y-3 py-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-64 ml-auto" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
        <Users className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Team-Chat</span>
        <span className="text-xs text-muted-foreground">({teamMembers.length} Mitglieder)</span>
      </div>

      <div className="flex-1 overflow-auto space-y-3 py-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Noch keine Team-Nachrichten</p>
            <p className="text-xs">Schreibe die erste Nachricht an dein Team.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = getSenderName(msg.sender_id);
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className="flex items-end gap-1.5 max-w-[80%]">
                  {!isMe && (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-muted">{getInitials(senderName)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                  )}>
                    {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{senderName}</p>}
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}
        className="flex items-center gap-2 pt-3 border-t border-border"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Team-Nachricht..."
          className="flex-1"
          maxLength={5000}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
