import { supabase } from "@/integrations/supabase/client";

export type ConversationStatus = "active" | "archived" | "deleted";

export interface HufiConversation {
  id: string;
  user_id: string;
  title: string;
  summary?: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface HufiConvMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function generateConversationTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.replace(/[^\w\säöüÄÖÜß.,!?-]/g, "").trim();
  return cleaned.length > 48 ? cleaned.slice(0, 48) + "…" : cleaned || "Gespräch";
}

export async function createConversation(
  userId: string,
  firstMessage?: string
): Promise<HufiConversation | null> {
  const title = firstMessage ? generateConversationTitle(firstMessage) : "Neues Gespräch";
  const { data, error } = await supabase
    .from("hufi_conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) { console.error("[hufi-conv] create:", error); return null; }
  return data as HufiConversation;
}

export async function addConvMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<HufiConvMessage | null> {
  const { data, error } = await supabase
    .from("hufi_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role, content, metadata })
    .select()
    .single();
  if (error) { console.error("[hufi-conv] addMsg:", error); return null; }
  // Conversation updated_at aktualisieren
  await supabase
    .from("hufi_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);
  return data as HufiConvMessage;
}

export async function listConversations(
  userId: string,
  limit = 20
): Promise<HufiConversation[]> {
  const { data, error } = await supabase
    .from("hufi_conversations")
    .select()
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("[hufi-conv] list:", error); return []; }
  return (data ?? []) as HufiConversation[];
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  limit = 20
): Promise<HufiConvMessage[]> {
  const { data, error } = await supabase
    .from("hufi_messages")
    .select()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) { console.error("[hufi-conv] getMessages:", error); return []; }
  return (data ?? []) as HufiConvMessage[];
}

export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("hufi_conversations")
    .update({ status: "archived" })
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("hufi_conversations")
    .update({ status: "deleted" })
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export async function getLastActiveConversation(
  userId: string
): Promise<HufiConversation | null> {
  const { data } = await supabase
    .from("hufi_conversations")
    .select()
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as HufiConversation | null;
}
