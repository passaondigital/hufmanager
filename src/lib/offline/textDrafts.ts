const TEXT_DRAFT_PREFIX = "hufi-text-draft:";
const MAX_TEXT_DRAFT_LENGTH = 20_000;

export interface TextDraft { text: string; updatedAt: string; }
export interface TextDraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }

function getBrowserStorage(): TextDraftStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
function requireScope(scope: string): string {
  const normalized = scope.trim();
  if (!normalized) throw new Error("A draft scope is required");
  return normalized;
}
export function getTextDraftKey(scope: string): string { return `${TEXT_DRAFT_PREFIX}${requireScope(scope)}`; }
export function readTextDraft(scope: string, storage = getBrowserStorage()): TextDraft | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(getTextDraftKey(scope));
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof (parsed as TextDraft).text !== "string" || typeof (parsed as TextDraft).updatedAt !== "string") return undefined;
    return parsed as TextDraft;
  } catch { return undefined; }
}
/** Returns false when browser storage is unavailable or rejects the write. */
export function saveTextDraft(scope: string, text: string, storage = getBrowserStorage(), now = new Date()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(getTextDraftKey(scope), JSON.stringify({ text: text.slice(0, MAX_TEXT_DRAFT_LENGTH), updatedAt: now.toISOString() }));
    return true;
  } catch { return false; }
}
export function clearTextDraft(scope: string, storage = getBrowserStorage()): boolean {
  if (!storage) return false;
  try { storage.removeItem(getTextDraftKey(scope)); return true; } catch { return false; }
}
export { MAX_TEXT_DRAFT_LENGTH };
