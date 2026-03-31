import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  recipient_type: string;
  subject: string;
  body: string;
  message_type: string;
  priority: string;
  status: string;
  requires_action: boolean;
  action_options: string[] | null;
  action_taken: string | null;
  action_taken_at: string | null;
  attachments: any;
  template_id: string | null;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface AdminMessageReply {
  id: string;
  message_id: string;
  sender_id: string;
  sender_type: string;
  body: string;
  attachments: any;
  created_at: string;
}

// ─── User-side hooks ───────────────────────────────────

export function useUnreadAdminMessages() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-messages-unread", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await (supabase as any)
        .from("admin_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .or("read_at.is.null,and(requires_action.eq.true,action_taken.is.null)");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("admin-messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages", filter: `recipient_id=eq.${user.id}` }, () => query.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return query;
}

export function usePendingAdminMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-messages-pending", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AdminMessage[];
      const { data, error } = await (supabase as any)
        .from("admin_messages")
        .select("*")
        .eq("recipient_id", user.id)
        .or("read_at.is.null,and(requires_action.eq.true,action_taken.is.null)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as AdminMessage[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

export function useAdminMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-messages-all", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AdminMessage[];
      const { data, error } = await (supabase as any)
        .from("admin_messages")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdminMessage[];
    },
    enabled: !!user?.id,
    staleTime: 15000,
  });
}

export function useAdminMessageDetail(messageId: string | null) {
  const { user } = useAuth();
  const messageQuery = useQuery({
    queryKey: ["admin-message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const { data, error } = await (supabase as any).from("admin_messages").select("*").eq("id", messageId).single();
      if (error) throw error;
      return data as AdminMessage;
    },
    enabled: !!messageId && !!user?.id,
  });

  const repliesQuery = useQuery({
    queryKey: ["admin-message-replies", messageId],
    queryFn: async () => {
      if (!messageId) return [] as AdminMessageReply[];
      const { data, error } = await (supabase as any).from("admin_message_replies").select("*").eq("message_id", messageId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminMessageReply[];
    },
    enabled: !!messageId && !!user?.id,
  });

  return { message: messageQuery.data, replies: repliesQuery.data || [], isLoading: messageQuery.isLoading };
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await (supabase as any)
        .from("admin_messages")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", messageId)
        .eq("recipient_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-unread"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-all"] });
    },
  });
}

export function useMessageAction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ messageId, action }: { messageId: string; action: string }) => {
      const updates: any = {
        action_taken: action,
        action_taken_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      };
      if (action === "Annehmen") updates.status = "accepted";
      else if (action === "Ablehnen") updates.status = "declined";
      const { error } = await (supabase as any).from("admin_messages").update(updates).eq("id", messageId).eq("recipient_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-messages"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-unread"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-messages-all"] });
      qc.invalidateQueries({ queryKey: ["admin-message"] });
    },
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ messageId, body, senderType = "user", attachments }: { messageId: string; body: string; senderType?: string; attachments?: any[] }) => {
      const { error } = await (supabase as any).from("admin_message_replies").insert({
        message_id: messageId,
        sender_id: user?.id,
        sender_type: senderType,
        body,
        attachments: attachments?.length ? attachments : null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-message-replies", vars.messageId] });
      qc.invalidateQueries({ queryKey: ["admin-messages-all-admin"] });
    },
  });
}

// ─── Admin-side hooks ───────────────────────────────────

export function useAdminAllMessages(filter?: string) {
  return useQuery({
    queryKey: ["admin-messages-all-admin", filter],
    queryFn: async () => {
      let q = (supabase as any).from("admin_messages").select("*").order("created_at", { ascending: false });
      if (filter === "unread") q = q.is("read_at", null);
      else if (filter === "waiting") q = q.not("read_at", "is", null).eq("status", "read");
      else if (filter === "offers") q = q.eq("message_type", "offer");
      else if (filter === "expired") q = q.not("expires_at", "is", null).lt("expires_at", new Date().toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AdminMessage[];
    },
    staleTime: 10000,
  });
}

export function useAdminMessageThread(messageId: string | null) {
  const messageQuery = useQuery({
    queryKey: ["admin-message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const { data, error } = await (supabase as any).from("admin_messages").select("*").eq("id", messageId).single();
      if (error) throw error;
      return data as AdminMessage;
    },
    enabled: !!messageId,
  });

  const repliesQuery = useQuery({
    queryKey: ["admin-message-replies", messageId],
    queryFn: async () => {
      if (!messageId) return [] as AdminMessageReply[];
      const { data, error } = await (supabase as any).from("admin_message_replies").select("*").eq("message_id", messageId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminMessageReply[];
    },
    enabled: !!messageId,
  });

  // Realtime for replies
  useEffect(() => {
    if (!messageId) return;
    const channel = supabase
      .channel(`admin-thread-${messageId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_message_replies", filter: `message_id=eq.${messageId}` }, () => repliesQuery.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [messageId]);

  return { message: messageQuery.data, replies: repliesQuery.data || [], isLoading: messageQuery.isLoading };
}

export function useAdminSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (msg: {
      recipient_id: string;
      recipient_type?: string;
      subject: string;
      body: string;
      message_type?: string;
      priority?: string;
      requires_action?: boolean;
      action_options?: string[];
      attachments?: any[];
      expires_at?: string;
    }) => {
      const { error } = await (supabase as any).from("admin_messages").insert({
        sender_id: user?.id,
        recipient_id: msg.recipient_id,
        recipient_type: msg.recipient_type || "provider",
        subject: msg.subject,
        body: msg.body,
        message_type: msg.message_type || "info",
        priority: msg.priority || "normal",
        requires_action: msg.requires_action || false,
        action_options: msg.action_options?.length ? msg.action_options : null,
        attachments: msg.attachments?.length ? msg.attachments : null,
        expires_at: msg.expires_at || null,
        status: "sent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-messages-all-admin"] });
    },
  });
}

// ─── File upload helper ───────────────────────────────────

export async function uploadMessageAttachment(
  file: File,
  recipientId: string,
  messageId?: string
): Promise<{ name: string; url: string; type: string; size: number } | null> {
  const ext = file.name.split(".").pop();
  const path = `${recipientId}/${messageId || "new"}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("admin-messages-attachments").upload(path, file);
  if (error) {
    console.error("Upload error:", error);
    return null;
  }
  const { data } = supabase.storage.from("admin-messages-attachments").getPublicUrl(path);
  // Since bucket is private, we use signed URLs
  const { data: signedData } = await supabase.storage.from("admin-messages-attachments").createSignedUrl(path, 3600 * 24 * 7); // 7 days
  return {
    name: file.name,
    url: signedData?.signedUrl || data.publicUrl,
    type: file.type,
    size: file.size,
  };
}

// ─── Profile search for compose ───────────────────────────────────

export function useProfileSearch(query: string) {
  return useQuery({
    queryKey: ["admin-profile-search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, readable_id, role")
        .is("deleted_at", null)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,readable_id.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
    staleTime: 5000,
  });
}
