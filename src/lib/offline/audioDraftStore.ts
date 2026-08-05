import { del, entries, get, set } from "idb-keyval";

const AUDIO_DRAFT_PREFIX = "hufi-audio-draft:";

export interface OfflineAudioDraft { id: string; blob: Blob; mimeType: string; createdAt: string; correlationId?: string; }

/** Caller-supplied tenant binding: at minimum a technical user id; org id only if the auth model reliably provides one. */
export interface AudioDraftScope { userId: string; orgId?: string }

function requireScope(scope: AudioDraftScope): { userId: string; orgId?: string } {
  const userId = scope?.userId?.trim();
  if (!userId) throw new Error("An audio draft scope requires a non-empty userId");
  const orgId = scope.orgId?.trim();
  if (scope.orgId !== undefined && !orgId) throw new Error("orgId, if provided, must be non-empty");
  return { userId, orgId };
}

/** Opaque, non-reversible key segment -- never store raw user/org identifiers in the IndexedDB key itself. */
async function hashScope(scope: AudioDraftScope): Promise<string> {
  const { userId, orgId } = requireScope(scope);
  const bytes = new TextEncoder().encode(`${userId}|${orgId ?? ""}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function scopedPrefix(scope: AudioDraftScope): Promise<string> {
  return `${AUDIO_DRAFT_PREFIX}${await hashScope(scope)}:`;
}

/** Durable local capture store, isolated per scope. Upload/transcription/retries remain intentionally out of scope. */
export async function saveOfflineAudioDraft(scope: AudioDraftScope, blob: Blob, options: { correlationId?: string; now?: Date } = {}): Promise<OfflineAudioDraft> {
  const id = crypto.randomUUID();
  const draft: OfflineAudioDraft = { id, blob, mimeType: blob.type || "audio/webm", createdAt: (options.now ?? new Date()).toISOString(), correlationId: options.correlationId };
  await set(`${await scopedPrefix(scope)}${id}`, draft);
  return draft;
}

export async function getOfflineAudioDraft(scope: AudioDraftScope, id: string): Promise<OfflineAudioDraft | undefined> {
  return get<OfflineAudioDraft>(`${await scopedPrefix(scope)}${id}`);
}

export async function listOfflineAudioDrafts(scope: AudioDraftScope): Promise<OfflineAudioDraft[]> {
  const prefix = await scopedPrefix(scope);
  const stored = await entries<string, OfflineAudioDraft>();
  return stored.filter(([key, value]) => key.startsWith(prefix) && Boolean(value)).map(([, value]) => value).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** No-ops (rather than throws) when `id` belongs to a different scope -- the scoped key simply never matches. */
export async function removeOfflineAudioDraft(scope: AudioDraftScope, id: string): Promise<void> {
  await del(`${await scopedPrefix(scope)}${id}`);
}
