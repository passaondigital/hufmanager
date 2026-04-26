import { supabase } from "@/integrations/supabase/client";

export type MemoryType = "pferdeakte" | "pferdebusiness" | "pferdemensch" | "hufi_notizen";

export async function getMemory(
  userId: string,
  memoryType: MemoryType,
  horseId?: string
): Promise<string> {
  const query = supabase
    .from("hufi_memories" as any)
    .select("content")
    .eq("user_id", userId)
    .eq("memory_type", memoryType);

  if (horseId) query.eq("horse_id", horseId);
  else query.is("horse_id", null);

  const { data } = await query.maybeSingle();
  return (data as any)?.content ?? "";
}

export async function updateMemory(
  userId: string,
  memoryType: MemoryType,
  content: string,
  mode: "append" | "replace",
  horseId?: string
): Promise<void> {
  const existing = await getMemory(userId, memoryType, horseId);

  const newContent = mode === "append" && existing
    ? `${existing}\n\n${content}`
    : content;

  const record: Record<string, unknown> = {
    user_id: userId,
    memory_type: memoryType,
    content: newContent,
    last_updated_by: "user",
    updated_at: new Date().toISOString(),
  };
  if (horseId) record.horse_id = horseId;

  await supabase
    .from("hufi_memories" as any)
    .upsert(record, { onConflict: "user_id,memory_type,horse_id" });
}

export async function getMemoryContext(userId: string, horseId?: string): Promise<string> {
  const [business, mensch, pferdeakte] = await Promise.all([
    getMemory(userId, "pferdebusiness"),
    getMemory(userId, "pferdemensch"),
    horseId ? getMemory(userId, "pferdeakte", horseId) : Promise.resolve(""),
  ]);

  const sections: string[] = [];
  if (pferdeakte) sections.push(`## Pferdeakte\n${pferdeakte}`);
  if (business) sections.push(`## Business\n${business}`);
  if (mensch) sections.push(`## Pferdemensch\n${mensch}`);
  return sections.join("\n\n");
}

export async function exportAllMemories(
  userId: string
): Promise<{ filename: string; content: string }[]> {
  const { data } = await supabase
    .from("hufi_memories" as any)
    .select("*")
    .eq("user_id", userId);

  if (!data) return [];

  return (data as any[]).map((row) => ({
    filename: `hufi-${row.memory_type}${row.horse_id ? `-${row.horse_id}` : ""}.md`,
    content: row.content,
  }));
}

export async function deleteAllMemories(userId: string): Promise<void> {
  await supabase
    .from("hufi_memories" as any)
    .delete()
    .eq("user_id", userId);
}

export async function transferHorseMemory(
  horseId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const { data } = await supabase
    .from("hufi_memories" as any)
    .select("*")
    .eq("horse_id", horseId)
    .eq("user_id", fromUserId);

  if (!data?.length) return;

  for (const row of data as any[]) {
    await supabase.from("hufi_memories" as any).upsert({
      user_id: toUserId,
      horse_id: horseId,
      memory_type: row.memory_type,
      content: row.content,
      last_updated_by: "system",
      updated_at: new Date().toISOString(),
    });
  }

  await supabase
    .from("hufi_memories" as any)
    .delete()
    .eq("horse_id", horseId)
    .eq("user_id", fromUserId)
    .eq("memory_type", "pferdeakte");
}

export async function initializeMemoriesForUser(userId: string, horses: { id: string; name: string }[] = []): Promise<void> {
  const { data: existing } = await supabase
    .from("hufi_memories" as any)
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if ((existing as any[])?.length) return;

  const records: Record<string, unknown>[] = [
    { user_id: userId, memory_type: "pferdebusiness", content: "# Mein Hufi Business\n\n_Hufi lernt deinen Betrieb kennen..._", last_updated_by: "system" },
    { user_id: userId, memory_type: "pferdemensch", content: "# Mein Pferdemensch-Profil\n\n_Hufi lernt dich kennen..._", last_updated_by: "system" },
    ...horses.map((h) => ({
      user_id: userId,
      horse_id: h.id,
      memory_type: "pferdeakte",
      content: `# Pferdeakte: ${h.name}\n\n_Hufi dokumentiert..._`,
      last_updated_by: "system",
    })),
  ];

  await supabase.from("hufi_memories" as any).insert(records);
}
