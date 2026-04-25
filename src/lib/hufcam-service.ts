import { supabase } from "@/integrations/supabase/client";

export type HufPosition = "LV" | "LH" | "RV" | "RH" | "sole" | "frog";

export interface HufCamAnalysis {
  description: string;
  crack_analysis: string;
  crack_detected: boolean;
  tags: string[];
  alert: boolean;
  compare_summary: string | null;
  position: string;
  model: string;
}

export interface HufCamRecord {
  image_id: string;
  analysis: HufCamAnalysis;
  storage_path: string;
}

// Upload image to Supabase Storage
export async function uploadHufImage(
  file: File,
  userId: string,
  horseId: string,
  position: HufPosition
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${horseId}/${position}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("hufcam-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

// Get public URL for a stored image
export function getHufImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from("hufcam-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

// Fetch previous image for same horse + position
export async function getPreviousImage(
  horseId: string,
  position: HufPosition,
  beforeImageId?: string
): Promise<{ id: string; storage_path: string } | null> {
  let query = supabase
    .from("hufcam_images")
    .select("id, storage_path")
    .eq("horse_id", horseId)
    .eq("position", position)
    .order("created_at", { ascending: false })
    .limit(1);
  if (beforeImageId) query = query.neq("id", beforeImageId);
  const { data } = await query.maybeSingle();
  return data ?? null;
}

// Analyze image via HufCam Python service
export async function analyzeHufImage(
  file: File,
  horseId: string,
  position: HufPosition,
  analysisType: "general" | "crack" | "angle" | "frog" | "compare" = "general",
  prevImageB64?: string
): Promise<HufCamAnalysis> {
  const form = new FormData();
  form.append("image", file);
  form.append("horse_id", horseId);
  form.append("position", position);
  form.append("type", analysisType);
  if (prevImageB64) form.append("prev_image_b64", prevImageB64);

  const res = await fetch("/api/hufcam/analyze", { method: "POST", body: form });
  if (!res.ok) throw new Error(`HufCam API error: ${res.status}`);
  return res.json();
}

// Save image record + analysis to DB
export async function saveHufCamRecord(
  userId: string,
  horseId: string,
  position: HufPosition,
  storagePath: string,
  analysis: HufCamAnalysis,
  prevImageId?: string
): Promise<string> {
  const { data: imgData, error: imgErr } = await supabase
    .from("hufcam_images")
    .insert({ user_id: userId, horse_id: horseId, position, storage_path: storagePath })
    .select("id")
    .single();
  if (imgErr) throw imgErr;

  await supabase.from("hufcam_analyses").insert({
    image_id: imgData.id,
    horse_id: horseId,
    user_id: userId,
    model_used: analysis.model,
    analysis_type: "general",
    description: analysis.description,
    crack_analysis: analysis.crack_analysis,
    crack_detected: analysis.crack_detected,
    tags: analysis.tags,
    alert_triggered: analysis.alert,
    compare_summary: analysis.compare_summary,
    prev_image_id: prevImageId ?? null,
  });

  return imgData.id;
}

// Full pipeline: upload → analyze → save → return result
export async function processHufImage(
  file: File,
  userId: string,
  horseId: string,
  position: HufPosition
): Promise<{ imageId: string; analysis: HufCamAnalysis; storagePath: string }> {
  // 1. Upload
  const storagePath = await uploadHufImage(file, userId, horseId, position);

  // 2. Get previous image for comparison
  const prev = await getPreviousImage(horseId, position);

  // 3. Analyze
  const analysis = await analyzeHufImage(file, horseId, position, "general");

  // 4. Save to DB
  const imageId = await saveHufCamRecord(userId, horseId, position, storagePath, analysis, prev?.id);

  return { imageId, analysis, storagePath };
}

// Fetch analysis history for a horse
export async function getHufCamHistory(
  horseId: string,
  position?: HufPosition,
  limit = 10
): Promise<Array<{ image: any; analysis: any }>> {
  let q = supabase
    .from("hufcam_analyses")
    .select("*, image:hufcam_images(id, storage_path, position, created_at)")
    .eq("horse_id", horseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (position) q = q.eq("image.position", position);
  const { data } = await q;
  return data ?? [];
}
