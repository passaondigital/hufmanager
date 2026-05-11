// ── HufAI Media Pipeline — Phase F-1 ─────────────────────────────────────────
// Manages horse photo/video/audio upload to Supabase Storage and the
// horse_media table. No AI analysis happens here.
// Phase F-2 will attach AI analysis to this media.

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BUCKET = "horse-media";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HorseMediaType = "photo" | "video" | "audio";

export interface HorseMediaRecord {
  id: string;
  horse_id: string;
  owner_id: string;
  type: HorseMediaType;
  bucket_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  captured_at: string;
  captured_by: string | null;
  notes: string | null;
  tags: string[];
  // Phase F-2 will attach AI analysis to this media.
  ai_status: "pending" | "processing" | "done" | "skipped";
  created_at: string;
}

export interface UploadHorseMediaArgs {
  horseId: string;
  ownerId: string;
  blob: Blob;
  type: HorseMediaType;
  fileName?: string;
  notes?: string;
  tags?: string[];
}

export interface UploadHorseMediaResult {
  record: HorseMediaRecord | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg":    "jpg",
    "image/png":     "png",
    "image/webp":    "webp",
    "image/heic":    "heic",
    "video/mp4":     "mp4",
    "video/webm":    "webm",
    "video/quicktime": "mov",
    "audio/webm":    "webm",
    "audio/ogg":     "ogg",
    "audio/mp4":     "m4a",
  };
  return map[mime] ?? "bin";
}

function buildBucketPath(ownerId: string, horseId: string, mime: string): string {
  const now = new Date();
  const yyyy = format(now, "yyyy");
  const mm   = format(now, "MM");
  const uuid = crypto.randomUUID();
  const ext  = extFromMime(mime);
  return `${ownerId}/${horseId}/${yyyy}/${mm}/${uuid}.${ext}`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadHorseMedia(
  args: UploadHorseMediaArgs,
): Promise<UploadHorseMediaResult> {
  const { horseId, ownerId, blob, type, fileName, notes, tags } = args;

  const mime = blob.type || (type === "photo" ? "image/jpeg" : "video/webm");
  const bucketPath = buildBucketPath(ownerId, horseId, mime);

  // 1. Upload blob to storage
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(bucketPath, blob, { contentType: mime, upsert: false });

  if (storageErr) {
    return { record: null, error: `Upload fehlgeschlagen: ${storageErr.message}` };
  }

  // 2. Insert metadata row
  const { data, error: dbErr } = await supabase
    .from("horse_media")
    .insert({
      horse_id:    horseId,
      owner_id:    ownerId,
      type,
      bucket_path: bucketPath,
      file_name:   fileName ?? null,
      mime_type:   mime,
      size_bytes:  blob.size,
      captured_at: new Date().toISOString(),
      captured_by: ownerId,
      notes:       notes ?? null,
      tags:        tags ?? [],
      // Phase F-2 will attach AI analysis to this media.
      ai_status:   "pending",
    })
    .select()
    .single();

  if (dbErr) {
    // Best-effort: clean up orphaned storage object
    await supabase.storage.from(BUCKET).remove([bucketPath]);
    return { record: null, error: `Datensatz konnte nicht gespeichert werden: ${dbErr.message}` };
  }

  return { record: data as HorseMediaRecord, error: null };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listHorseMedia(
  horseId: string,
  limit = 20,
): Promise<HorseMediaRecord[]> {
  const { data, error } = await supabase
    .from("horse_media")
    .select("*")
    .eq("horse_id", horseId)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[hufai-media] listHorseMedia error:", error.message);
    return [];
  }
  return (data ?? []) as HorseMediaRecord[];
}

// ── Signed URL ────────────────────────────────────────────────────────────────

export async function getSignedHorseMediaUrl(
  bucketPath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(bucketPath, expiresIn);

  if (error) {
    console.warn("[hufai-media] getSignedHorseMediaUrl error:", error.message);
    return null;
  }
  return data.signedUrl;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteHorseMedia(
  mediaId: string,
  bucketPath: string,
): Promise<{ error: string | null }> {
  // 1. Delete storage object first
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .remove([bucketPath]);

  if (storageErr) {
    return { error: `Datei konnte nicht gelöscht werden: ${storageErr.message}` };
  }

  // 2. Delete DB row
  const { error: dbErr } = await supabase
    .from("horse_media")
    .delete()
    .eq("id", mediaId);

  if (dbErr) {
    return { error: `Datensatz konnte nicht gelöscht werden: ${dbErr.message}` };
  }

  return { error: null };
}
