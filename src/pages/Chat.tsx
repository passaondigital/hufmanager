import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, User, Search, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Conversation {
  id: string;
  provider_id: string;
  client_id: string;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  other_user?: {
    full_name: string | null;
    email: string | null;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  user_id: string | null; // Wichtig: Nur Kunden mit User-Account können chatten
}

export default function Chat() {
  const { user, role } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Neu: Modus für "Neuen Chat starten"
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Lade existierende Konversationen
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, role]);

  const loadConversations = async () => {
    setLoading(true);
    const { data: rawData, error } = await (supabase as any)
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      setLoading(false);
      return;
    }

    const conversationsWithUsers = await Promise.all(
      ((rawData as unknown as Conversation[]) || []).map(async (conv) => {
        const otherUserId = role === "provider" ? conv.client_id : conv.provider_id;
        
        // Versuche erst Profile zu laden
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", otherUserId)
          .maybeSingle();

        return {
          ...conv,
          other_user: profile || { full_name: "Unbekannt", email: null },
        } as Conversation;
      })
    );

    setConversations(conversationsWithUsers);
    setLoading(false);
  };

  // 2. Lade Kontakte für "Neuen Chat" (Nur Provider)
  const loadContactsForNewChat = async () => {
    if (role !== 'provider') return;
    
    // Lade Kontakte, die bereits einen User-Account haben (user_id ist nicht null)
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, user_id')
      .not('user_id', 'is', null);

    if (!error && data) {
      setAvailableContacts(data as Contact[]);
    }
  };

  // Wenn man auf "+" klickt
  const handleStartNewChatClick = () => {
    setIsNewChatMode(true);
    loadContactsForNewChat();
  };

  const startChatWithContact = async (contact: Contact) => {
    if (!user || !contact.user_id) return;

    // Prüfen, ob schon eine Konversation existiert
    const existing = conversations.find(c => c.client_id === contact.user_id);
    
    if (existing) {
      setSelectedConversation(existing);
      setIsNewChatMode(false);
    } else {
      // Neue Konversation erstellen
      const { data, error } = await (supabase as any)
        .from('conversations')
        .insert({
          provider_id: user.id,
          client_id: contact.user_id,
          subject: 'Neuer Chat',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        await loadConversations(); // Liste neu laden
        // Wir müssen das neue Objekt im richtigen Format setzen (mit other_user)
        setSelectedConversation({
            ...data,
            other_user: { full_name: `${contact.first_name} ${contact.last_name}`, email: contact.email }
        });
        setIsNewChatMode(false);
      }
    }
  };

  // 3. Nachrichten laden (wie vorher)
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!error) {
        setMessages((data as unknown as Message[]) || []);
        // Mark as read logic here...
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const { error } = await (supabase as any).from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) {
      await (supabase as any)
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      setNewMessage("");
    }
  };

  // Filter Logik
  const filteredConversations = conversations.filter((conv) =>
    conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = availableContacts.filter((c) => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar (Liste) */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isNewChatMode ? (
                <>
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsNewChatMode(false)}>
                     <ArrowLeft className="h-4 w-4" />
                   </Button>
                   Kunden wählen
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Nachrichten
                </>
              )}
            </CardTitle>
            {!isNewChatMode && role === 'provider' && (
                <Button variant="ghost" size="icon" onClick={handleStartNewChatClick} title="Neuen Chat starten">
                    <Plus className="h-5 w-5" />
                </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isNewChatMode ? "Kunde suchen..." : "Chat suchen..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {isNewChatMode ? (
                // --- KONTAKTLISTE (NEU) ---
                <div className="divide-y">
                    {filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Keine Kunden gefunden, die sich bereits eingeloggt haben.
                        </div>
                    ) : (
                        filteredContacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => startChatWithContact(contact)}
                                className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><User className="h-4 w-4"/></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{contact.first_name} {contact.last_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : (
                // --- BESTEHENDE CHATS ---
                <div className="divide-y">
                    {loading ? (
                    <div className="p-4 text-center text-muted-foreground">Laden...</div>
                    ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        <p>Keine Chats.</p>
                        {role === 'provider' && <p className="text-xs mt-1">Klicke auf + um zu starten.</p>}
                    </div>
                    ) : (
                    filteredConversations.map((conv) => (
                        <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={cn(
                            "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedConversation?.id === conv.id && "bg-muted"
                        )}
                        >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                            <AvatarFallback>
                                {conv.other_user?.full_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                            </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <p className="font-medium truncate text-sm">
                                {conv.other_user?.full_name || "Unbekannt"}
                                </p>
                                {conv.unread_count && conv.unread_count > 0 && (
                                <Badge variant="default" className="ml-2 text-[10px] px-1 py-0 h-4">
                                    {conv.unread_count}
                                </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                {format(new Date(conv.last_message_at), "dd.MM. HH:mm", { locale: de })}
                            </p>
                            </div>
                        </div>
                        </button>
                    ))
                    )}
                </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col shadow-sm">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b py-3 px-4 min-h-[60px] flex justify-center">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {selectedConversation.other_user?.full_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {selectedConversation.other_user?.full_name || "Unbekannt"}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 bg-muted/5">
              <ScrollArea className="h-full p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_id === user?.id ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                          msg.sender_id === user?.id
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-white dark:bg-card text-foreground border rounded-bl-none"
                        )}
                      >
                        <p>{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1 text-right",
                          msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-3 border-t bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nachricht..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Wähle einen Chat aus oder starte einen neuen.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
