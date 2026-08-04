import { del, entries, get, set } from "idb-keyval";

const AUDIO_DRAFT_PREFIX = "hufi-audio-draft:";
export interface OfflineAudioDraft { id: string; blob: Blob; mimeType: string; createdAt: string; correlationId?: string; }

/** Durable local capture store. Upload/transcription/retries remain intentionally out of scope. */
export async function saveOfflineAudioDraft(blob: Blob, options: { correlationId?: string; now?: Date } = {}): Promise<OfflineAudioDraft> {
  const id = crypto.randomUUID();
  const draft: OfflineAudioDraft = { id, blob, mimeType: blob.type || "audio/webm", createdAt: (options.now ?? new Date()).toISOString(), correlationId: options.correlationId };
  await set(`${AUDIO_DRAFT_PREFIX}${id}`, draft);
  return draft;
}
export async function getOfflineAudioDraft(id: string): Promise<OfflineAudioDraft | undefined> { return get<OfflineAudioDraft>(`${AUDIO_DRAFT_PREFIX}${id}`); }
export async function listOfflineAudioDrafts(): Promise<OfflineAudioDraft[]> {
  const stored = await entries<string, OfflineAudioDraft>();
  return stored.filter(([key, value]) => key.startsWith(AUDIO_DRAFT_PREFIX) && Boolean(value)).map(([, value]) => value).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function removeOfflineAudioDraft(id: string): Promise<void> { await del(`${AUDIO_DRAFT_PREFIX}${id}`); }
