import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getFileType, getFileEmoji } from "@/components/chat/ChatAttachment";

// ── Types ──────────────────────────────────────
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  image_url: string | null;
  voice_url: string | null;
  voice_duration_seconds: number | null;
  deleted_at: string | null;
  deleted_for_all: boolean;
  reply_to_id: string | null;
  reply_to_content: string | null;
}

export interface ChatReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReplyTarget {
  id: string;
  content: string;
  senderName: string;
}

interface UseHufChatOptions {
  conversationId: string | null;
  enabled?: boolean;
}

// ── Hook ───────────────────────────────────────
export function useHufChat({ conversationId, enabled = true }: UseHufChatOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load messages ────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, is_read, read_at, created_at, image_url, voice_url, voice_duration_seconds, deleted_at, deleted_for_all, reply_to_id, reply_to_content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
    setIsLoading(false);
  }, [conversationId, user]);

  // ── Load reactions ───────────────────────────
  const loadReactions = useCallback(async () => {
    if (!conversationId || !user) return;
    
    // Get all message IDs for this conversation then load reactions
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, user_id, emoji, created_at")
      .in("message_id", messages.map(m => m.id));
    
    if (data) {
      setReactions(data as ChatReaction[]);
    }
  }, [conversationId, user, messages.length]);

  // ── Realtime subscription ────────────────────
  useEffect(() => {
    if (!conversationId || !enabled || !user) return;
    
    loadMessages();

    const channel = supabase
      .channel(`huf-chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          const exists = prev.some(m => 
            m.id === newMsg.id ||
            (m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
          );
          if (exists) {
            return prev.map(m =>
              m.id.startsWith("temp-") && m.sender_id === newMsg.sender_id && m.content === newMsg.content
                ? newMsg : m
            );
          }
          return [...prev, newMsg];
        });
        
        // Auto-mark as read if I'm viewing
        if (newMsg.sender_id !== user.id) {
          markAsRead();
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, user?.id]);

  // ── Presence for typing ──────────────────────
  useEffect(() => {
    if (!conversationId || !enabled || !user) return;

    const channel = supabase.channel(`presence-${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        for (const [userId, presences] of Object.entries(state)) {
          if (userId !== user.id) {
            const latest = (presences as any[])[0];
            if (latest?.typing) typing.push(userId);
          }
        }
        setTypingUsers(typing);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [conversationId, enabled, user?.id]);

  // ── Load reactions when messages change ──────
  useEffect(() => {
    if (messages.length > 0) loadReactions();
  }, [messages.length]);

  // ── Mark as read ─────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;
    
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    
    queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
  }, [conversationId, user]);

  // ── Send typing indicator ────────────────────
  const sendTyping = useCallback(() => {
    if (!presenceChannelRef.current || !user) return;
    
    presenceChannelRef.current.track({ typing: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({ typing: false });
    }, 3000);
  }, [user]);

  // ── Send message ─────────────────────────────
  const sendMessage = useCallback(async (
    content: string,
    options?: {
      file?: File;
      voiceBlob?: Blob;
      voiceDuration?: number;
    }
  ) => {
    if (!conversationId || !user) return;
    if (!content.trim() && !options?.file && !options?.voiceBlob) return;

    setIsSending(true);
    let imageUrl: string | null = null;
    let voiceUrl: string | null = null;
    let voiceDuration: number | null = null;

    try {
      // Upload file
      if (options?.file) {
        const fileExt = options.file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from("chat-images").upload(fileName, options.file);
        if (error) throw new Error("Datei konnte nicht hochgeladen werden");
        imageUrl = fileName;
      }

      // Upload voice
      if (options?.voiceBlob) {
        const fileName = `voices/${conversationId}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("chat-images").upload(fileName, options.voiceBlob);
        if (error) throw new Error("Sprachnachricht konnte nicht hochgeladen werden");
        voiceUrl = fileName;
        voiceDuration = options.voiceDuration || null;
      }

      const messageContent = content.trim() || 
        (imageUrl ? `${getFileEmoji(getFileType(imageUrl))} ${getFileType(imageUrl) === "image" ? "Bild" : getFileType(imageUrl) === "video" ? "Video" : "Dokument"}` : "") ||
        (voiceUrl ? "🎙️ Sprachnachricht" : "");

      // Optimistic UI
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        image_url: imageUrl,
        voice_url: voiceUrl,
        voice_duration_seconds: voiceDuration,
        deleted_at: null,
        deleted_for_all: false,
        reply_to_id: replyTo?.id || null,
        reply_to_content: replyTo?.content || null,
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setReplyTo(null);

      // Stop typing indicator
      presenceChannelRef.current?.track({ typing: false });

      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          image_url: imageUrl,
          voice_url: voiceUrl,
          voice_duration_seconds: voiceDuration,
          reply_to_id: replyTo?.id || null,
          reply_to_content: replyTo?.content || null,
        })
        .select("id, conversation_id, sender_id, content, is_read, read_at, created_at, image_url, voice_url, voice_duration_seconds, deleted_at, deleted_for_all, reply_to_id, reply_to_content")
        .single();

      if (error) {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
      } else if (data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data as ChatMessage : m));
        
        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        // Send push notification (fire and forget)
        const { data: conv } = await supabase
          .from("conversations")
          .select("provider_id, client_id")
          .eq("id", conversationId)
          .single();
        
        if (conv) {
          const recipientId = conv.provider_id === user.id ? conv.client_id : conv.provider_id;
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
          
          supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: recipientId,
              title: `💬 ${senderProfile?.full_name || "Neue Nachricht"}`,
              body: messageContent.substring(0, 100),
              url: `/chat?startWith=${user.id}`,
            },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, user, replyTo]);

  // ── Delete message ───────────────────────────
  const deleteMessage = useCallback(async (messageId: string, forAll: boolean) => {
    if (!user) return;
    
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    
    // Only allow deleting within 24h
    const msgAge = Date.now() - new Date(msg.created_at).getTime();
    if (forAll && msgAge > 24 * 60 * 60 * 1000) {
      toast({ title: "Zu spät", description: "Nachrichten können nur innerhalb von 24h für alle gelöscht werden.", variant: "destructive" });
      return;
    }

    if (forAll) {
      await supabase
        .from("messages")
        .update({ deleted_for_all: true })
        .eq("id", messageId);
    } else {
      await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", user.id);
    }
    
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, ...(forAll ? { deleted_for_all: true } : { deleted_at: new Date().toISOString() }) }
        : m
    ));
  }, [user, messages]);

  // ── Add reaction ─────────────────────────────
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    
    if (existing) {
      // Remove reaction
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
      
      setReactions(prev => prev.filter(r => !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)));
    } else {
      // Add reaction
      await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji });
      
      setReactions(prev => [...prev, { message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }]);
    }
  }, [user, reactions]);

  // ── Filter visible messages ──────────────────
  const visibleMessages = messages.filter(m => {
    if (m.deleted_for_all) return true; // Show "deleted" placeholder
    if (m.deleted_at && m.sender_id === user?.id) return false; // Hidden for sender who deleted
    return true;
  });

  return {
    messages: visibleMessages,
    reactions,
    isLoading,
    isSending,
    sendMessage,
    deleteMessage,
    markAsRead,
    replyTo,
    setReplyTo,
    addReaction,
    typingUsers,
    sendTyping,
    loadMessages,
  };
}
