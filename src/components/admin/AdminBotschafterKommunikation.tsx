import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Eye, Megaphone, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Botschafter = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  type: string | null;
};

type ChatThread = {
  botschafter: Botschafter;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

type Message = {
  id: string;
  content: string;
  sender: string;
  created_at: string | null;
  is_read: boolean | null;
};

export function AdminBotschafterKommunikation() {
  const { user } = useAuth();

  // Update form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("allgemein");
  const [targetType, setTargetType] = useState("alle");
  const [isPinned, setIsPinned] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Chat state
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedBot, setSelectedBot] = useState<Botschafter | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const loadThreads = async () => {
    setLoadingThreads(true);
    // Get all botschafter with messages
    const { data: bots } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, first_name, last_name, type")
      .eq("status", "active");

    if (!bots?.length) { setLoadingThreads(false); return; }

    const threadList: ChatThread[] = [];
    for (const bot of bots) {
      const { data: msgs } = await supabase
        .from("botschafter_nachrichten")
        .select("content, created_at, sender, is_read")
        .eq("botschafter_id", bot.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (msgs?.length) {
        const unreadCount = await supabase
          .from("botschafter_nachrichten")
          .select("id", { count: "exact", head: true })
          .eq("botschafter_id", bot.id)
          .eq("sender", "botschafter")
          .eq("is_read", false);

        threadList.push({
          botschafter: bot,
          lastMessage: msgs[0].content,
          lastAt: msgs[0].created_at || "",
          unread: unreadCount.count || 0,
        });
      }
    }

    threadList.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    setThreads(threadList);
    setLoadingThreads(false);
  };

  const openChat = async (bot: Botschafter) => {
    setSelectedBot(bot);
    const { data } = await supabase
      .from("botschafter_nachrichten")
      .select("id, content, sender, created_at, is_read")
      .eq("botschafter_id", bot.id)
      .order("created_at", { ascending: true });

    setChatMessages((data || []) as Message[]);

    // Mark botschafter messages as read
    await supabase
      .from("botschafter_nachrichten")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("botschafter_id", bot.id)
      .eq("sender", "botschafter")
      .eq("is_read", false);

    setThreads(prev => prev.map(t =>
      t.botschafter.id === bot.id ? { ...t, unread: 0 } : t
    ));
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedBot) return;
    setSendingReply(true);
    const { error } = await supabase.from("botschafter_nachrichten").insert({
      botschafter_id: selectedBot.id,
      content: reply.trim(),
      sender: "admin",
    });
    if (error) toast.error("Fehler beim Senden");
    else {
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: reply.trim(),
        sender: "admin",
        created_at: new Date().toISOString(),
        is_read: false,
      }]);
      setReply("");
    }
    setSendingReply(false);
  };

  const publishUpdate = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Titel und Inhalt sind Pflichtfelder"); return; }
    setPublishing(true);
    const { error } = await supabase.from("botschafter_updates").insert({
      title: title.trim(),
      content: content.trim(),
      category,
      target_type: targetType,
      is_pinned: isPinned,
      published_at: new Date().toISOString(),
    });
    if (error) toast.error("Fehler: " + error.message);
    else {
      toast.success("Update veröffentlicht!");
      setTitle(""); setContent(""); setCategory("allgemein"); setTargetType("alle"); setIsPinned(false); setPreview(false);
    }
    setPublishing(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">💬 Kommunikation</h1>

      <Tabs defaultValue="update">
        <TabsList>
          <TabsTrigger value="update" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Update senden</TabsTrigger>
          <TabsTrigger value="chats" className="gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Chats
            {threads.reduce((s, t) => s + t.unread, 0) > 0 && (
              <Badge className="bg-orange-500 text-white text-xs ml-1 h-5 min-w-[20px] px-1.5">
                {threads.reduce((s, t) => s + t.unread, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Sub-tab A: Send Update */}
        <TabsContent value="update" className="mt-4">
          <Card className="max-w-[700px]">
            <CardHeader>
              <CardTitle className="text-lg">Neues Update veröffentlichen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titel</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Neue Provision-Staffel ab Mai" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Inhalt <span className="text-xs text-muted-foreground">(Markdown unterstützt)</span></label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Update-Inhalt..." rows={8} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Kategorie</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wichtig">🔴 Wichtig</SelectItem>
                      <SelectItem value="provision">🟠 Provision</SelectItem>
                      <SelectItem value="feature">🔵 Feature</SelectItem>
                      <SelectItem value="event">🟢 Event</SelectItem>
                      <SelectItem value="allgemein">⚫ Allgemein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Zielgruppe</label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">Alle</SelectItem>
                      <SelectItem value="creator">Creator</SelectItem>
                      <SelectItem value="profi">Profi</SelectItem>
                      <SelectItem value="unternehmen">Unternehmen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                <label className="text-sm">Anheften (wird immer oben angezeigt)</label>
              </div>

              {preview && (
                <Card className={`border ${isPinned ? "border-orange-500/40" : ""}`}>
                  <CardContent className="p-4">
                    <Badge className="mb-2">{category}</Badge>
                    <h3 className="font-bold">{title || "Kein Titel"}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{content || "Kein Inhalt"}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreview(!preview)}>
                  <Eye className="w-4 h-4 mr-1" /> {preview ? "Vorschau ausblenden" : "Vorschau"}
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={publishUpdate} disabled={publishing}>
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Megaphone className="w-4 h-4 mr-1" />}
                  Jetzt veröffentlichen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-tab B: Chat Threads */}
        <TabsContent value="chats" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
            {/* Thread list */}
            <Card className="overflow-y-auto">
              <CardContent className="p-2">
                {loadingThreads ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : threads.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Keine Chats vorhanden</p>
                ) : threads.map(t => (
                  <button
                    key={t.botschafter.id}
                    onClick={() => openChat(t.botschafter)}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted/80 transition-colors ${selectedBot?.id === t.botschafter.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {t.botschafter.first_name} {t.botschafter.last_name}
                      </span>
                      {t.unread > 0 && <Badge className="bg-orange-500 text-white text-xs h-5 min-w-[20px] px-1.5">{t.unread}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t.lastAt ? new Date(t.lastAt).toLocaleString("de", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Chat detail */}
            <Card className="flex flex-col">
              {!selectedBot ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Wähle einen Chat aus der Liste
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b font-medium text-sm">
                    Chat mit {selectedBot.first_name} {selectedBot.last_name}
                    {selectedBot.type && <Badge variant="outline" className="ml-2 text-xs">{selectedBot.type}</Badge>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] ${msg.sender === "admin" ? "bg-orange-500 text-white" : "bg-muted"} rounded-2xl px-4 py-2.5`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender === "admin" ? "text-white/60" : "text-muted-foreground"}`}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleString("de", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="border-t p-3 flex gap-2 items-end">
                    <Textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Antwort schreiben..."
                      rows={2}
                      className="resize-none flex-1"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    />
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white h-10" disabled={!reply.trim() || sendingReply} onClick={sendReply}>
                      {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
