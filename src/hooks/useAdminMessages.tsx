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

/** Count of unread or action-pending admin messages */
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

  // Real-time
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("admin-messages-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "admin_messages",
        filter: `recipient_id=eq.${user.id}`,
      }, () => query.refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return query;
}

/** Pending messages that need popup display */
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

/** All admin messages for the user */
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

/** Single message with replies */
export function useAdminMessageDetail(messageId: string | null) {
  const { user } = useAuth();

  const messageQuery = useQuery({
    queryKey: ["admin-message", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const { data, error } = await (supabase as any)
        .from("admin_messages")
        .select("*")
        .eq("id", messageId)
        .single();
      if (error) throw error;
      return data as AdminMessage;
    },
    enabled: !!messageId && !!user?.id,
  });

  const repliesQuery = useQuery({
    queryKey: ["admin-message-replies", messageId],
    queryFn: async () => {
      if (!messageId) return [] as AdminMessageReply[];
      const { data, error } = await (supabase as any)
        .from("admin_message_replies")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminMessageReply[];
    },
    enabled: !!messageId && !!user?.id,
  });

  return { message: messageQuery.data, replies: repliesQuery.data || [], isLoading: messageQuery.isLoading };
}

/** Mark message as read */
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

/** Take action on a message */
export function useMessageAction() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, action }: { messageId: string; action: string }) => {
      const updates: any = {
        action_taken: action,
        action_taken_at: new Date().toISOString(),
      };
      if (action === "Annehmen") updates.status = "accepted";
      else if (action === "Ablehnen") updates.status = "declined";
      // "Später" keeps current status

      if (!updates.status || updates.status === "accepted" || updates.status === "declined") {
        // Also mark read
        updates.read_at = updates.read_at || new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("admin_messages")
        .update(updates)
        .eq("id", messageId)
        .eq("recipient_id", user?.id);
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

/** Send reply */
export function useSendReply() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, body }: { messageId: string; body: string }) => {
      const { error } = await (supabase as any)
        .from("admin_message_replies")
        .insert({
          message_id: messageId,
          sender_id: user?.id,
          sender_type: "user",
          body,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-message-replies", vars.messageId] });
    },
  });
}
