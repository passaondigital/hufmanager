import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, User, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Provider {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function ClientChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find provider and load/create conversation
  useEffect(() => {
    if (!user) return;
    
    const initChat = async () => {
      setLoading(true);
      
      // 1. Find provider from access_grants
      const { data: accessGrant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      let providerId = accessGrant?.provider_id;
      
      // 2. Fallback: Check if created by a provider
      if (!providerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_by_provider_id")
          .eq("id", user.id)
          .maybeSingle();
        
        providerId = profile?.created_by_provider_id;
      }
      
      if (!providerId) {
        setLoading(false);
        return;
      }
      
      // 3. Load provider info
      const { data: providerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", providerId)
        .maybeSingle();
      
      if (providerProfile) {
        setProvider(providerProfile);
      }
      
      // 4. Find or create conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("provider_id", providerId)
        .eq("client_id", user.id)
        .maybeSingle();
      
      if (existingConv) {
        setConversationId(existingConv.id);
      } else {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({
            provider_id: providerId,
            client_id: user.id,
            subject: "Chat",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        
        if (!error && newConv) {
          setConversationId(newConv.id);
        }
      }
      
      setLoading(false);
    };
    
    initChat();
  }, [user]);

  // Load messages and subscribe to realtime updates
  useEffect(() => {
    if (!conversationId) return;
    
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (data) {
        setMessages(data as Message[]);
      }
    };
    
    loadMessages();
    
    // Realtime subscription
    const channel = supabase
      .channel(`client-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    
    setSending(true);
    
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    
    if (!error) {
      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      
      setNewMessage("");
    } else {
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    }
    
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Chat</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-40" />
          <h2 className="text-lg font-semibold mb-2">Kein Hufbearbeiter verbunden</h2>
          <p className="text-muted-foreground text-sm">
            Du hast noch keinen Hufbearbeiter, mit dem du chatten kannst.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{provider.full_name || "Hufbearbeiter"}</h1>
            <p className="text-xs text-muted-foreground truncate">{provider.email}</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">
                Starte die Unterhaltung mit deinem Hufbearbeiter
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Nachricht schreiben..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} size="icon">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
