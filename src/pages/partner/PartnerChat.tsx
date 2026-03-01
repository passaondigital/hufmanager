import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Plus, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function PartnerChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatTarget, setNewChatTarget] = useState("");
  const [newChatSubject, setNewChatSubject] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations with unread counts
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["partner-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_conversations")
        .select("*")
        .or(`partner_id.eq.${user!.id},counterpart_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const convs = data || [];

      // Fetch profile names for counterparts
      const ids = convs.map((c: any) => c.partner_id === user!.id ? c.counterpart_id : c.partner_id);
      const uniqueIds = [...new Set(ids)];
      
      let profileMap = new Map();
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, readable_id")
          .in("id", uniqueIds);
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      // Fetch unread counts per conversation
      const convIds = convs.map((c: any) => c.id);
      let unreadMap = new Map<string, number>();
      if (convIds.length > 0) {
        const { data: unreadData } = await supabase
          .from("partner_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", user!.id)
          .eq("is_read", false);
        
        (unreadData || []).forEach((msg: any) => {
          unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
        });
      }

      return convs.map((c: any) => {
        const otherId = c.partner_id === user!.id ? c.counterpart_id : c.partner_id;
        const profile = profileMap.get(otherId);
        return {
          ...c,
          counterpart_name: profile?.full_name || "Unbekannt",
          counterpart_readable_id: profile?.readable_id,
          unread_count: unreadMap.get(c.id) || 0,
        };
      });
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["partner-messages", selectedConv],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_messages")
        .select("*")
        .eq("conversation_id", selectedConv!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark unread messages as read
      const unread = (data || []).filter((m: any) => !m.is_read && m.sender_id !== user!.id);
      if (unread.length > 0) {
        await supabase.from("partner_messages")
          .update({ is_read: true })
          .in("id", unread.map((m: any) => m.id));
        
        // Refresh conversation list to update unread counts
        queryClient.invalidateQueries({ queryKey: ["partner-conversations"] });
      }

      return data || [];
    },
    enabled: !!selectedConv,
    refetchInterval: 5000,
  });

  // Fetch available contacts (horse owners + providers from horse_partner_access)
  const { data: contacts = [] } = useQuery({
    queryKey: ["partner-chat-contacts", user?.id],
    queryFn: async () => {
      const { data: grants, error } = await supabase
        .from("horse_partner_access")
        .select("horse_id, horses:horse_id (owner_id, name)")
        .eq("partner_profile_id", user!.id)
        .eq("status", "active")
        .eq("is_active", true);
      if (error) throw error;

      const ownerIds = [...new Set((grants || []).map((g: any) => g.horses?.owner_id).filter(Boolean))];
      if (ownerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, readable_id")
        .in("id", ownerIds);
      return (profiles || []).map(p => ({ ...p, role: "client" as const }));
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !selectedConv) return;
      const { error } = await supabase.from("partner_messages").insert({
        conversation_id: selectedConv,
        sender_id: user!.id,
        content: message.trim(),
      });
      if (error) throw error;
      await supabase.from("partner_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selectedConv);
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["partner-messages", selectedConv] });
      queryClient.invalidateQueries({ queryKey: ["partner-conversations"] });
    },
    onError: () => toast.error("Fehler beim Senden"),
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!newChatTarget) return;
      const contact = contacts.find((c: any) => c.id === newChatTarget);
      const { data, error } = await supabase.from("partner_conversations").insert({
        partner_id: user!.id,
        counterpart_id: newChatTarget,
        counterpart_role: contact?.role || "client",
        subject: newChatSubject || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["partner-conversations"] });
      if (data) setSelectedConv(data.id);
      setNewChatOpen(false);
      setNewChatTarget("");
      setNewChatSubject("");
    },
    onError: (err: any) => toast.error(err.message?.includes("duplicate") ? "Konversation existiert bereits" : "Fehler beim Erstellen"),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConvData = conversations.find((c: any) => c.id === selectedConv);

  return (
    <div className="space-y-4 animate-fade-in h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Chat</h1>
        <Button onClick={() => setNewChatOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Neue Unterhaltung
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100%-3rem)]">
        {/* Conversation List */}
        <Card className={`overflow-hidden ${selectedConv ? "hidden lg:block" : ""}`}>
          <CardContent className="p-0">
            {convsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Laden...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Noch keine Unterhaltungen</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${selectedConv === conv.id ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(conv.counterpart_name || "U").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{conv.counterpart_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.subject || conv.counterpart_readable_id || ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {conv.last_message_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(conv.last_message_at), "dd.MM.", { locale: de })}
                          </span>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {conv.unread_count > 9 ? "9+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className={`lg:col-span-2 flex flex-col overflow-hidden ${!selectedConv ? "hidden lg:flex" : ""}`}>
          {!selectedConv ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Wähle eine Unterhaltung aus</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(selectedConvData?.counterpart_name || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedConvData?.counterpart_name}</p>
                  {selectedConvData?.subject && <p className="text-xs text-muted-foreground">{selectedConvData.subject}</p>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg: any) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <form onSubmit={e => { e.preventDefault(); sendMutation.mutate(); }} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Nachricht schreiben..."
                    className="flex-1"
                    maxLength={5000}
                  />
                  <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Unterhaltung</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createConversation.mutate(); }} className="space-y-4">
            <div>
              <Label>Empfänger *</Label>
              <Select value={newChatTarget} onValueChange={setNewChatTarget}>
                <SelectTrigger><SelectValue placeholder="Kontakt auswählen" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.readable_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Betreff (optional)</Label>
              <Input value={newChatSubject} onChange={e => setNewChatSubject(e.target.value)} placeholder="z.B. Rücksprache wegen Befund" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewChatOpen(false)}>Abbrechen</Button>
              <Button type="submit" disabled={!newChatTarget || createConversation.isPending}>
                {createConversation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Starten
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}