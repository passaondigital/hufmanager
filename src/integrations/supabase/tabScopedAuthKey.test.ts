import { describe, expect, it } from "vitest";
import { AUTH_TAB_ID_KEY, tabScopedAuthStorageKey } from "./tabScopedAuthKey";

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const URL_ = "https://vnschgjxkzzwzefqlrji.supabase.co";

describe("tabScopedAuthStorageKey", () => {
  it("liefert pro Tab einen eigenen Schlüssel im Muster sb-…-auth-token", () => {
    const a = tabScopedAuthStorageKey(new MemStorage(), URL_);
    const b = tabScopedAuthStorageKey(new MemStorage(), URL_);
    expect(a).toMatch(/^sb-vnschgjxkzzwzefqlrji-tab-[a-z0-9]+-auth-token$/);
    expect(a).not.toBe(b); // getrennte Tabs → getrennter Lock/Broadcast
  });
  it("bleibt im selben Tab über Reloads stabil", () => {
    const s = new MemStorage();
    expect(tabScopedAuthStorageKey(s, URL_)).toBe(tabScopedAuthStorageKey(s, URL_));
    expect(s.getItem(AUTH_TAB_ID_KEY)).toBeTruthy();
  });
  it("übernimmt eine bestehende Session vom alten gemeinsamen Schlüssel einmalig", () => {
    const s = new MemStorage();
    s.setItem("sb-vnschgjxkzzwzefqlrji-auth-token", '{"user":{"id":"u1"}}');
    const k = tabScopedAuthStorageKey(s, URL_);
    expect(s.getItem(k)).toBe('{"user":{"id":"u1"}}');
    expect(s.getItem("sb-vnschgjxkzzwzefqlrji-auth-token")).toBeNull();
  });
  it("überschreibt eine vorhandene Tab-Session nicht mit dem alten Schlüssel", () => {
    const s = new MemStorage();
    const k = tabScopedAuthStorageKey(s, URL_);
    s.setItem(k, '{"user":{"id":"neu"}}');
    s.setItem("sb-vnschgjxkzzwzefqlrji-auth-token", '{"user":{"id":"alt"}}');
    tabScopedAuthStorageKey(s, URL_);
    expect(s.getItem(k)).toBe('{"user":{"id":"neu"}}');
  });
});
