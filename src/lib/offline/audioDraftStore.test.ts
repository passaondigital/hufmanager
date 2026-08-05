import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => { store.set(key, value); return Promise.resolve(); }),
  del: vi.fn((key: string) => { store.delete(key); return Promise.resolve(); }),
  entries: vi.fn(() => Promise.resolve(Array.from(store.entries()))),
}));

import { getOfflineAudioDraft, listOfflineAudioDrafts, removeOfflineAudioDraft, saveOfflineAudioDraft } from "./audioDraftStore";

const scopeA = { userId: "user-aaaa-1111" };
const scopeB = { userId: "user-bbbb-2222" };
const blob = () => new Blob(["audio-bytes"], { type: "audio/webm" });

beforeEach(() => { store.clear(); });

describe("audioDraftStore scope isolation", () => {
  it("saves, reads, lists and removes a draft within a single scope", async () => {
    const draft = await saveOfflineAudioDraft(scopeA, blob());
    expect(await getOfflineAudioDraft(scopeA, draft.id)).toEqual(draft);
    expect(await listOfflineAudioDrafts(scopeA)).toEqual([draft]);
    await removeOfflineAudioDraft(scopeA, draft.id);
    expect(await getOfflineAudioDraft(scopeA, draft.id)).toBeUndefined();
    expect(await listOfflineAudioDrafts(scopeA)).toEqual([]);
  });

  it("user A's list never includes user B's draft, and vice versa", async () => {
    const draftA = await saveOfflineAudioDraft(scopeA, blob());
    const draftB = await saveOfflineAudioDraft(scopeB, blob());
    expect(await listOfflineAudioDrafts(scopeA)).toEqual([draftA]);
    expect(await listOfflineAudioDrafts(scopeB)).toEqual([draftB]);
  });

  it("user A cannot read user B's draft by id", async () => {
    const draftB = await saveOfflineAudioDraft(scopeB, blob());
    expect(await getOfflineAudioDraft(scopeA, draftB.id)).toBeUndefined();
  });

  it("user A cannot remove user B's draft", async () => {
    const draftB = await saveOfflineAudioDraft(scopeB, blob());
    await removeOfflineAudioDraft(scopeA, draftB.id);
    expect(await getOfflineAudioDraft(scopeB, draftB.id)).toEqual(draftB);
  });

  it("rejects an empty or whitespace-only scope on every operation", async () => {
    const badScope = { userId: "   " };
    await expect(saveOfflineAudioDraft(badScope, blob())).rejects.toThrow();
    await expect(getOfflineAudioDraft(badScope, "any-id")).rejects.toThrow();
    await expect(listOfflineAudioDrafts(badScope)).rejects.toThrow();
    await expect(removeOfflineAudioDraft(badScope, "any-id")).rejects.toThrow();
  });

  it("never returns a legacy unscoped key through the new scoped API", async () => {
    store.set("hufi-audio-draft:legacy-uuid-without-scope", { id: "legacy-uuid-without-scope", blob: blob(), mimeType: "audio/webm", createdAt: new Date().toISOString() });
    expect(await listOfflineAudioDrafts(scopeA)).toEqual([]);
    expect(await listOfflineAudioDrafts(scopeB)).toEqual([]);
  });
});
