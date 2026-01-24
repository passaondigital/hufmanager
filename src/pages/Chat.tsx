import { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, User, Search, Plus, ArrowLeft, Paperclip, X, Loader2, FileText, CheckCheck } from "lucide-react";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { ChatAttachment, getFileType, getFileEmoji } from "@/components/chat/ChatAttachment";
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
  image_url?: string | null;
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
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // NEU: Modus für "Neuer Chat"
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [startWithProcessed, setStartWithProcessed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Mark messages as read when selecting a conversation
  const markConversationAsRead = async (conversationId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      // Invalidate the unread count query to update badges
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    }
  };
  
  // Mark ALL messages as read (emergency button)
  const markAllAsRead = async () => {
    if (!user) return;
    
    // Get all conversations for this user
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`);
    
    if (!convs?.length) return;
    
    const conversationIds = convs.map(c => c.id);
    
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
      toast({ title: "Erledigt", description: "Alle Nachrichten wurden als gelesen markiert." });
    }
  };
  
  // Handle conversation selection
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    markConversationAsRead(conv.id);
  };

  // Handle URL parameters (from Anfragen -> Chat starten or notification click)
  useEffect(() => {
    const startWith = searchParams.get('startWith');
    const name = searchParams.get('name');
    
    if (startWith && user && !startWithProcessed) {
      // Direct user ID provided - find or create conversation
      setStartWithProcessed(true);
      handleStartWithUser(startWith);
      // Clear URL params
      setSearchParams({});
    } else if (name && role === 'provider' && !startWithProcessed) {
      // Name/contact info provided from Anfragen
      setStartWithProcessed(true);
      setIsNewChatMode(true);
      loadContacts();
      setSearchQuery(name);
      toast({
        title: "Neuer Chat",
        description: `Wähle einen Kunden für den Chat mit "${name}"`,
      });
      // Clear URL params
      setSearchParams({});
    }
  }, [searchParams, user, role, startWithProcessed]);

  // Function to handle startWith parameter (direct user ID)
  const handleStartWithUser = async (userId: string) => {
    if (!user) return;
    
    // SELF-HEALING: Ensure current user's profile exists before creating conversation
    const profileResult = await ensureUserProfile(user);
    if (!profileResult.success) {
      toast({ 
        title: "Profil-Fehler", 
        description: profileResult.error || "Profil konnte nicht erstellt werden.", 
        variant: "destructive" 
      });
      return;
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(provider_id.eq.${user.id},client_id.eq.${userId}),and(provider_id.eq.${userId},client_id.eq.${user.id})`)
      .maybeSingle();
    
    if (existingConv) {
      // Load profile for display
      const otherUserId = existingConv.provider_id === user.id ? existingConv.client_id : existingConv.provider_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', otherUserId)
        .maybeSingle();
      
      setSelectedConversation({
        ...existingConv,
        other_user: profile || { full_name: 'Unbekannt', email: null }
      });
      markConversationAsRead(existingConv.id);
    } else {
      // Create new conversation
      const isProvider = role === 'provider';
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          provider_id: isProvider ? user.id : userId,
          client_id: isProvider ? userId : user.id,
          subject: 'Chat',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (!error && newConv) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .maybeSingle();
        
        setSelectedConversation({
          ...newConv,
          other_user: profile || { full_name: 'Unbekannt', email: null }
        });
        markConversationAsRead(newConv.id);
        loadConversations();
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
    
    // Real-time subscription for new messages (updates unread counts immediately)
    const messagesChannel = supabase
      .channel("chat-unread-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // If I'm not the sender, refresh to update unread counts
          if (newMessage.sender_id !== user.id) {
            loadConversations();
            queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          // When messages are marked as read, refresh unread counts
          loadConversations();
          queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(messagesChannel);
    };
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
          
          // Count unread messages in this conversation (where I'm not the sender)
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user!.id);

          return {
            ...conv,
            other_user: profile || { full_name: "Unbekannt", email: null },
            unread_count: unreadCount || 0,
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
    
    // SELF-HEALING: Ensure current user's profile exists before creating conversation
    const profileResult = await ensureUserProfile(user);
    if (!profileResult.success) {
      toast({ 
        title: "Profil-Fehler", 
        description: profileResult.error || "Profil konnte nicht erstellt werden.", 
        variant: "destructive" 
      });
      return;
    }

    // 1. Prüfen, ob Chat schon existiert
    const existing = conversations.find(c => c.client_id === contact.profile_id);
    if (existing) {
        setSelectedConversation(existing);
        markConversationAsRead(existing.id);
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
        markConversationAsRead(newConv.id);
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
          const newMsg = payload.new as Message;
          // Avoid duplicates from optimistic UI or same user
          setMessages((prev) => {
            // Check if message already exists (by id or if it's a temp message from same sender with same content)
            const exists = prev.some(m => 
              m.id === newMsg.id || 
              (m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
            );
            if (exists) {
              // Replace temp message with real one
              return prev.map(m => 
                (m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content) 
                  ? newMsg 
                  : m
              );
            }
            return [...prev, newMsg];
          });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Allowed file types
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allAllowed = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocTypes];
    
    if (!allAllowed.includes(file.type)) {
      toast({ title: "Nicht unterstützt", description: "Erlaubt: Bilder (JPG, PNG, GIF), Videos (MP4, MOV) und Dokumente (PDF, DOC)", variant: "destructive" });
      return;
    }
    
    // Validate file size (20MB max for videos, 10MB for docs, 5MB for images)
    const maxSize = allowedVideoTypes.includes(file.type) ? 20 : allowedDocTypes.includes(file.type) ? 10 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      toast({ title: "Datei zu groß", description: `Maximal ${maxSize}MB erlaubt`, variant: "destructive" });
      return;
    }
    
    setSelectedImage(file);
    // Create preview for images/videos, null for docs
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage.from('chat-images').upload(fileName, file);
    if (error) return null;
    
    // Return just the file path, not a public URL - signed URLs will be fetched on display
    return fileName;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || !user) return;

    setSending(true);
    let fileUrl: string | null = null;
    let fileType: 'image' | 'video' | 'document' = 'image';
    
    if (selectedImage) {
      fileUrl = await uploadImage(selectedImage);
      fileType = getFileType(selectedImage.name);
      if (!fileUrl) {
        toast({ title: "Fehler", description: "Datei konnte nicht hochgeladen werden", variant: "destructive" });
        setSending(false);
        return;
      }
    }

    const messageContent = newMessage.trim() || (fileUrl ? getFileEmoji(fileType) + ' ' + (fileType === 'image' ? 'Bild' : fileType === 'video' ? 'Video' : 'Dokument') : '');
    
    // Optimistic UI: Add message immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString(),
      image_url: fileUrl,
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    clearImage();

    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: messageContent,
        image_url: fileUrl,
      }).select().single();

      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
        toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden: " + error.message, variant: "destructive" });
        console.error("Message send error:", error);
      } else if (data) {
        // Replace optimistic message with real one
        setMessages((prev) => prev.map(m => m.id === optimisticMessage.id ? data as Message : m));
      }

      // Zeitstempel der Konversation aktualisieren
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
        
    } catch (err: any) {
      setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
      toast({ title: "Fehler", description: err.message || "Nachricht konnte nicht gesendet werden", variant: "destructive" });
    } finally {
      setSending(false);
    }
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
            
            <div className="flex items-center gap-1">
              {/* Mark all as read button */}
              {!isNewChatMode && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={markAllAsRead}
                  title="Alle als gelesen markieren"
                >
                  <CheckCheck className="h-5 w-5" />
                </Button>
              )}
              <PushNotificationToggle variant="ghost" size="icon" showLabel={false} />
              {/* DER NEUE PLUS BUTTON (nur wenn nicht im Auswahlmodus) */}
              {!isNewChatMode && role === 'provider' && (
                  <Button variant="ghost" size="icon" onClick={handleStartNewChat}>
                      <Plus className="h-5 w-5" />
                  </Button>
              )}
            </div>
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
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 flex gap-3 items-center transition-colors",
                      selectedConversation?.id === conv.id && "bg-muted"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Unread indicator dot */}
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        (conv.unread_count ?? 0) > 0 ? "font-semibold" : "font-medium"
                      )}>
                        {conv.other_user?.full_name || "Unbekannt"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.subject || "Keine Betreff"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.last_message_at), "dd.MM", { locale: de })}
                      </span>
                      {/* Unread count badge */}
                      {(conv.unread_count ?? 0) > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
                {filteredConversations.length === 0 && !loading && (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground text-sm mb-4">
                      Keine Konversationen vorhanden
                    </p>
                    {role === 'provider' && (
                      <Button onClick={handleStartNewChat} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Neuen Chat starten
                      </Button>
                    )}
                  </div>
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
                        {msg.image_url && (
                          <ChatAttachment 
                            filePath={msg.image_url}
                            fileType={getFileType(msg.image_url)}
                            fileName={msg.image_url.split('/').pop()}
                          />
                        )}
                        {msg.content && !msg.content.match(/^(📷|🎥|📄)\s/) && (
                          <p className="text-sm">{msg.content}</p>
                        )}
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
              {/* File Preview */}
              {selectedImage && (
                <div className="relative mb-3 inline-block">
                  {selectedImage.type.startsWith('image/') && imagePreview ? (
                    <img src={imagePreview} alt="Vorschau" className="max-h-24 rounded-lg object-cover" />
                  ) : selectedImage.type.startsWith('video/') && imagePreview ? (
                    <video src={imagePreview} className="max-h-24 rounded-lg" muted />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium">{selectedImage.name}</span>
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={clearImage}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                {/* Hidden file input - supports images, videos, and documents */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov,video/quicktime,video/webm,application/pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  type="button"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Input
                  placeholder="Nachricht schreiben..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={(!newMessage.trim() && !selectedImage) || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
