import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";

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
  full_name: string;
  email: string | null;
  profile_id: string | null;
}

export default function Chat() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // NEU: Modus für "Neuer Chat"
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle navigation state (from Anfragen -> Chat starten)
  useEffect(() => {
    const state = location.state as { startChatWith?: { name?: string; phone?: string; email?: string } } | null;
    if (state?.startChatWith && role === 'provider') {
      setIsNewChatMode(true);
      loadContacts();
      // Pre-fill search with name if provided
      if (state.startChatWith.name) {
        setSearchQuery(state.startChatWith.name);
      }
      toast({
        title: "Neuer Chat",
        description: state.startChatWith.name 
          ? `Wähle einen Kunden für den Chat mit "${state.startChatWith.name}"` 
          : "Wähle einen Kunden aus der Liste",
      });
      // Clear the state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, role]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, role]);

  const loadConversations = async () => {
    setLoading(true);
    // Wir nutzen 'as any', da Types manchmal zicken, aber die Logik stimmt.
    const { data: rawData, error } = await (supabase as any)
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (!error && rawData) {
      const conversationsWithUsers = await Promise.all(
        ((rawData as unknown as Conversation[]) || []).map(async (conv) => {
          const otherUserId = role === "provider" ? conv.client_id : conv.provider_id;
          
          // Profil des Gesprächspartners laden
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
    }
    setLoading(false);
  };

  // Kontakte laden: Suche in profiles über access_grants UND contacts mit profile_id
  const loadContacts = async () => {
    if (role !== 'provider' || !user?.id) return;
    
    const contacts: Contact[] = [];
    
    // 1. Profiles über access_grants (aktive Verbindungen)
    const { data: accessData } = await supabase
      .from('access_grants')
      .select('client_id, profiles:client_id(id, full_name, email)')
      .eq('provider_id', user.id)
      .eq('is_active', true);
    
    if (accessData) {
      accessData.forEach((ag: any) => {
        if (ag.profiles && ag.profiles.id) {
          contacts.push({
            id: ag.profiles.id,
            full_name: ag.profiles.full_name || 'Unbekannt',
            email: ag.profiles.email,
            profile_id: ag.profiles.id,
          });
        }
      });
    }
    
    // 2. Profiles created by this provider
    const { data: createdProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('created_by_provider_id', user.id)
      .is('deleted_at', null);
    
    if (createdProfiles) {
      createdProfiles.forEach((p) => {
        // Vermeiden von Duplikaten
        if (!contacts.find(c => c.profile_id === p.id)) {
          contacts.push({
            id: p.id,
            full_name: p.full_name || 'Unbekannt',
            email: p.email,
            profile_id: p.id,
          });
        }
      });
    }
    
    // 3. Contacts mit profile_id (Legacy)
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, full_name, email, profile_id')
      .eq('provider_id', user.id)
      .not('profile_id', 'is', null);
    
    if (contactsData) {
      contactsData.forEach((c) => {
        if (c.profile_id && !contacts.find(ct => ct.profile_id === c.profile_id)) {
          contacts.push({
            id: c.id,
            full_name: c.full_name,
            email: c.email,
            profile_id: c.profile_id,
          });
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
    
    // 1. Prüfen, ob Chat schon existiert
    const existing = conversations.find(c => c.client_id === contact.profile_id);
    if (existing) {
        setSelectedConversation(existing);
        setIsNewChatMode(false);
        return;
    }

    // 2. Neuen Chat anlegen
    const { data, error } = await (supabase as any)
        .from('conversations')
        .insert({
            provider_id: user.id,
            client_id: contact.profile_id,
            subject: 'Chat',
            last_message_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (!error && data) {
        await loadConversations();
        // Manuelles Zusammenbauen für sofortige Anzeige
        const newConv = { 
            ...data, 
            other_user: { full_name: contact.full_name, email: contact.email } 
        };
        setSelectedConversation(newConv);
        setIsNewChatMode(false);
    }
  };

  // Nachrichten laden
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      const { data } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data as Message[]);
    };

    loadMessages();

    // Realtime Subscription
    const channel = supabase.channel(`messages-${selectedConversation.id}`)
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` }, 
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  // Autoscroll nach unten
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    await (supabase as any).from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    // Zeitstempel der Konversation aktualisieren
    await (supabase as any)
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedConversation.id);

    setNewMessage("");
  };

  // Suchfilter (case-insensitive)
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.other_user?.full_name?.toLowerCase().includes(query) ||
      c.other_user?.email?.toLowerCase().includes(query)
    );
  });
  
  const filteredContacts = availableContacts.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      
      {/* --- SIDEBAR --- */}
      <Card className="w-80 flex flex-col">
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
            
            {/* DER NEUE PLUS BUTTON (nur wenn nicht im Auswahlmodus) */}
            {!isNewChatMode && role === 'provider' && (
                <Button variant="ghost" size="icon" onClick={handleStartNewChat}>
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
              // ANSICHT: KUNDENLISTE
              <div className="divide-y">
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => startChatWithContact(c)}
                    className="w-full p-3 text-left hover:bg-muted/50 flex gap-3 items-center transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {c.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    Keine Kunden gefunden
                  </p>
                )}
              </div>
            ) : (
              // ANSICHT: KONVERSATIONSLISTE
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 flex gap-3 items-center transition-colors",
                      selectedConversation?.id === conv.id && "bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.other_user?.full_name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.subject || "Keine Betreff"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conv.last_message_at), "dd.MM", { locale: de })}
                    </span>
                  </button>
                ))}
                {filteredConversations.length === 0 && !loading && (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    Keine Konversationen
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* --- CHAT BEREICH --- */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    {selectedConversation.other_user?.full_name || "Unbekannt"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.other_user?.email}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
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
                          "max-w-[70%] rounded-lg px-4 py-2",
                          msg.sender_id === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Nachricht schreiben..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Wählen Sie eine Konversation aus</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
