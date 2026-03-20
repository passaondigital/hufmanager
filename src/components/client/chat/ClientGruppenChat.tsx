import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, MessageCircle, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Horse {
  id: string;
  name: string;
  readable_id?: string;
  avatar_url?: string;
}

interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export function ClientGruppenChat() {
  const { user } = useAuth();
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: horses = [], isLoading: horsesLoading } = useQuery({
    queryKey: ["equid-chat-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allHorses: Horse[] = [];
      const { data: owned } = await supabase
        .from("horses").select("id, name, readable_id").eq("owner_id", user.id);
      if (owned) allHorses.push(...owned.map(h => ({ ...h, avatar_url: undefined })));
      return allHorses;
    },
    enabled: !!user?.id,
  });

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["equid-chat-channel", selectedHorse?.id],
    queryFn: async () => {
      if (!selectedHorse?.id) return null;
      const { data: existing } = await supabase
        .from("horse_chat_channels").select("id").eq("horse_id", selectedHorse.id).maybeSingle();
      if (existing) return existing;
      const { data: created, error } = await supabase
        .from("horse_chat_channels").insert({ horse_id: selectedHorse.id }).select("id").single();
      if (error) return null;
      return created;
    },
    enabled: !!selectedHorse?.id,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["equid-chat-messages", channel?.id],
    queryFn: async () => {
      if (!channel?.id) return [];
      const { data, error } = await supabase
        .from("horse_chat_messages")
        .select("id, channel_id, sender_id, content, message_type, created_at")
        .eq("channel_id", channel.id).order("created_at", { ascending: true }).limit(200);
      if (error) return [];
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return (data || []).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.full_name || "Unbekannt",
        sender_avatar: profileMap.get(m.sender_id)?.avatar_url || undefined,
      }));
    },
    enabled: !!channel?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!channel?.id) return;
    const sub = supabase.channel(`equid-chat-${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "horse_chat_messages", filter: `channel_id=eq.${channel.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ["equid-chat-messages", channel.id] }); })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel?.id, queryClient]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!channel?.id || !user?.id) throw new Error("Missing data");
      const { error } = await supabase.from("horse_chat_messages").insert({ channel_id: channel.id, sender_id: user.id, content, message_type: "text" });
      if (error) throw error;
    },
    onSuccess: () => { setMessage(""); queryClient.invalidateQueries({ queryKey: ["equid-chat-messages", channel?.id] }); },
  });

  // Horse list
  if (!selectedHorse) {
    return (
      <div className="flex flex-col h-full">
        <div className="pb-3 border-b border-border mb-3">
          <p className="text-sm font-semibold">Gruppen-Chat</p>
          <p className="text-xs text-muted-foreground">Kommuniziere mit dem Kompetenzteam pro Pferd</p>
        </div>

        {horsesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : horses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Keine Pferde</p>
            <p className="text-xs">Füge Pferde hinzu, um mit deren Kompetenzteam zu chatten.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {horses.map(horse => (
              <button key={horse.id} onClick={() => setSelectedHorse(horse)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {horse.name?.charAt(0) || "🐴"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{horse.name}</p>
                  {horse.readable_id && <p className="text-xs text-muted-foreground">#{horse.readable_id}</p>}
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  <Users className="h-3 w-3 mr-1" />Team
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedHorse(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {selectedHorse.name?.charAt(0) || "🐴"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{selectedHorse.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Kompetenzteam-Chat
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        {channelLoading || messagesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Noch keine Nachrichten.</p>
            <p className="text-xs mt-1">Starte die Kommunikation mit dem Kompetenzteam!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "")}>
                  {!isMe && (
                    <Avatar className="h-7 w-7 shrink-0">
                      {msg.sender_avatar && <AvatarImage src={msg.sender_avatar} />}
                      <AvatarFallback className="text-[10px] bg-muted">{msg.sender_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                    {!isMe && <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{msg.sender_name}</p>}
                    <div className={cn("rounded-2xl px-3 py-2 text-sm",
                      isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                      {msg.content}
                    </div>
                    <p className={cn("text-[10px] text-muted-foreground mt-0.5 px-1", isMe ? "text-right" : "")}>
                      {format(new Date(msg.created_at), "dd.MM. HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={(e) => { e.preventDefault(); const t = message.trim(); if (t) sendMutation.mutate(t); }}
        className="flex items-center gap-2 pt-3 border-t border-border">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nachricht schreiben..." className="flex-1"
          disabled={sendMutation.isPending || !channel} />
        <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending || !channel}>
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
