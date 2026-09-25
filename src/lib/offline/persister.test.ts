import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => { store.set(k, v); }),
  del: vi.fn(async (k: string) => { store.delete(k); }),
}));

import { createIDBPersister } from "@/lib/offline/persister";
import { getCacheOwner, setCacheOwner } from "@/lib/offline/cacheOwner";

class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

const TOKEN_KEY = "sb-vnschgjxkzzwzefqlrji-auth-token";
const client = (tag: string) => ({ timestamp: 1, buster: "v3", clientState: { queries: [{ queryKey: ["horses-with-price-group"], state: { data: [tag] } }], mutations: [] } }) as never;
let session: MemoryStorage;

function loginAs(uid: string | null) {
  session.clear();
  if (uid) session.setItem(TOKEN_KEY, JSON.stringify({ access_token: "x", user: { id: uid } }));
}

beforeEach(() => {
  store.clear();
  session = new MemoryStorage();
  vi.stubGlobal("window", { sessionStorage: session, localStorage: new MemoryStorage() });
  setCacheOwner(null);
});

describe("owner-bound query cache persister", () => {
  it("restores the cache for the same user (reload keeps working)", async () => {
    const p = createIDBPersister();
    loginAs("user-a");
    await p.persistClient(client("A-horse"));
    expect(await p.restoreClient()).toEqual(client("A-horse"));
    expect(getCacheOwner()).toBe("user-a");
  });

  it("never restores user A's cache for user B and deletes it", async () => {
    const p = createIDBPersister();
    loginAs("user-a");
    await p.persistClient(client("A-horse"));
    loginAs("user-b");
    expect(await p.restoreClient()).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("does not restore without a session (fresh app entry clears tokens)", async () => {
    const p = createIDBPersister();
    loginAs("user-a");
    await p.persistClient(client("A-horse"));
    loginAs(null);
    expect(await p.restoreClient()).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("does not persist anything without a session", async () => {
    const p = createIDBPersister();
    loginAs(null);
    await p.persistClient(client("anon"));
    expect(store.size).toBe(0);
  });

  it("discards legacy caches without owner marker", async () => {
    const p = createIDBPersister();
    store.set("hufmanager-query-cache", client("legacy"));
    loginAs("user-a");
    expect(await p.restoreClient()).toBeUndefined();
    expect(store.size).toBe(0);
  });
});
