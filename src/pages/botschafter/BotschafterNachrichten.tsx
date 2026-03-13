import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Send, Pin } from "lucide-react";
import { toast } from "sonner";
import { BotschafterFloatingHelp } from "@/components/botschafter/BotschafterFloatingHelp";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type Update = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_pinned: boolean | null;
  published_at: string | null;
  target_type: string | null;
};

type Message = {
  id: string;
  content: string;
  sender: string;
  created_at: string | null;
  is_read: boolean | null;
};

const CAT_STYLES: Record<string, { bg: string; label: string }> = {
  wichtig: { bg: "bg-red-500/20 text-red-500", label: "🔴 wichtig" },
  provision: { bg: "bg-orange-500/20 text-orange-500", label: "🟠 provision" },
  feature: { bg: "bg-blue-500/20 text-blue-500", label: "🔵 feature" },
  event: { bg: "bg-green-500/20 text-green-500", label: "🟢 event" },
  allgemein: { bg: "bg-muted text-muted-foreground", label: "⚫ allgemein" },
};

export default function BotschafterNachrichten() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [botschafter, setBotschafter] = useState<{ id: string; type: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  // Updates tab
  const [updates, setUpdates] = useState<Update[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);

  // Messages tab
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Unread counts
  const unreadUpdates = updates.filter(u => !readIds.has(u.id)).length;
  const unreadMessages = messages.filter(m => m.sender === "admin" && !m.is_read).length;

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!botschafter?.id) return;
    const channel = supabase
      .channel(`nachrichten-${botschafter.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "botschafter_nachrichten",
        filter: `botschafter_id=eq.${botschafter.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [botschafter?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const loadData = async () => {
    setLoading(true);
    const { data: bot } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, type")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle();

    if (!bot) { setLoading(false); return; }
    setBotschafter(bot);

    const [{ data: updData }, { data: readData }, { data: msgData }] = await Promise.all([
      supabase
        .from("botschafter_updates")
        .select("id, title, content, category, is_pinned, published_at, target_type")
        .lte("published_at", new Date().toISOString())
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false }),
      supabase
        .from("botschafter_updates_read")
        .select("update_id")
        .eq("botschafter_id", bot.id),
      supabase
        .from("botschafter_nachrichten")
        .select("id, content, sender, created_at, is_read")
        .eq("botschafter_id", bot.id)
        .order("created_at", { ascending: true }),
    ]);

    // Filter updates by target_type
    const filtered = (updData || []).filter(u =>
      !u.target_type || u.target_type === "alle" || u.target_type === bot.type
    );
    setUpdates(filtered);
    setReadIds(new Set((readData || []).map(r => r.update_id)));
    setMessages((msgData || []) as Message[]);
    setLoading(false);
  };

  const markAsRead = async (update: Update) => {
    setSelectedUpdate(update);
    if (!readIds.has(update.id) && botschafter) {
      await supabase.from("botschafter_updates_read").upsert(
        { botschafter_id: botschafter.id, update_id: update.id },
        { onConflict: "botschafter_id,update_id" }
      );
      setReadIds(prev => new Set([...prev, update.id]));
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !botschafter) return;
    setSending(true);
    const { error } = await supabase.from("botschafter_nachrichten").insert({
      botschafter_id: botschafter.id,
      content: newMsg.trim(),
      sender: "botschafter",
    });
    if (error) toast.error("Fehler beim Senden");
    else {
      setNewMsg("");
      // Optimistic: message will appear via realtime subscription
    }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!botschafter) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Du musst als aktiver Botschafter freigeschaltet sein.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Zurück</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <h1 className="text-2xl font-bold">Nachrichten</h1>
      </div>

      <Tabs defaultValue="updates">
        <TabsList>
          <TabsTrigger value="updates" className="gap-1.5">
            📢 Updates
            {unreadUpdates > 0 && <Badge className="bg-orange-500 text-white text-xs ml-1 h-5 min-w-[20px] px-1.5">{unreadUpdates}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            💬 Nachrichten
            {unreadMessages > 0 && <Badge className="bg-orange-500 text-white text-xs ml-1 h-5 min-w-[20px] px-1.5">{unreadMessages}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — Updates */}
        <TabsContent value="updates" className="space-y-3 mt-4">
          {updates.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📢</div>
              <h3 className="font-medium">Noch keine Updates</h3>
              <p className="text-sm text-muted-foreground mt-1">Pascal meldet sich bald!</p>
            </div>
          ) : updates.map(upd => {
            const isUnread = !readIds.has(upd.id);
            const cat = CAT_STYLES[upd.category || "allgemein"] || CAT_STYLES.allgemein;
            return (
              <Card
                key={upd.id}
                className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${upd.is_pinned ? "border-orange-500/40" : ""}`}
                onClick={() => markAsRead(upd)}
              >
                <CardContent className="p-4 flex gap-3">
                  {/* Unread dot */}
                  <div className="pt-1.5 w-3 flex-shrink-0">
                    {isUnread && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {upd.is_pinned && <Pin className="w-3.5 h-3.5 text-orange-500" />}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg}`}>{cat.label}</span>
                      {upd.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(upd.published_at), { addSuffix: true, locale: de })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm">{upd.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{upd.content.slice(0, 120)}{upd.content.length > 120 ? "…" : ""}</p>
                    <span className="text-xs text-orange-500 mt-1 inline-block">Mehr lesen →</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab 2 — Direct Messages */}
        <TabsContent value="chat" className="mt-4">
          <Card className="flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
            {/* Info banner */}
            <div className="px-4 py-2.5 bg-muted/50 text-xs text-muted-foreground rounded-t-lg border-b">
              💬 Nachrichten werden in der Regel innerhalb von 24h beantwortet. Bei dringenden Fragen: support@hufmanager.de
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-muted-foreground text-sm">Noch keine Nachrichten.</p>
                  <p className="text-muted-foreground text-xs mt-1">Stell Pascal direkt eine Frage — er antwortet persönlich.</p>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "botschafter" ? "justify-end" : "justify-start"}`}>
                  {msg.sender === "admin" && (
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
                      P
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.sender === "botschafter" ? "bg-orange-500 text-white" : "bg-muted"} rounded-2xl px-4 py-2.5`}>
                    {msg.sender === "admin" && (
                      <p className="text-xs font-medium mb-0.5 text-orange-500">Pascal · HufManager</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === "botschafter" ? "text-white/60" : "text-muted-foreground"}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleString("de", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-3 flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value.slice(0, 1000))}
                  placeholder="Nachricht schreiben..."
                  rows={2}
                  className="resize-none pr-12"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{newMsg.length}/1000</span>
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white h-10"
                disabled={!newMsg.trim() || sending}
                onClick={sendMessage}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Detail Modal */}
      <Dialog open={!!selectedUpdate} onOpenChange={() => setSelectedUpdate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedUpdate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {selectedUpdate.is_pinned && <Pin className="w-3.5 h-3.5 text-orange-500" />}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(CAT_STYLES[selectedUpdate.category || "allgemein"] || CAT_STYLES.allgemein).bg}`}>
                    {(CAT_STYLES[selectedUpdate.category || "allgemein"] || CAT_STYLES.allgemein).label}
                  </span>
                  {selectedUpdate.published_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedUpdate.published_at), { addSuffix: true, locale: de })}
                    </span>
                  )}
                </div>
                <DialogTitle>{selectedUpdate.title}</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{selectedUpdate.content}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <BotschafterFloatingHelp />
    </div>
  );
}
