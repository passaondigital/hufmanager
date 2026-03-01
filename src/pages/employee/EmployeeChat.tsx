import { useState, useRef, useEffect } from "react";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EmployeeChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useEmployeeProfile();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("Provider");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize: find or create employee_conversation with provider
  useEffect(() => {
    if (!user || !profile) return;

    const init = async () => {
      // Get provider name
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", profile.provider_id)
        .maybeSingle();
      if (providerProfile?.full_name) setProviderName(providerProfile.full_name);

      // Check existing employee_conversation
      const { data: existing } = await supabase
        .from("employee_conversations")
        .select("id")
        .eq("employee_id", profile.id)
        .eq("provider_id", profile.provider_id)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
      } else {
        // Create conversation
        const { data: newConv, error } = await supabase
          .from("employee_conversations")
          .insert({
            employee_id: profile.id,
            provider_id: profile.provider_id,
            subject: "Mitarbeiter-Chat",
          })
          .select("id")
          .single();

        if (!error && newConv) setConversationId(newConv.id);
      }
    };
    init();
  }, [user, profile]);

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["employee-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark unread as read
      const unread = (data || []).filter((m: any) => !m.is_read && m.sender_id !== user!.id);
      if (unread.length > 0) {
        await supabase
          .from("employee_messages")
          .update({ is_read: true })
          .in("id", unread.map((m: any) => m.id));
      }
      return data || [];
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !conversationId || !user) return;
      const { error } = await supabase.from("employee_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message.trim(),
      });
      if (error) throw error;

      await supabase
        .from("employee_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["employee-messages", conversationId] });
    },
    onError: () => toast.error("Nachricht konnte nicht gesendet werden"),
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {providerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{providerName}</p>
          <p className="text-xs text-muted-foreground">Dein Provider</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto space-y-3 py-2">
        {messagesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-64 ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Noch keine Nachrichten</p>
            <p className="text-xs">Schreibe deinem Provider eine Nachricht.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}
        className="flex items-center gap-2 pt-3 border-t border-border"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nachricht schreiben..."
          className="flex-1"
          maxLength={5000}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default EmployeeChat;
