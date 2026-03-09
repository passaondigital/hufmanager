import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, User, Search, Plus, ArrowLeft, CheckCheck, Loader2 } from "lucide-react";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { HufChatUI } from "@/components/chat/HufChatUI";
import { useHufChat } from "@/hooks/useHufChat";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { ensureUserProfile } from "@/lib/ensureProfile";
import { useQueryClient } from "@tanstack/react-query";

interface Conversation {
  id: string;
  provider_id: string;
  client_id: string;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  other_user?: { full_name: string | null; email: string | null };
  unread_count?: number;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  profile_id: string | null;
}

export default function Chat() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [startWithProcessed, setStartWithProcessed] = useState(false);
  // Mobile: show chat vs list
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // ── Unified chat hook ────────────────────────
  const {
    messages, reactions, isLoading: chatLoading, isSending,
    sendMessage, deleteMessage, markAsRead, replyTo, setReplyTo,
    addReaction, typingUsers, sendTyping,
  } = useHufChat({
    conversationId: selectedConversation?.id || null,
    enabled: !!selectedConversation,
  });

  // ── Mark conversation as read ────────────────
  const markConversationAsRead = async (conversationId: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`);
    if (!convs?.length) return;
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("conversation_id", convs.map(c => c.id))
      .neq("sender_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    toast({ title: "Alle als gelesen markiert" });
  };

  // ── Select conversation ──────────────────────
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    markConversationAsRead(conv.id);
    setMobileShowChat(true);
  };

  // ── URL params (startWith) ───────────────────
  useEffect(() => {
    const startWith = searchParams.get("startWith");
    const name = searchParams.get("name");
    if (startWith && user && !startWithProcessed) {
      setStartWithProcessed(true);
      handleStartWithUser(startWith);
      setSearchParams({});
    } else if (name && role === "provider" && !startWithProcessed) {
      setStartWithProcessed(true);
      setIsNewChatMode(true);
      loadContacts();
      setSearchQuery(name);
      setSearchParams({});
    }
  }, [searchParams, user, role, startWithProcessed]);

  const handleStartWithUser = async (userId: string) => {
    if (!user) return;
    const profileResult = await ensureUserProfile(user);
    if (!profileResult.success) return;

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(provider_id.eq.${user.id},client_id.eq.${userId}),and(provider_id.eq.${userId},client_id.eq.${user.id})`)
      .maybeSingle();

    if (existingConv) {
      const otherUserId = existingConv.provider_id === user.id ? existingConv.client_id : existingConv.provider_id;
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", otherUserId).maybeSingle();
      const conv = { ...existingConv, other_user: profile || { full_name: "Unbekannt", email: null } };
      setSelectedConversation(conv);
      markConversationAsRead(conv.id);
      setMobileShowChat(true);
    } else {
      const isProvider = role === "provider";
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ provider_id: isProvider ? user.id : userId, client_id: isProvider ? userId : user.id, subject: "Chat", last_message_at: new Date().toISOString() })
        .select()
        .single();
      if (newConv) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
        setSelectedConversation({ ...newConv, other_user: profile || { full_name: "Unbekannt", email: null } });
        setMobileShowChat(true);
        loadConversations();
      }
    }
  };

  // ── Load conversations ───────────────────────
  useEffect(() => {
    if (!user) return;
    loadConversations();

    const channel = supabase
      .channel("chat-list-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== user.id) {
          loadConversations();
          queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        loadConversations();
        queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, role]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data: rawData } = await (supabase as any)
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (rawData) {
      const withUsers = await Promise.all(
        (rawData as Conversation[]).map(async (conv) => {
          const otherUserId = role === "provider" ? conv.client_id : conv.provider_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", otherUserId)
            .maybeSingle();
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);
          return { ...conv, other_user: profile || { full_name: "Unbekannt", email: null }, unread_count: count || 0 };
        })
      );
      setConversations(withUsers);
    }
    setLoading(false);
  };

  // ── Load contacts ────────────────────────────
  const loadContacts = async () => {
    if (role !== "provider" || !user?.id) return;
    const contacts: Contact[] = [];

    const { data: accessData } = await supabase
      .from("access_grants")
      .select("client_id, profiles:client_id(id, full_name, email)")
      .eq("provider_id", user.id)
      .eq("is_active", true);
    if (accessData) {
      accessData.forEach((ag: any) => {
        if (ag.profiles?.id) {
          contacts.push({ id: ag.profiles.id, full_name: ag.profiles.full_name || "Unbekannt", email: ag.profiles.email, profile_id: ag.profiles.id });
        }
      });
    }

    const { data: created } = await supabase.from("profiles").select("id, full_name, email").eq("created_by_provider_id", user.id).is("deleted_at", null);
    if (created) {
      created.forEach(p => {
        if (!contacts.find(c => c.profile_id === p.id)) {
          contacts.push({ id: p.id, full_name: p.full_name || "Unbekannt", email: p.email, profile_id: p.id });
        }
      });
    }

    setAvailableContacts(contacts);
  };

  const handleStartNewChat = () => {
    setIsNewChatMode(true);
    loadContacts();
  };

  const startChatWithContact = async (contact: Contact) => {
    if (!user || !contact.profile_id) return;
    const profileResult = await ensureUserProfile(user);
    if (!profileResult.success) return;

    const existing = conversations.find(c => c.client_id === contact.profile_id);
    if (existing) {
      setSelectedConversation(existing);
      markConversationAsRead(existing.id);
      setIsNewChatMode(false);
      setMobileShowChat(true);
      return;
    }

    const { data } = await (supabase as any)
      .from("conversations")
      .insert({ provider_id: user.id, client_id: contact.profile_id, subject: "Chat", last_message_at: new Date().toISOString() })
      .select()
      .single();

    if (data) {
      await loadConversations();
      const newConv = { ...data, other_user: { full_name: contact.full_name, email: contact.email } };
      setSelectedConversation(newConv);
      setMobileShowChat(true);
      setIsNewChatMode(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.other_user?.full_name?.toLowerCase().includes(q) || c.other_user?.email?.toLowerCase().includes(q);
  });

  const filteredContacts = availableContacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  // ── Render ───────────────────────────────────
  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 md:gap-4">
      {/* Sidebar - hidden on mobile when chat is open */}
      <Card className={cn(
        "w-full md:w-80 flex flex-col shrink-0",
        mobileShowChat ? "hidden md:flex" : "flex"
      )}>
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isNewChatMode ? (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsNewChatMode(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  Kunde wählen
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Nachrichten
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {!isNewChatMode && (
                <Button variant="ghost" size="icon" onClick={markAllAsRead} title="Alle als gelesen markieren">
                  <CheckCheck className="h-5 w-5" />
                </Button>
              )}
              <PushNotificationToggle variant="ghost" size="icon" showLabel={false} />
              {!isNewChatMode && role === "provider" && (
                <Button variant="ghost" size="icon" onClick={handleStartNewChat}>
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isNewChatMode ? "Kunde suchen…" : "Chat suchen…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isNewChatMode ? (
              <div className="divide-y">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => startChatWithContact(c)}
                    className="w-full p-3 text-left hover:bg-muted/50 flex gap-3 items-center transition-colors"
                  >
                    <Avatar className="h-8 w-8"><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground text-sm">Keine Kunden gefunden</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 flex gap-3 items-center transition-colors",
                      selectedConversation?.id === conv.id && "bg-muted"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10"><AvatarFallback><User className="h-5 w-5" /></AvatarFallback></Avatar>
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", (conv.unread_count ?? 0) > 0 ? "font-semibold" : "font-medium")}>
                        {conv.other_user?.full_name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{conv.subject || "Chat"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">{format(new Date(conv.last_message_at), "dd.MM", { locale: de })}</span>
                      {(conv.unread_count ?? 0) > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">{conv.unread_count}</Badge>
                      )}
                    </div>
                  </button>
                ))}
                {!loading && filteredConversations.length === 0 && (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm mb-4">Keine Konversationen</p>
                    {role === "provider" && (
                      <Button onClick={handleStartNewChat} size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Neuen Chat starten
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className={cn(
        "flex-1 flex flex-col overflow-hidden",
        !mobileShowChat ? "hidden md:flex" : "flex"
      )}>
        {selectedConversation ? (
          <HufChatUI
            messages={messages}
            reactions={reactions}
            isLoading={chatLoading}
            isSending={isSending}
            replyTo={replyTo}
            typingUsers={typingUsers}
            otherUserName={selectedConversation.other_user?.full_name || "Unbekannt"}
            onSendMessage={sendMessage}
            onDeleteMessage={deleteMessage}
            onAddReaction={addReaction}
            onSetReplyTo={setReplyTo}
            onTyping={sendTyping}
            onBack={() => setMobileShowChat(false)}
            showBackButton
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Wähle eine Konversation aus</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
