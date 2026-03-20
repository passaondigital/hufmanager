import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, MessageSquare, Paperclip, X, FileText, User } from "lucide-react";
import { ChatAttachment, getFileType, getFileEmoji } from "@/components/chat/ChatAttachment";
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
  image_url?: string | null;
}

interface Provider {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function ClientExpertenChat() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const initChat = async () => {
      setLoading(true);
      try {
        let finalProviderId: string | null = null;
        const { data: activeGrant } = await supabase
          .from("access_grants").select("provider_id")
          .eq("client_id", user.id).eq("status", "active").eq("is_active", true)
          .order("granted_at", { ascending: false }).limit(1).maybeSingle();
        if (activeGrant?.provider_id) finalProviderId = activeGrant.provider_id;

        if (!finalProviderId) {
          const { data: profile } = await supabase
            .from("profiles").select("created_by_provider_id").eq("id", user.id).maybeSingle();
          finalProviderId = profile?.created_by_provider_id || null;
        }

        if (!finalProviderId) {
          const { data: providerId } = await supabase.rpc('get_or_assign_provider_for_client');
          if (providerId) finalProviderId = providerId as string;
        }

        if (!finalProviderId) { setLoading(false); return; }

        const { data: providerProfile } = await supabase
          .from("profiles").select("id, full_name, email").eq("id", finalProviderId).maybeSingle();
        if (providerProfile) setProvider(providerProfile);
        else { setLoading(false); return; }

        const { data: existingConv } = await supabase
          .from("conversations").select("id")
          .eq("provider_id", finalProviderId).eq("client_id", user.id).maybeSingle();

        if (existingConv) {
          setConversationId(existingConv.id);
        } else {
          const { data: newConv, error } = await supabase
            .from("conversations")
            .insert({ provider_id: finalProviderId, client_id: user.id, subject: "Chat", last_message_at: new Date().toISOString() })
            .select("id").single();
          if (!error && newConv) setConversationId(newConv.id);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setLoading(false);
      }
    };
    initChat();
  }, [user]);

  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages").select("id, conversation_id, sender_id, content, created_at, is_read")
        .eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    loadMessages();

    const channel = supabase
      .channel(`client-messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/mov','video/quicktime','video/webm','application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: "Nicht unterstützt", variant: "destructive" }); return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Datei zu groß", variant: "destructive" }); return;
    }
    setSelectedImage(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setImagePreview(URL.createObjectURL(file));
    } else { setImagePreview(null); }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !conversationId || !user) return;
    setSending(true);

    let fileUrl: string | null = null;
    if (selectedImage) {
      const fileName = `${user.id}/${Date.now()}.${selectedImage.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('chat-images').upload(fileName, selectedImage);
      if (error) { setSending(false); return; }
      fileUrl = fileName;
    }

    const content = newMessage.trim() || (fileUrl ? getFileEmoji(getFileType(fileUrl)) + ' Datei' : '');
    const optimistic: Message = { id: `temp-${Date.now()}`, conversation_id: conversationId, sender_id: user.id, content, is_read: false, created_at: new Date().toISOString(), image_url: fileUrl };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage(""); clearImage();

    const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content, image_url: fileUrl }).select().single();
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data as Message : m));
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!provider) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">Kein Experte verbunden</p>
        <p className="text-xs">Du hast noch keinen Hufbearbeiter oder Fachpartner, mit dem du chatten kannst.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {provider.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{provider.full_name || "Hufbearbeiter"}</p>
          <p className="text-xs text-muted-foreground truncate">{provider.email}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Noch keine Nachrichten</p>
              <p className="text-xs">Starte die Unterhaltung mit deinem Experten.</p>
            </div>
          ) : messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                  {msg.image_url && <ChatAttachment filePath={msg.image_url} fileType={getFileType(msg.image_url)} fileName={msg.image_url.split('/').pop()} />}
                  {msg.content && !msg.content.match(/^(📷|🎥|📄)\s/) && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: de })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2 pt-3 border-t border-border">
        <input ref={fileInputRef} type="file" accept="image/*,video/*,application/pdf" onChange={handleFileSelect} className="hidden" />
        {selectedImage && (
          <div className="relative">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <FileText className="h-8 w-8 text-primary" />
            )}
            <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 h-4 w-4" onClick={clearImage}><X className="h-2 w-2" /></Button>
          </div>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Nachricht schreiben..." className="flex-1" disabled={sending} />
        <Button type="submit" size="icon" disabled={(!newMessage.trim() && !selectedImage) || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
